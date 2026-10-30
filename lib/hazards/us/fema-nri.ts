import { DEFAULT_HAZARD_PROVIDER_TIMEOUT_MS, DEFAULT_NRI_CACHE_TTL_MS } from "@/lib/hazards/config";
import { nriOutFields, parseNriAttributes } from "@/lib/hazards/nri";
import type { HazardProvider, HazardRatingsResult, NriAttributes } from "@/lib/hazards/types";
import type { LocalMessage } from "@/lib/i18n";
import type { RegionRef } from "@/lib/location/types";

/** Public ArcGIS query for FEMA National Risk Index counties. No API key. */
export const FEMA_NRI_COUNTIES_QUERY =
  "https://services.arcgis.com/XG15cJAlne2vxtgt/arcgis/rest/services/National_Risk_Index_Counties/FeatureServer/0/query";

export const FEMA_NRI_PROVIDER_ID = "fema_nri";

/** Enough room for every US county equivalent, with least-recently-used eviction after that. */
export const FEMA_NRI_CACHE_MAX_ENTRIES = 4096;

export type FemaNriUnavailableReason =
  "timeout" | "network" | "http" | "invalid_response" | "invalid_region";

export type FemaNriRatingsResult =
  | Extract<HazardRatingsResult, { status: "ok" | "not_found" }>
  | { status: "unavailable"; reason: FemaNriUnavailableReason; message: LocalMessage };

type ArcGisQuery = {
  features?: Array<{ attributes?: NriAttributes } | null>;
  error?: { message?: string };
};

type CacheEntry = { expiresAt: number; result: FemaNriRatingsResult };

const REASON_MESSAGE: Record<FemaNriUnavailableReason, LocalMessage> = {
  timeout: { key: "engine.hazard.nri_timeout" },
  network: { key: "engine.hazard.nri_network" },
  http: { key: "engine.hazard.nri_http" },
  invalid_response: { key: "engine.hazard.nri_invalid_response" },
  invalid_region: { key: "engine.hazard.nri_invalid_region" },
};

/** Insertion order is least-recently-used first. */
const nriCache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<FemaNriRatingsResult>>();
let cacheMaxEntries = FEMA_NRI_CACHE_MAX_ENTRIES;

class FemaNriRequestError extends Error {
  readonly reason: "timeout" | "network" | "invalid_json";

  constructor(reason: "timeout" | "network" | "invalid_json") {
    super(reason);
    this.name = "FemaNriRequestError";
    this.reason = reason;
  }
}

export function clearFemaNriCache(): void {
  nriCache.clear();
  inflight.clear();
  cacheMaxEntries = FEMA_NRI_CACHE_MAX_ENTRIES;
}

/** Test hook. Production uses {@link FEMA_NRI_CACHE_MAX_ENTRIES}. */
export function setFemaNriCacheLimit(maxEntries: number): void {
  cacheMaxEntries = maxEntries;
  trimCache();
}

function unavailable(reason: FemaNriUnavailableReason): FemaNriRatingsResult {
  return { status: "unavailable", reason, message: REASON_MESSAGE[reason] };
}

function trimCache(): void {
  while (nriCache.size > cacheMaxEntries) {
    const oldest = nriCache.keys().next().value;
    if (oldest === undefined) return;
    nriCache.delete(oldest);
  }
}

function readCache(key: string, now: number): FemaNriRatingsResult | null {
  const hit = nriCache.get(key);
  if (!hit) return null;
  if (hit.expiresAt <= now) {
    nriCache.delete(key);
    return null;
  }
  nriCache.delete(key);
  nriCache.set(key, hit);
  return hit.result;
}

function writeCache(key: string, result: FemaNriRatingsResult, now: number, ttlMs: number): void {
  if (ttlMs <= 0 || result.status === "unavailable") return;
  nriCache.delete(key);
  nriCache.set(key, { expiresAt: now + ttlMs, result });
  trimCache();
}

function readQuery(value: unknown): ArcGisQuery | null {
  if (!value || typeof value !== "object") return null;
  return value as ArcGisQuery;
}

function textAttr(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

/**
 * One timer covers headers and the body. Aborting the request also fails a
 * stalled body when the stream honors the signal; the race still returns if it does not.
 */
async function readNri(
  fetchImpl: typeof fetch,
  url: string,
  timeoutMs: number,
): Promise<{ response: Response; payload: unknown }> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new FemaNriRequestError("timeout"));
    }, timeoutMs);
  });
  const work = (async () => {
    const response = await fetchImpl(url, { signal: controller.signal });
    if (!response.ok) return { response, payload: null };
    try {
      const payload = await response.json();
      return { response, payload };
    } catch (error) {
      if (controller.signal.aborted) throw new FemaNriRequestError("timeout");
      if (error instanceof FemaNriRequestError) throw error;
      throw new FemaNriRequestError("invalid_json");
    }
  })();
  work.catch(() => {
    // A timeout wins the race while the body read is still pending.
  });
  try {
    return await Promise.race([work, timeout]);
  } catch (error) {
    if (error instanceof FemaNriRequestError) throw error;
    if (controller.signal.aborted) throw new FemaNriRequestError("timeout");
    throw new FemaNriRequestError("network");
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export function createFemaNriHazardProvider(options?: {
  fetchImpl?: typeof fetch;
  endpoint?: string;
  timeoutMs?: number;
  cacheTtlMs?: number;
  now?: () => number;
}): HazardProvider {
  const fetchImpl = options?.fetchImpl ?? fetch;
  const endpoint = options?.endpoint ?? FEMA_NRI_COUNTIES_QUERY;
  const timeoutMs =
    typeof options?.timeoutMs === "number" &&
    Number.isFinite(options.timeoutMs) &&
    options.timeoutMs > 0
      ? options.timeoutMs
      : DEFAULT_HAZARD_PROVIDER_TIMEOUT_MS;
  const cacheTtlMs =
    typeof options?.cacheTtlMs === "number" &&
    Number.isFinite(options.cacheTtlMs) &&
    options.cacheTtlMs >= 0
      ? options.cacheTtlMs
      : DEFAULT_NRI_CACHE_TTL_MS;
  const now = options?.now ?? Date.now;

  return {
    country: "US",
    id: FEMA_NRI_PROVIDER_ID,
    async ratingsForRegion(region: RegionRef): Promise<FemaNriRatingsResult> {
      if (region.country !== "US" || !/^\d{5}$/.test(region.id)) {
        return unavailable("invalid_region");
      }
      const cacheKey = `${endpoint}\n${region.id}`;
      const cached = readCache(cacheKey, now());
      if (cached) return cached;
      const pending = inflight.get(cacheKey);
      if (pending) return pending;

      const promise = thisFetch(region, cacheKey);
      inflight.set(cacheKey, promise);
      promise.finally(() => {
        inflight.delete(cacheKey);
      });
      return promise;
    },
  };

  async function thisFetch(region: RegionRef, cacheKey: string): Promise<FemaNriRatingsResult> {
    const params = new URLSearchParams({
      where: `STCOFIPS='${region.id}'`,
      outFields: nriOutFields().join(","),
      returnGeometry: "false",
      f: "json",
    });
    try {
      const { response, payload } = await readNri(
        fetchImpl,
        `${endpoint}?${params.toString()}`,
        timeoutMs,
      );
      if (!response.ok) return unavailable("http");
      const body = readQuery(payload);
      if (!body || body.error || !Array.isArray(body.features)) {
        return unavailable("invalid_response");
      }
      const attributes = body.features[0]?.attributes;
      if (!attributes) {
        const missing: FemaNriRatingsResult = { status: "not_found" };
        writeCache(cacheKey, missing, now(), cacheTtlMs);
        return missing;
      }
      const parsed = parseNriAttributes(attributes);
      const result: FemaNriRatingsResult = {
        status: "ok",
        provenance: "live",
        providerId: FEMA_NRI_PROVIDER_ID,
        composite: parsed.composite,
        hazards: parsed.hazards,
        disclaimer: { key: "engine.hazard.live_sources" },
        area: {
          county: textAttr(attributes.COUNTY),
          state: textAttr(attributes.STATEABBRV),
        },
      };
      writeCache(cacheKey, result, now(), cacheTtlMs);
      return result;
    } catch (error) {
      if (error instanceof FemaNriRequestError) {
        if (error.reason === "invalid_json") return unavailable("invalid_response");
        return unavailable(error.reason);
      }
      return unavailable("network");
    }
  }
}
