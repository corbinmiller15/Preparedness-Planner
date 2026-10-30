import { createGbHazardProvider } from "@/lib/hazards/gb/provider";
import type { HazardProvider } from "@/lib/hazards/types";
import { createUsFixtureNriProvider } from "@/lib/hazards/us/fixture-provider";
import { createGbPostcodeResolver } from "@/lib/location/gb/postcode";
import type { PostalRegionResolver } from "@/lib/location/types";
import { createUsZipCountyResolver } from "@/lib/location/us/zip-county";

export type HazardDependencies = {
  resolvers: readonly PostalRegionResolver[];
  providers: readonly HazardProvider[];
};

/** US sample data plus a UK stub. The live FEMA provider is opt-in. */
export function defaultHazardDependencies(): HazardDependencies {
  return {
    resolvers: [createUsZipCountyResolver(), createGbPostcodeResolver()],
    providers: [createUsFixtureNriProvider(), createGbHazardProvider()],
  };
}
