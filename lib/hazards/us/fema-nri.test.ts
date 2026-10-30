import { describe, expect, it } from "vitest";
import { FEMA_NRI_COUNTIES_QUERY, createFemaNriHazardProvider } from "@/lib/hazards/us/fema-nri";
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
  it("queries one county and returns live ratings", async () => {
    const fetchImpl: typeof fetch = async (url) => {
      const href = String(url);
      expect(href.startsWith(FEMA_NRI_COUNTIES_QUERY)).toBe(true);
      expect(href).toContain("STCOFIPS%3D%2722071%27");
      expect(href).toContain("returnGeometry=false");
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
});
