import type { HazardProvider, HazardRatingsResult } from "@/lib/hazards/types";

/** UK hazard provider stub. It does not invent ratings. */
export function createGbHazardProvider(): HazardProvider {
  return {
    country: "GB",
    id: "gb_unavailable",
    async ratingsForRegion(): Promise<HazardRatingsResult> {
      return { status: "unavailable", message: { key: "engine.hazard.gb_unavailable" } };
    },
  };
}
