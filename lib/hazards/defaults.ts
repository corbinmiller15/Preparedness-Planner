import {
  hazardProviderCacheTtlMs,
  hazardProviderMode,
  hazardProviderTimeoutMs,
  type HazardProviderMode,
} from "@/lib/hazards/config";
import { createGbHazardProvider } from "@/lib/hazards/gb/provider";
import type { HazardProvider } from "@/lib/hazards/types";
import { createFemaNriHazardProvider } from "@/lib/hazards/us/fema-nri";
import { createUsFixtureNriProvider } from "@/lib/hazards/us/fixture-provider";
import { createGbPostcodeResolver } from "@/lib/location/gb/postcode";
import type { PostalRegionResolver } from "@/lib/location/types";
import {
  createMissingZipCountyResolver,
  createUsZipCountyCrosswalkResolver,
  type ZipCountyMatch,
} from "@/lib/location/us/crosswalk";
import { crosswalkResolver, defaultCrosswalkDir } from "@/lib/location/us/crosswalk-file";
import { createUsZipCountyResolver } from "@/lib/location/us/zip-county";

export type HazardDependencies = {
  resolvers: readonly PostalRegionResolver[];
  providers: readonly HazardProvider[];
};

export type HazardRuntimeConfig = {
  /** Overrides `HAZARD_PROVIDER` when set. */
  provider?: HazardProviderMode;
  env?: Record<string, string | undefined>;
  fetchImpl?: typeof fetch;
  endpoint?: string;
  timeoutMs?: number;
  cacheTtlMs?: number;
  crosswalkRows?: readonly ZipCountyMatch[];
  crosswalkPath?: string;
};

function fixtureDependencies(): HazardDependencies {
  return {
    resolvers: [createUsZipCountyResolver(), createGbPostcodeResolver()],
    providers: [createUsFixtureNriProvider(), createGbHazardProvider()],
  };
}

/**
 * Fixture ZIP rows and fixture ratings, unless `HAZARD_PROVIDER=fema_nri`
 * or `provider` is set. Live mode reads the generated Census crosswalk and
 * queries the public FEMA county layer. It does not fall back to sample ratings.
 */
export function defaultHazardDependencies(config: HazardRuntimeConfig = {}): HazardDependencies {
  const env = config.env ?? process.env;
  const mode = config.provider ?? hazardProviderMode(env);
  if (mode === "fixture") return fixtureDependencies();

  const resolver = config.crosswalkRows
    ? createUsZipCountyCrosswalkResolver(config.crosswalkRows)
    : (crosswalkResolver(config.crosswalkPath ?? defaultCrosswalkDir()) ??
      createMissingZipCountyResolver());
  return {
    resolvers: [resolver, createGbPostcodeResolver()],
    providers: [
      createFemaNriHazardProvider({
        fetchImpl: config.fetchImpl,
        endpoint: config.endpoint,
        timeoutMs: config.timeoutMs ?? hazardProviderTimeoutMs(env),
        cacheTtlMs: config.cacheTtlMs ?? hazardProviderCacheTtlMs(env),
      }),
      createGbHazardProvider(),
    ],
  };
}
