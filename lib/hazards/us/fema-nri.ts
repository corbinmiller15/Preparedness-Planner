import { nriOutFields, parseNriAttributes } from "@/lib/hazards/nri";
import type { HazardProvider, HazardRatingsResult, NriAttributes } from "@/lib/hazards/types";
import type { RegionRef } from "@/lib/location/types";

/** Public ArcGIS query for FEMA National Risk Index counties. */
export const FEMA_NRI_COUNTIES_QUERY =
  "https://services.arcgis.com/XG15cJAlne2vxtgt/arcgis/rest/services/National_Risk_Index_Counties/FeatureServer/0/query";

type ArcGisQuery = {
  features?: Array<{ attributes?: NriAttributes }>;
  error?: { message?: string };
};

export function createFemaNriHazardProvider(options?: {
  fetchImpl?: typeof fetch;
  endpoint?: string;
}): HazardProvider {
  const fetchImpl = options?.fetchImpl ?? fetch;
  const endpoint = options?.endpoint ?? FEMA_NRI_COUNTIES_QUERY;
  return {
    country: "US",
    id: "fema_nri",
    async ratingsForRegion(region: RegionRef): Promise<HazardRatingsResult> {
      if (!/^\d{5}$/.test(region.id)) {
        throw new Error("County FIPS must be 5 digits");
      }
      const params = new URLSearchParams({
        where: `STCOFIPS='${region.id}'`,
        outFields: nriOutFields().join(","),
        returnGeometry: "false",
        f: "json",
      });
      const response = await fetchImpl(`${endpoint}?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`National Risk Index query failed (${response.status})`);
      }
      const body = (await response.json()) as ArcGisQuery;
      if (body.error) {
        throw new Error(body.error.message ?? "National Risk Index query failed");
      }
      const attributes = body.features?.[0]?.attributes;
      if (!attributes) return { status: "not_found" };
      const parsed = parseNriAttributes(attributes);
      return {
        status: "ok",
        provenance: "live",
        providerId: "fema_nri",
        composite: parsed.composite,
        hazards: parsed.hazards,
        disclaimer: { key: "engine.hazard.live_sources" },
      };
    },
  };
}
