import { parseNriAttributes } from "@/lib/hazards/nri";
import type { HazardProvider, HazardRatingsResult } from "@/lib/hazards/types";
import type { RegionRef } from "@/lib/location/types";
import { US_NRI_FIXTURE, type UsNriFixtureRow } from "@/lib/hazards/us/fixture";

export function createUsFixtureNriProvider(
  rows: readonly UsNriFixtureRow[] = US_NRI_FIXTURE,
): HazardProvider {
  const byFips = new Map(rows.map((row) => [row.countyFips, row]));
  return {
    country: "US",
    id: "us_nri_fixture",
    async ratingsForRegion(region: RegionRef): Promise<HazardRatingsResult> {
      const row = byFips.get(region.id);
      if (!row) return { status: "not_found" };
      const parsed = parseNriAttributes(row.attributes);
      return {
        status: "ok",
        provenance: "fixture",
        providerId: "us_nri_fixture",
        composite: parsed.composite,
        hazards: parsed.hazards,
        disclaimer: { key: "engine.hazard.fixture_disclaimer" },
      };
    },
  };
}
