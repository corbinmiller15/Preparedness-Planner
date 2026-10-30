import type { HazardRating, HazardRatingLabel, NriAttributes } from "@/lib/hazards/types";

const NRI_RATING_SUFFIX = "RISKR";
const NRI_SCORE_SUFFIX = "RISKS";

function nriHazard(key: string, name: string) {
  return {
    key,
    name,
    ratingField: `${key}_${NRI_RATING_SUFFIX}`,
    scoreField: `${key}_${NRI_SCORE_SUFFIX}`,
  };
}

/** County hazards. Rating and score fields are requested from FEMA and parsed from the reply. */
export const NRI_HAZARDS = [
  nriHazard("AVLN", "Avalanche"),
  nriHazard("CFLD", "Coastal Flooding"),
  nriHazard("CWAV", "Cold Wave"),
  nriHazard("DRGT", "Drought"),
  nriHazard("ERQK", "Earthquake"),
  nriHazard("HAIL", "Hail"),
  nriHazard("HWAV", "Heat Wave"),
  nriHazard("HRCN", "Hurricane"),
  nriHazard("ISTM", "Ice Storm"),
  nriHazard("LNDS", "Landslide"),
  nriHazard("LTNG", "Lightning"),
  nriHazard("IFLD", "Inland Flooding"),
  nriHazard("SWND", "Strong Wind"),
  nriHazard("TRND", "Tornado"),
  nriHazard("TSUN", "Tsunami"),
  nriHazard("VLCN", "Volcanic Activity"),
  nriHazard("WFIR", "Wildfire"),
  nriHazard("WNTW", "Winter Weather"),
] as const;

/** Ready.gov hazard name for an NRI key, when the facts sheet has actions for it. */
export const NRI_KEY_TO_HAZARD: Record<string, string | undefined> = {
  HRCN: "Hurricane",
  CFLD: "Flood",
  IFLD: "Flood",
  WFIR: "Wildfire",
  ERQK: "Earthquake",
  TRND: "Tornado",
  WNTW: "Winter storm",
  ISTM: "Winter storm",
  CWAV: "Winter storm",
  HWAV: "Extreme heat",
};

const NRI_COUNTY_FIELDS = [
  "STCOFIPS",
  "COUNTY",
  "STATE",
  "STATEABBRV",
  "STATEFIPS",
  "RISK_RATNG",
  "RISK_SCORE",
] as const;

/** Attributes the county query requests. Parsing reads hazard ratings from this same list. */
export const NRI_REQUESTED_FIELDS: readonly string[] = [
  ...NRI_COUNTY_FIELDS,
  ...NRI_HAZARDS.flatMap((hazard) => [hazard.ratingField, hazard.scoreField]),
];

const hazardByRatingField = new Map(NRI_HAZARDS.map((hazard) => [hazard.ratingField, hazard]));

const RATING_LABELS: Record<string, HazardRatingLabel> = {
  "Very High": "very_high",
  "Relatively High": "relatively_high",
  "Relatively Moderate": "relatively_moderate",
  "Relatively Low": "relatively_low",
  "Very Low": "very_low",
  "Insufficient Data": "insufficient_data",
  "Not Applicable": "not_applicable",
  "No Rating": "no_rating",
};

const RATING_RANK: Record<HazardRatingLabel, number> = {
  very_high: 5,
  relatively_high: 4,
  relatively_moderate: 3,
  relatively_low: 2,
  very_low: 1,
  insufficient_data: 0,
  not_applicable: 0,
  no_rating: 0,
  unrecognized: 0,
};

export function parseNriRating(raw: unknown): { rating: HazardRatingLabel; raw: string | null } {
  if (raw === null || raw === undefined || raw === "") {
    return { rating: "no_rating", raw: null };
  }
  if (typeof raw !== "string") {
    return { rating: "unrecognized", raw: String(raw) };
  }
  return { rating: RATING_LABELS[raw] ?? "unrecognized", raw };
}

export function higherRating(left: HazardRatingLabel, right: HazardRatingLabel): HazardRatingLabel {
  return RATING_RANK[left] >= RATING_RANK[right] ? left : right;
}

function scoreValue(raw: unknown): number | null {
  return typeof raw === "number" && Number.isFinite(raw) ? raw : null;
}

export function parseNriAttributes(attributes: NriAttributes): {
  composite: { rating: HazardRatingLabel; score: number | null; raw: string | null } | null;
  hazards: HazardRating[];
} {
  const composite = parseNriRating(attributes.RISK_RATNG);
  const hazards: HazardRating[] = [];
  for (const field of NRI_REQUESTED_FIELDS) {
    const hazard = hazardByRatingField.get(field);
    if (!hazard) continue;
    if (!Object.prototype.hasOwnProperty.call(attributes, field)) continue;
    const parsed = parseNriRating(attributes[field]);
    hazards.push({
      key: hazard.key,
      name: hazard.name,
      rating: parsed.rating,
      raw: parsed.raw,
      score: scoreValue(attributes[hazard.scoreField]),
    });
  }
  const compositePresent = Object.prototype.hasOwnProperty.call(attributes, "RISK_RATNG");
  return {
    composite: compositePresent
      ? { rating: composite.rating, score: scoreValue(attributes.RISK_SCORE), raw: composite.raw }
      : null,
    hazards,
  };
}

export function nriOutFields(): readonly string[] {
  return NRI_REQUESTED_FIELDS;
}
