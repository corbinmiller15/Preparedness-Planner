import type { NriAttributes } from "@/lib/hazards/types";

export type UsNriFixtureRow = {
  countyFips: string;
  attributes: NriAttributes;
};

function row(
  countyFips: string,
  ratings: Record<string, string>,
  composite: string,
): UsNriFixtureRow {
  const attributes: NriAttributes = {
    STCOFIPS: countyFips,
    RISK_RATNG: composite,
    RISK_SCORE: null,
  };
  for (const [key, rating] of Object.entries(ratings)) {
    attributes[`${key}_RISKR`] = rating;
    attributes[`${key}_RISKS`] = null;
  }
  return { countyFips, attributes };
}

/**
 * Sample rating labels for the fixture counties.
 * These are not FEMA National Risk Index scores. Scores are left null on purpose.
 */
export const US_NRI_FIXTURE: readonly UsNriFixtureRow[] = [
  row(
    "22071",
    {
      HRCN: "Very High",
      CFLD: "Very High",
      IFLD: "Relatively Moderate",
      TRND: "Relatively High",
      WFIR: "Very Low",
      ERQK: "Relatively Low",
      HWAV: "Relatively High",
      WNTW: "Very Low",
      DRGT: "Relatively Moderate",
    },
    "Very High",
  ),
  row(
    "49035",
    {
      ERQK: "Relatively High",
      WFIR: "Relatively High",
      WNTW: "Relatively High",
      HWAV: "Relatively Moderate",
      HRCN: "Very Low",
      IFLD: "Relatively Low",
    },
    "Relatively Moderate",
  ),
  row(
    "06075",
    {
      ERQK: "Very High",
      WFIR: "Relatively Moderate",
      HRCN: "Very Low",
      TSUN: "Relatively High",
    },
    "Relatively High",
  ),
  row(
    "12086",
    {
      HRCN: "Very High",
      CFLD: "Relatively High",
      IFLD: "Relatively High",
      HWAV: "Relatively High",
    },
    "Very High",
  ),
  row(
    "36061",
    { HRCN: "Relatively Moderate", ERQK: "Relatively Low", WNTW: "Relatively Moderate" },
    "Relatively Moderate",
  ),
  row("06037", { ERQK: "Very High", WFIR: "Very High", HWAV: "Relatively Moderate" }, "Very High"),
  row(
    "17031",
    { TRND: "Relatively High", WNTW: "Relatively High", HWAV: "Relatively Moderate" },
    "Relatively High",
  ),
  row(
    "02020",
    { ERQK: "Relatively High", WNTW: "Relatively Moderate", TSUN: "Relatively Moderate" },
    "Relatively Moderate",
  ),
];
