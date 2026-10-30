import { HAZARD_NAMES, hazardActions } from "@/lib/facts/hazards";
import { higherRating, NRI_KEY_TO_HAZARD } from "@/lib/hazards/nri";
import type { HazardProvider, HazardRating, HazardRatingLabel } from "@/lib/hazards/types";
import {
  normalizeCountry,
  type PostalRegionResolver,
  type RankedCountyRef,
  type RegionRef,
} from "@/lib/location/types";
import type { LocalMessage } from "@/lib/i18n";

export type HazardActionItem = {
  factId: string;
  factIds: [string];
  phase: "before" | "during" | "after";
  text: string;
};

export type HazardCountyRef = {
  id: string;
  name: string;
};

export type HazardGroup = {
  hazard: string;
  rating: HazardRatingLabel | null;
  /** County whose rating won, when several counties were compared. */
  ratingCounty: HazardCountyRef | null;
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
      region?: RegionRef;
      counties?: readonly RankedCountyRef[];
    }
  | {
      status: "no_provider" | "no_ratings" | "provider_error";
      message: LocalMessage;
      country: string;
      region: RegionRef;
      counties?: readonly RankedCountyRef[];
    }
  | {
      status: "ok" | "partial";
      country: string;
      postalCode: string;
      region: RegionRef;
      /** Every county for this postal code, highest weight first. Omitted for the fixture resolver. */
      counties?: readonly RankedCountyRef[];
      providerId: string;
      provenance: "fixture" | "live";
      disclaimer: LocalMessage | null;
      composite: {
        rating: HazardRatingLabel | null;
        score: number | null;
        raw: string | null;
      } | null;
      /** County that supplied the highest composite rating. */
      compositeCounty: HazardCountyRef | null;
      /** Set when the composite label is not a comparable risk level. */
      ratingNote: LocalMessage | null;
      /** Set when the ZIP meets more than one county. */
      areaNote: LocalMessage | null;
      /** Set when ratings are the highest across more than one county. */
      highestNote: LocalMessage | null;
      /** Counties whose own composite had no comparable rating. */
      insufficientNote: LocalMessage | null;
      /** Counties that did not return ratings while another county did. */
      partialNote: LocalMessage | null;
      missingCounties: readonly HazardCountyRef[];
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

type SourcedRating = HazardRating & { countyId: string; countyName: string };

function preferRating(current: SourcedRating, next: SourcedRating): SourcedRating {
  const winner = higherRating(current.rating, next.rating);
  return winner === next.rating && next.rating !== current.rating ? next : current;
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
  const targets: HazardCountyRef[] =
    resolved.counties && resolved.counties.length > 0
      ? resolved.counties.map((county) => ({ id: county.id, name: county.name }))
      : [{ id: resolved.region.id, name: resolved.region.name }];
  const fetched = await Promise.all(
    targets.map(async (county) => {
      try {
        const ratings = await provider.ratingsForRegion({
          ...resolved.region,
          id: county.id,
          name: county.name,
        });
        return { county, ratings, thrown: false as const };
      } catch {
        return { county, ratings: null, thrown: true as const };
      }
    }),
  );
  const ready = fetched.filter(
    (
      item,
    ): item is {
      county: HazardCountyRef;
      ratings: Extract<NonNullable<(typeof fetched)[number]["ratings"]>, { status: "ok" }>;
      thrown: false;
    } => item.ratings?.status === "ok",
  );
  const located = resolved.counties ? { counties: resolved.counties } : {};
  if (ready.length === 0) {
    const primary = fetched[0];
    if (!primary || primary.thrown || !primary.ratings) {
      return {
        status: "provider_error",
        message: { key: "engine.hazard.provider_error" },
        country,
        region: resolved.region,
        ...located,
      };
    }
    if (primary.ratings.status === "unavailable") {
      return {
        status: "unavailable",
        message: primary.ratings.message,
        country,
        postalCode: input.postalCode,
        region: resolved.region,
        ...located,
      };
    }
    return {
      status: "no_ratings",
      message: { key: "engine.hazard.no_ratings" },
      country,
      region: resolved.region,
      ...located,
    };
  }

  const byHazard = new Map<string, SourcedRating[]>();
  const otherByKey = new Map<string, SourcedRating>();
  for (const item of ready) {
    for (const hazard of item.ratings.hazards) {
      const sourced: SourcedRating = {
        ...hazard,
        countyId: item.county.id,
        countyName: item.county.name,
      };
      const name = NRI_KEY_TO_HAZARD[hazard.key];
      if (!name) {
        const current = otherByKey.get(hazard.key);
        otherByKey.set(hazard.key, current ? preferRating(current, sourced) : sourced);
        continue;
      }
      const list = byHazard.get(name) ?? [];
      list.push(sourced);
      byHazard.set(name, list);
    }
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
          ratingCounty: null,
          nriKeys: [],
          factIds: actions.map((action) => action.factId),
          actions,
          note: { key: "engine.hazard.power_outage" },
        });
        continue;
      }
      const sourced = byHazard.get(name) ?? [];
      const best = sourced.reduce<SourcedRating | null>(
        (current, item) => (current ? preferRating(current, item) : item),
        null,
      );
      const actions = actionsFor(name);
      groups.push({
        hazard: name,
        rating: best?.rating ?? null,
        ratingCounty: best ? { id: best.countyId, name: best.countyName } : null,
        nriKeys: best
          ? [
              ...new Set(
                sourced.filter((item) => item.countyId === best.countyId).map((item) => item.key),
              ),
            ]
          : [],
        factIds: actions.map((action) => action.factId),
        actions,
        note: null,
      });
    }
  }

  let bestComposite: {
    rating: HazardRatingLabel;
    score: number | null;
    raw: string | null;
  } | null = null;
  let compositeCounty: HazardCountyRef | null = null;
  for (const item of ready) {
    const composite = item.ratings.composite;
    if (!composite) continue;
    if (
      !bestComposite ||
      (higherRating(bestComposite.rating, composite.rating) === composite.rating &&
        composite.rating !== bestComposite.rating)
    ) {
      bestComposite = composite;
      compositeCounty = item.county;
    }
  }
  const comparable = presentComposite(bestComposite);
  const lead = ready[0]!.ratings;
  const region = { ...resolved.region };
  if (!region.subdivisionCode && lead.area?.state) region.subdivisionCode = lead.area.state;
  const missingCounties = fetched
    .filter((item) => item.ratings?.status !== "ok")
    .map((item) => item.county);
  const insufficientCounties = ready
    .filter((item) => {
      const rating = item.ratings.composite?.rating;
      return rating !== undefined && NON_COMPARABLE.has(rating);
    })
    .map((item) => item.county);
  const comparableWinner = bestComposite !== null && !NON_COMPARABLE.has(bestComposite.rating);
  const countyCount = resolved.counties?.length ?? (targets.length > 1 ? targets.length : 0);

  return {
    status: missingCounties.length > 0 ? "partial" : "ok",
    country,
    postalCode: input.postalCode,
    region,
    ...(resolved.counties ? { counties: resolved.counties } : {}),
    providerId: lead.providerId,
    provenance: lead.provenance,
    disclaimer: lead.disclaimer,
    composite: comparable.composite,
    compositeCounty,
    ratingNote: comparable.ratingNote,
    areaNote: areaNoteFor(resolved.counties),
    highestNote:
      countyCount > 1
        ? { key: "engine.hazard.highest_across_counties", params: { count: countyCount } }
        : null,
    insufficientNote:
      comparableWinner && insufficientCounties.length > 0
        ? {
            key: "engine.hazard.county_insufficient",
            params: { counties: insufficientCounties.map((county) => county.name).join(", ") },
          }
        : null,
    partialNote:
      missingCounties.length > 0
        ? {
            key: "engine.hazard.partial_counties",
            params: { counties: missingCounties.map((county) => county.name).join(", ") },
          }
        : null,
    missingCounties,
    groups,
    otherRatings: [...otherByKey.values()],
    actionsIncluded,
  };
}

const NON_COMPARABLE = new Set<HazardRatingLabel>([
  "insufficient_data",
  "no_rating",
  "not_applicable",
]);

function areaNoteFor(counties: readonly RankedCountyRef[] | undefined): LocalMessage | null {
  if (!counties || counties.length < 2) return null;
  const kind = counties[0]?.weightKind;
  return {
    key:
      kind === "population" ? "engine.hazard.population_weight" : "engine.hazard.land_area_weight",
  };
}

function presentComposite(
  composite: { rating: HazardRatingLabel; score: number | null; raw: string | null } | null,
): {
  composite: { rating: HazardRatingLabel | null; score: number | null; raw: string | null } | null;
  ratingNote: LocalMessage | null;
} {
  if (!composite || !NON_COMPARABLE.has(composite.rating)) {
    return { composite, ratingNote: null };
  }
  return {
    composite: { rating: null, score: null, raw: composite.raw },
    ratingNote: { key: "engine.hazard.insufficient_data" },
  };
}
