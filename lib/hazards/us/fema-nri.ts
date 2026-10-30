import { DEFAULT_HAZARD_PROVIDER_TIMEOUT_MS } from "@/lib/hazards/config";
import { nriOutFields, parseNriAttributes } from "@/lib/hazards/nri";
import type { HazardProvider, HazardRatingsResult, NriAttributes } from "@/lib/hazards/types";
import type { LocalMessage } from "@/lib/i18n";
import type { RegionRef } from "@/lib/location/types";

/** Public ArcGIS query for FEMA National Risk Index counties. No API key. */
export const FEMA_NRI_COUNTIES_QUERY =
  "https://services.arcgis.com/XG15cJAlne2vxtgt/arcgis/rest/services/National_Risk_Index_Counties/FeatureServer/0/query";

export const FEMA_NRI_PROVIDER_ID = "fema_nri";

export type FemaNriUnavailableReason =
  "timeout" | "network" | "http" | "invalid_response" | "invalid_region";

export type FemaNriRatingsResult =
  | Extract<HazardRatingsResult, { status: "ok" | "not_found" }>
  | { status: "unavailable"; reason: FemaNriUnavailableReason; message: LocalMessage };

type ArcGisQuery = {
  features?: Array<{ attributes?: NriAttributes } | null>;
  error?: { message?: string };
};

const REASON_MESSAGE: Record<FemaNriUnavailableReason, LocalMessage> = {
  timeout: { key: "engine.hazard.nri_timeout" },
  network: { key: "engine.hazard.nri_network" },
  http: { key: "engine.hazard.nri_http" },
  invalid_response: { key: "engine.hazard.nri_invalid_response" },
  invalid_region: { key: "engine.hazard.nri_invalid_region" },
};

class FemaNriRequestError extends Error {
  readonly reason: "timeout" | "network";

  constructor(reason: "timeout" | "network") {
    super(reason);
    this.name = "FemaNriRequestError";
    this.reason = reason;
  }
}

function unavailable(reason: FemaNriUnavailableReason): FemaNriRatingsResult {
  return { status: "unavailable", reason, message: REASON_MESSAGE[reason] };
}

function fetchWithTimeout(
  fetchImpl: typeof fetch,
  url: string,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      controller.abort();
      reject(new FemaNriRequestError("timeout"));
    }, timeoutMs);
    fetchImpl(url, { signal: controller.signal }).then(
      (response) => {
        clearTimeout(timer);
        resolve(response);
      },
      () => {
        clearTimeout(timer);
        if (controller.signal.aborted) {
          reject(new FemaNriRequestError("timeout"));
          return;
        }
        reject(new FemaNriRequestError("network"));
      },
    );
  });
}

function readQuery(value: unknown): ArcGisQuery | null {
  if (!value || typeof value !== "object") return null;
  return value as ArcGisQuery;
}

export function createFemaNriHazardProvider(options?: {
  fetchImpl?: typeof fetch;
  endpoint?: string;
  timeoutMs?: number;
}): HazardProvider {
  const fetchImpl = options?.fetchImpl ?? fetch;
  const endpoint = options?.endpoint ?? FEMA_NRI_COUNTIES_QUERY;
  const timeoutMs =
    typeof options?.timeoutMs === "number" &&
    Number.isFinite(options.timeoutMs) &&
    options.timeoutMs > 0
      ? options.timeoutMs
      : DEFAULT_HAZARD_PROVIDER_TIMEOUT_MS;

  return {
    country: "US",
    id: FEMA_NRI_PROVIDER_ID,
    async ratingsForRegion(region: RegionRef): Promise<FemaNriRatingsResult> {
      if (region.country !== "US" || !/^\d{5}$/.test(region.id)) {
        return unavailable("invalid_region");
      }
      const params = new URLSearchParams({
        where: `STCOFIPS='${region.id}'`,
        outFields: nriOutFields().join(","),
        returnGeometry: "false",
        f: "json",
      });
      try {
        const response = await fetchWithTimeout(
          fetchImpl,
          `${endpoint}?${params.toString()}`,
          timeoutMs,
        );
        if (!response.ok) return unavailable("http");
        let payload: unknown;
        try {
          payload = await response.json();
        } catch {
          return unavailable("invalid_response");
        }
        const body = readQuery(payload);
        if (!body || body.error || !Array.isArray(body.features)) {
          return unavailable("invalid_response");
        }
        const attributes = body.features[0]?.attributes;
        if (!attributes) return { status: "not_found" };
        const parsed = parseNriAttributes(attributes);
        return {
          status: "ok",
          provenance: "live",
          providerId: FEMA_NRI_PROVIDER_ID,
          composite: parsed.composite,
          hazards: parsed.hazards,
          disclaimer: { key: "engine.hazard.live_sources" },
        };
      } catch (error) {
        if (error instanceof FemaNriRequestError) return unavailable(error.reason);
        return unavailable("network");
      }
    },
  };
}
