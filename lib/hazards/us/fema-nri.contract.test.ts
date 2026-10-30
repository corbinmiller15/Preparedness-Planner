import { describe, expect, it } from "vitest";
import { nriOutFields } from "@/lib/hazards/nri";
import { clearFemaNriCache, createFemaNriHazardProvider } from "@/lib/hazards/us/fema-nri";
import type { RegionRef } from "@/lib/location/types";

/**
 * Live check against FEMA's county layer. Not part of `npm test`.
 * Run with `npm run test:contract`.
 */
const county: RegionRef = {
  country: "US",
  id: "22071",
  name: "Orleans Parish",
  kind: "county_or_equivalent",
};

describe("FEMA National Risk Index live contract", () => {
  it("returns every field the app's county query requests", async () => {
    clearFemaNriCache();
    let requestedUrl = "";
    let bodyText = "";
    const fetchImpl: typeof fetch = async (input, init) => {
      requestedUrl = String(input);
      const response = await fetch(input, init);
      bodyText = await response.text();
      return new Response(bodyText, {
        status: response.status,
        statusText: response.statusText,
      });
    };

    const result = await createFemaNriHazardProvider({
      fetchImpl,
      cacheTtlMs: 0,
      timeoutMs: 20_000,
    }).ratingsForRegion(county);

    const requested = [...nriOutFields()];
    const outFields = new URL(requestedUrl).searchParams.get("outFields")?.split(",") ?? [];
    expect(outFields).toEqual(requested);
    expect(requested).toContain("IFLD_RISKR");
    expect(requested).toContain("IFLD_RISKS");
    expect(result.status).toBe("ok");

    const body = JSON.parse(bodyText) as {
      error?: { message?: string };
      features?: Array<{ attributes?: Record<string, unknown> } | null>;
    };
    expect(body.error?.message).toBeUndefined();
    const attributes = body.features?.[0]?.attributes;
    expect(attributes).toEqual(expect.any(Object));
    const missing = requested.filter(
      (field) => !Object.prototype.hasOwnProperty.call(attributes, field),
    );
    expect(missing).toEqual([]);
  }, 30_000);
});
