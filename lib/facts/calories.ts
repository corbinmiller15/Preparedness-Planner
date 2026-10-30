import { SOURCES } from "@/lib/facts/sources";
import type { CalorieAdjustmentFact, CalorieBandFact, CalorieSex } from "@/lib/facts/types";

export const ACTIVITY_LEVELS = ["sedentary", "moderate", "active"] as const;
export type ActivityLevel = (typeof ACTIVITY_LEVELS)[number];

export const ACTIVITY_DEFINITIONS: Record<ActivityLevel, string> = {
  sedentary: "Only the activity of independent living",
  moderate: "Walking about 1.5 to 3 miles a day at 3 to 4 mph",
  active: "Walking more than 3 miles a day",
};

export const PREGNANCY_STATUSES = [
  "none",
  "pregnant_t1",
  "pregnant_t2",
  "pregnant_t3",
  "pregnant_unspecified",
  "breastfeeding_0_6",
  "breastfeeding_6_12",
  "breastfeeding_unspecified",
] as const;

export type PregnancyStatus = (typeof PREGNANCY_STATUSES)[number];

const AGE_BANDS: ReadonlyArray<{ label: string; minAge: number; maxAge: number | null }> = [
  { label: "2", minAge: 2, maxAge: 2 },
  { label: "3", minAge: 3, maxAge: 3 },
  { label: "4", minAge: 4, maxAge: 4 },
  { label: "5", minAge: 5, maxAge: 5 },
  { label: "6", minAge: 6, maxAge: 6 },
  { label: "7", minAge: 7, maxAge: 7 },
  { label: "8", minAge: 8, maxAge: 8 },
  { label: "9", minAge: 9, maxAge: 9 },
  { label: "10", minAge: 10, maxAge: 10 },
  { label: "11", minAge: 11, maxAge: 11 },
  { label: "12", minAge: 12, maxAge: 12 },
  { label: "13", minAge: 13, maxAge: 13 },
  { label: "14", minAge: 14, maxAge: 14 },
  { label: "15", minAge: 15, maxAge: 15 },
  { label: "16", minAge: 16, maxAge: 16 },
  { label: "17", minAge: 17, maxAge: 17 },
  { label: "18", minAge: 18, maxAge: 18 },
  { label: "19-20", minAge: 19, maxAge: 20 },
  { label: "21-25", minAge: 21, maxAge: 25 },
  { label: "26-30", minAge: 26, maxAge: 30 },
  { label: "31-35", minAge: 31, maxAge: 35 },
  { label: "36-40", minAge: 36, maxAge: 40 },
  { label: "41-45", minAge: 41, maxAge: 45 },
  { label: "46-50", minAge: 46, maxAge: 50 },
  { label: "51-55", minAge: 51, maxAge: 55 },
  { label: "56-60", minAge: 56, maxAge: 60 },
  { label: "61-65", minAge: 61, maxAge: 65 },
  { label: "66-70", minAge: 66, maxAge: 70 },
  { label: "71-75", minAge: 71, maxAge: 75 },
  { label: "76+", minAge: 76, maxAge: null },
];

const maleSedentary = [
  1000, 1000, 1200, 1200, 1400, 1400, 1400, 1600, 1600, 1800, 1800, 2000, 2000, 2200, 2400, 2400,
  2400, 2600, 2400, 2400, 2400, 2400, 2200, 2200, 2200, 2200, 2000, 2000, 2000, 2000,
];
const maleModerate = [
  1000, 1400, 1400, 1400, 1600, 1600, 1600, 1800, 1800, 2000, 2200, 2200, 2400, 2600, 2800, 2800,
  2800, 2800, 2800, 2600, 2600, 2600, 2600, 2400, 2400, 2400, 2400, 2200, 2200, 2200,
];
const maleActive = [
  1000, 1400, 1600, 1600, 1800, 1800, 2000, 2000, 2200, 2200, 2400, 2600, 2800, 3000, 3200, 3200,
  3200, 3000, 3000, 3000, 3000, 2800, 2800, 2800, 2800, 2600, 2600, 2600, 2600, 2400,
];
const femaleSedentary = [
  1000, 1000, 1200, 1200, 1200, 1200, 1400, 1400, 1400, 1600, 1600, 1600, 1800, 1800, 1800, 1800,
  1800, 2000, 2000, 1800, 1800, 1800, 1800, 1800, 1600, 1600, 1600, 1600, 1600, 1600,
];
const femaleModerate = [
  1000, 1200, 1400, 1400, 1400, 1600, 1600, 1600, 1800, 1800, 2000, 2000, 2000, 2000, 2000, 2000,
  2000, 2200, 2200, 2000, 2000, 2000, 2000, 2000, 1800, 1800, 1800, 1800, 1800, 1800,
];
const femaleActive = [
  1000, 1400, 1400, 1600, 1600, 1800, 1800, 1800, 2000, 2000, 2200, 2200, 2400, 2400, 2400, 2400,
  2400, 2400, 2400, 2400, 2200, 2200, 2200, 2200, 2200, 2200, 2000, 2000, 2000, 2000,
];

const columns = [
  maleSedentary,
  maleModerate,
  maleActive,
  femaleSedentary,
  femaleModerate,
  femaleActive,
];
if (columns.some((column) => column.length !== AGE_BANDS.length)) {
  throw new Error("USDA calorie columns must match the age bands");
}

const calorieSources = [SOURCES.usdaCalories, SOURCES.dietaryGuidelines];

export const CALORIE_BANDS: readonly CalorieBandFact[] = AGE_BANDS.map((band, index) => ({
  id: `CAL-${String(index + 1).padStart(3, "0")}`,
  kind: "calorie_band",
  ageLabel: band.label,
  minAge: band.minAge,
  maxAge: band.maxAge,
  kcal: {
    male: {
      sedentary: maleSedentary[index]!,
      moderate: maleModerate[index]!,
      active: maleActive[index]!,
    },
    female: {
      sedentary: femaleSedentary[index]!,
      moderate: femaleModerate[index]!,
      active: femaleActive[index]!,
    },
  },
  sources: calorieSources,
  furtherReading: [],
}));

const applicability =
  "Dietary Guidelines 2020-2025, Table A2-3, for women with a healthy pre-pregnancy weight.";

export const CALORIE_ADJUSTMENTS = [
  {
    id: "CAL-P01",
    kind: "calorie_adjustment",
    stage: "Pregnancy, 1st trimester",
    kcalPerDayChange: 0,
    applicability,
    sources: [SOURCES.dietaryGuidelines],
    furtherReading: [],
  },
  {
    id: "CAL-P02",
    kind: "calorie_adjustment",
    stage: "Pregnancy, 2nd trimester",
    kcalPerDayChange: 340,
    applicability,
    sources: [SOURCES.dietaryGuidelines],
    furtherReading: [],
  },
  {
    id: "CAL-P03",
    kind: "calorie_adjustment",
    stage: "Pregnancy, 3rd trimester",
    kcalPerDayChange: 452,
    applicability,
    sources: [SOURCES.dietaryGuidelines],
    furtherReading: [],
  },
  {
    id: "CAL-P04",
    kind: "calorie_adjustment",
    stage: "Lactation, first 6 months",
    kcalPerDayChange: 330,
    applicability,
    sources: [SOURCES.dietaryGuidelines],
    furtherReading: [],
  },
  {
    id: "CAL-P05",
    kind: "calorie_adjustment",
    stage: "Lactation, second 6 months",
    kcalPerDayChange: 400,
    applicability,
    sources: [SOURCES.dietaryGuidelines],
    furtherReading: [],
  },
] as const satisfies readonly CalorieAdjustmentFact[];

const adjustmentByStatus = {
  pregnant_t1: CALORIE_ADJUSTMENTS[0],
  pregnant_t2: CALORIE_ADJUSTMENTS[1],
  pregnant_t3: CALORIE_ADJUSTMENTS[2],
  breastfeeding_0_6: CALORIE_ADJUSTMENTS[3],
  breastfeeding_6_12: CALORIE_ADJUSTMENTS[4],
} as const;

export function calorieBandForAge(age: number): CalorieBandFact | undefined {
  return CALORIE_BANDS.find(
    (band) => age >= band.minAge && (band.maxAge === null || age <= band.maxAge),
  );
}

export function calorieAdjustmentForStatus(
  status: PregnancyStatus,
): CalorieAdjustmentFact | undefined {
  if (
    status === "none" ||
    status === "pregnant_unspecified" ||
    status === "breastfeeding_unspecified"
  ) {
    return undefined;
  }
  return adjustmentByStatus[status];
}

export function kcalFor(band: CalorieBandFact, sex: CalorieSex, activity: ActivityLevel): number {
  return band.kcal[sex][activity];
}
