import type { HazardRating, HazardRatingLabel, NriAttributes } from "@/lib/hazards/types";

/** County National Risk Index hazard keys and the attribute prefix used by the FEMA layer. */
export const NRI_HAZARDS = [
  { key: "AVLN", name: "Avalanche" },
  { key: "CFLD", name: "Coastal Flooding" },
  { key: "CWAV", name: "Cold Wave" },
  { key: "DRGT", name: "Drought" },
  { key: "ERQK", name: "Earthquake" },
  { key: "HAIL", name: "Hail" },
  { key: "HWAV", name: "Heat Wave" },
  { key: "HRCN", name: "Hurricane" },
  { key: "ISTM", name: "Ice Storm" },
  { key: "LNDS", name: "Landslide" },
  { key: "LTNG", name: "Lightning" },
  { key: "RFLD", name: "Riverine Flooding" },
  { key: "SWND", name: "Strong Wind" },
  { key: "TRND", name: "Tornado" },
  { key: "TSUN", name: "Tsunami" },
  { key: "VLCN", name: "Volcanic Activity" },
  { key: "WFIR", name: "Wildfire" },
  { key: "WNTW", name: "Winter Weather" },
] as const;

/** Ready.gov hazard name for an NRI key, when the facts sheet has actions for it. */
export const NRI_KEY_TO_HAZARD: Record<string, string | undefined> = {
  HRCN: "Hurricane",
  CFLD: "Flood",
  RFLD: "Flood",
  WFIR: "Wildfire",
  ERQK: "Earthquake",
  TRND: "Tornado",
  WNTW: "Winter storm",
  ISTM: "Winter storm",
  CWAV: "Winter storm",
  HWAV: "Extreme heat",
};

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
  for (const hazard of NRI_HAZARDS) {
    const ratingField = `${hazard.key}_RISKR`;
    if (!Object.prototype.hasOwnProperty.call(attributes, ratingField)) continue;
    const parsed = parseNriRating(attributes[ratingField]);
    hazards.push({
      key: hazard.key,
      name: hazard.name,
      rating: parsed.rating,
      raw: parsed.raw,
      score: scoreValue(attributes[`${hazard.key}_RISKS`]),
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

export function nriOutFields(): string[] {
  const fields = [
    "STCOFIPS",
    "COUNTY",
    "STATE",
    "STATEABBRV",
    "STATEFIPS",
    "RISK_RATNG",
    "RISK_SCORE",
  ];
  for (const hazard of NRI_HAZARDS) {
    fields.push(`${hazard.key}_RISKR`, `${hazard.key}_RISKS`);
  }
  return fields;
}
