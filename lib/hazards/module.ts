import { HAZARD_NAMES, hazardActions } from "@/lib/facts/hazards";
import { higherRating, NRI_KEY_TO_HAZARD } from "@/lib/hazards/nri";
import type { HazardProvider, HazardRating, HazardRatingLabel } from "@/lib/hazards/types";
import { normalizeCountry, type PostalRegionResolver, type RegionRef } from "@/lib/location/types";
import type { LocalMessage } from "@/lib/i18n";

export type HazardActionItem = {
  factId: string;
  factIds: [string];
  phase: "before" | "during" | "after";
  text: string;
};

export type HazardGroup = {
  hazard: string;
  rating: HazardRatingLabel | null;
  nriKeys: string[];
  factIds: string[];
  actions: HazardActionItem[];
  note: LocalMessage | null;
};

export type HazardModuleResult =
  | { status: "invalid_country"; message: LocalMessage; country: string }
  | { status: "unsupported_country"; message: LocalMessage; country: string }
  | {
      status: "invalid_postal_code" | "not_found" | "unavailable";
      message: LocalMessage;
      country: string;
      postalCode: string;
    }
  | {
      status: "no_provider" | "no_ratings" | "provider_error";
      message: LocalMessage;
      country: string;
      region: RegionRef;
    }
  | {
      status: "ok";
      country: string;
      postalCode: string;
      region: RegionRef;
      providerId: string;
      provenance: "fixture" | "live";
      disclaimer: LocalMessage | null;
      composite: { rating: HazardRatingLabel; score: number | null; raw: string | null } | null;
      groups: HazardGroup[];
      otherRatings: HazardRating[];
      /** US Ready.gov actions are not attached outside the US. */
      actionsIncluded: boolean;
    };

function actionsFor(hazard: string): HazardActionItem[] {
  return hazardActions(hazard).map((fact) => ({
    factId: fact.id,
    factIds: [fact.id],
    phase: fact.phase,
    text: fact.text,
  }));
}

function rollup(ratings: HazardRating[]): { rating: HazardRatingLabel | null; nriKeys: string[] } {
  if (ratings.length === 0) return { rating: null, nriKeys: [] };
  let rating = ratings[0]!.rating;
  for (const item of ratings.slice(1)) rating = higherRating(rating, item.rating);
  return { rating, nriKeys: ratings.map((item) => item.key) };
}

export async function buildHazardModule(
  input: { country: string; postalCode: string },
  deps: { resolvers: readonly PostalRegionResolver[]; providers: readonly HazardProvider[] },
): Promise<HazardModuleResult> {
  const country = normalizeCountry(input.country);
  if (!country) {
    return {
      status: "invalid_country",
      message: { key: "engine.hazard.invalid_country" },
      country: input.country,
    };
  }
  const resolver = deps.resolvers.find((item) => item.country === country);
  if (!resolver) {
    return {
      status: "unsupported_country",
      message: { key: "engine.hazard.unsupported_country" },
      country,
    };
  }
  const resolved = await resolver.resolve(input.postalCode);
  if (resolved.status !== "found") {
    return {
      status: resolved.status,
      message: resolved.message,
      country,
      postalCode: input.postalCode,
    };
  }
  const provider = deps.providers.find((item) => item.country === country);
  if (!provider) {
    return {
      status: "no_provider",
      message: { key: "engine.hazard.no_provider" },
      country,
      region: resolved.region,
    };
  }
  let ratings;
  try {
    ratings = await provider.ratingsForRegion(resolved.region);
  } catch {
    return {
      status: "provider_error",
      message: { key: "engine.hazard.provider_error" },
      country,
      region: resolved.region,
    };
  }
  if (ratings.status === "unavailable") {
    return {
      status: "unavailable",
      message: ratings.message,
      country,
      postalCode: input.postalCode,
    };
  }
  if (ratings.status === "not_found") {
    return {
      status: "no_ratings",
      message: { key: "engine.hazard.no_ratings" },
      country,
      region: resolved.region,
    };
  }

  const byHazard = new Map<string, HazardRating[]>();
  const otherRatings: HazardRating[] = [];
  for (const hazard of ratings.hazards) {
    const name = NRI_KEY_TO_HAZARD[hazard.key];
    if (!name) {
      otherRatings.push(hazard);
      continue;
    }
    const list = byHazard.get(name) ?? [];
    list.push(hazard);
    byHazard.set(name, list);
  }

  const actionsIncluded = country === "US";
  const groups: HazardGroup[] = [];
  if (actionsIncluded) {
    for (const name of HAZARD_NAMES) {
      if (name === "Power outage") {
        const actions = actionsFor(name);
        groups.push({
          hazard: name,
          rating: null,
          nriKeys: [],
          factIds: actions.map((action) => action.factId),
          actions,
          note: { key: "engine.hazard.power_outage" },
        });
        continue;
      }
      const rolled = rollup(byHazard.get(name) ?? []);
      const actions = actionsFor(name);
      groups.push({
        hazard: name,
        rating: rolled.rating,
        nriKeys: rolled.nriKeys,
        factIds: actions.map((action) => action.factId),
        actions,
        note: null,
      });
    }
  }

  return {
    status: "ok",
    country,
    postalCode: input.postalCode,
    region: resolved.region,
    providerId: ratings.providerId,
    provenance: ratings.provenance,
    disclaimer: ratings.disclaimer,
    composite: ratings.composite,
    groups,
    otherRatings,
    actionsIncluded,
  };
}
