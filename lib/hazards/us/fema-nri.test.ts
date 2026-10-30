import { beforeEach, describe, expect, it } from "vitest";
import { nriOutFields } from "@/lib/hazards/nri";
import {
  FEMA_NRI_COUNTIES_QUERY,
  clearFemaNriCache,
  createFemaNriHazardProvider,
  setFemaNriCacheLimit,
} from "@/lib/hazards/us/fema-nri";
import type { RegionRef } from "@/lib/location/types";

function region(id: string, country = "US"): RegionRef {
  return { country, id, name: "Sample County", kind: "county_or_equivalent" };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("FEMA National Risk Index provider", () => {
  beforeEach(() => {
    clearFemaNriCache();
  });

  it("queries one county and returns live ratings", async () => {
    const fetchImpl: typeof fetch = async (url) => {
      const href = String(url);
      expect(href.startsWith(FEMA_NRI_COUNTIES_QUERY)).toBe(true);
      expect(href).toContain("STCOFIPS%3D%2722071%27");
      expect(href).toContain("returnGeometry=false");
      const outFields = new URL(href).searchParams.get("outFields")?.split(",") ?? [];
      expect(outFields).toEqual([...nriOutFields()]);
      expect(outFields).toContain("IFLD_RISKR");
      expect(outFields).toContain("IFLD_RISKS");
      expect(outFields.some((field) => field.startsWith("RFLD"))).toBe(false);
      return jsonResponse({
        features: [
          {
            attributes: {
              STCOFIPS: "22071",
              RISK_RATNG: "Relatively High",
              RISK_SCORE: 98.2,
              HRCN_RISKR: "Very High",
              HRCN_RISKS: 99.6,
            },
          },
        ],
      });
    };
    const result = await createFemaNriHazardProvider({ fetchImpl }).ratingsForRegion(
      region("22071"),
    );
    expect(result).toMatchObject({
      status: "ok",
      provenance: "live",
      providerId: "fema_nri",
      disclaimer: { key: "engine.hazard.live_sources" },
      composite: { rating: "relatively_high", score: 98.2, raw: "Relatively High" },
    });
    if (result.status !== "ok") return;
    expect(result.hazards).toEqual([
      {
        key: "HRCN",
        name: "Hurricane",
        rating: "very_high",
        raw: "Very High",
        score: 99.6,
      },
    ]);
  });

  it("returns not_found when the county is missing", async () => {
    const fetchImpl: typeof fetch = async () => jsonResponse({ features: [] });
    const result = await createFemaNriHazardProvider({ fetchImpl }).ratingsForRegion(
      region("99999"),
    );
    expect(result).toEqual({ status: "not_found" });
  });

  it("returns a typed HTTP failure without throwing", async () => {
    const fetchImpl: typeof fetch = async () => new Response("nope", { status: 503 });
    const result = await createFemaNriHazardProvider({ fetchImpl }).ratingsForRegion(
      region("22071"),
    );
    expect(result).toEqual({
      status: "unavailable",
      reason: "http",
      message: { key: "engine.hazard.nri_http" },
    });
  });

  it("returns a typed network failure when fetch rejects", async () => {
    const fetchImpl: typeof fetch = async () => {
      throw new TypeError("fetch failed");
    };
    const result = await createFemaNriHazardProvider({ fetchImpl }).ratingsForRegion(
      region("22071"),
    );
    expect(result).toEqual({
      status: "unavailable",
      reason: "network",
      message: { key: "engine.hazard.nri_network" },
    });
  });

  it("returns a typed timeout when the request does not finish", async () => {
    const fetchImpl: typeof fetch = (_input, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          reject(new DOMException("The operation was aborted", "AbortError"));
        });
      });
    const result = await createFemaNriHazardProvider({ fetchImpl, timeoutMs: 20 }).ratingsForRegion(
      region("22071"),
    );
    expect(result).toEqual({
      status: "unavailable",
      reason: "timeout",
      message: { key: "engine.hazard.nri_timeout" },
    });
  });

  it("returns invalid_response for an ArcGIS error payload and for unreadable JSON", async () => {
    const errorPayload: typeof fetch = async () =>
      jsonResponse({ error: { code: 400, message: "Failed to execute query." } });
    const badJson: typeof fetch = async () => new Response("not-json", { status: 200 });
    const providerError = createFemaNriHazardProvider({ fetchImpl: errorPayload });
    const providerJson = createFemaNriHazardProvider({ fetchImpl: badJson });
    expect(await providerError.ratingsForRegion(region("22071"))).toMatchObject({
      status: "unavailable",
      reason: "invalid_response",
    });
    expect(await providerJson.ratingsForRegion(region("22071"))).toMatchObject({
      status: "unavailable",
      reason: "invalid_response",
    });
  });

  it("does not call the network for a region that is not a US county FIPS", async () => {
    let calls = 0;
    const fetchImpl: typeof fetch = async () => {
      calls += 1;
      return jsonResponse({ features: [] });
    };
    const provider = createFemaNriHazardProvider({ fetchImpl });
    expect(await provider.ratingsForRegion(region("22O71"))).toMatchObject({
      status: "unavailable",
      reason: "invalid_region",
    });
    expect(await provider.ratingsForRegion(region("22071", "GB"))).toMatchObject({
      reason: "invalid_region",
    });
    expect(calls).toBe(0);
  });

  it("times out when the response body never finishes", async () => {
    const fetchImpl: typeof fetch = (_url, init) => {
      const stream = new ReadableStream({
        start(controller) {
          const abort = () => controller.error(new DOMException("aborted", "AbortError"));
          if (init?.signal?.aborted) abort();
          else init?.signal?.addEventListener("abort", abort);
        },
      });
      return Promise.resolve(new Response(stream, { status: 200 }));
    };
    const result = await createFemaNriHazardProvider({ fetchImpl, timeoutMs: 30 }).ratingsForRegion(
      region("22071"),
    );
    expect(result).toMatchObject({ status: "unavailable", reason: "timeout" });
  });

  it("reuses a county response for the TTL and evicts the least recently used", async () => {
    setFemaNriCacheLimit(2);
    let nowMs = 1_000;
    let calls = 0;
    const fetchImpl: typeof fetch = async (url) => {
      calls += 1;
      const fips = decodeURIComponent(String(url)).match(/STCOFIPS='(\d{5})'/)?.[1];
      return jsonResponse({
        features: [{ attributes: { STCOFIPS: fips, RISK_RATNG: "Very Low", RISK_SCORE: 1 } }],
      });
    };
    const provider = createFemaNriHazardProvider({
      fetchImpl,
      cacheTtlMs: 1_000,
      now: () => nowMs,
    });
    await provider.ratingsForRegion(region("22071"));
    await provider.ratingsForRegion(region("22071"));
    expect(calls).toBe(1);
    await provider.ratingsForRegion(region("06037"));
    await provider.ratingsForRegion(region("36061"));
    await provider.ratingsForRegion(region("22071"));
    expect(calls).toBe(4);
    nowMs += 1_001;
    await provider.ratingsForRegion(region("36061"));
    expect(calls).toBe(5);
  });
});
