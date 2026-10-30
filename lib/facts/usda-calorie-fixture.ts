/**
 * USDA Food Patterns daily calories from the preparedness facts sheet.
 * Columns are male/female × sedentary/moderate/active, one cell per age band.
 * Kept separate from `lib/facts/calories.ts` so the catalog can be checked against the sheet.
 */

export const USDA_MALE_SEDENTARY = [
  1000, 1000, 1200, 1200, 1400, 1400, 1400, 1600, 1600, 1800, 1800, 2000, 2000, 2200, 2400, 2400,
  2400, 2600, 2400, 2400, 2400, 2400, 2200, 2200, 2200, 2200, 2000, 2000, 2000, 2000,
] as const;

export const USDA_MALE_MODERATE = [
  1000, 1400, 1400, 1400, 1600, 1600, 1600, 1800, 1800, 2000, 2200, 2200, 2400, 2600, 2800, 2800,
  2800, 2800, 2800, 2600, 2600, 2600, 2600, 2400, 2400, 2400, 2400, 2200, 2200, 2200,
] as const;

export const USDA_MALE_ACTIVE = [
  1000, 1400, 1600, 1600, 1800, 1800, 2000, 2000, 2200, 2200, 2400, 2600, 2800, 3000, 3200, 3200,
  3200, 3000, 3000, 3000, 3000, 2800, 2800, 2800, 2800, 2600, 2600, 2600, 2600, 2400,
] as const;

export const USDA_FEMALE_SEDENTARY = [
  1000, 1000, 1200, 1200, 1200, 1200, 1400, 1400, 1400, 1600, 1600, 1600, 1800, 1800, 1800, 1800,
  1800, 2000, 2000, 1800, 1800, 1800, 1800, 1800, 1600, 1600, 1600, 1600, 1600, 1600,
] as const;

export const USDA_FEMALE_MODERATE = [
  1000, 1200, 1400, 1400, 1400, 1600, 1600, 1600, 1800, 1800, 2000, 2000, 2000, 2000, 2000, 2000,
  2000, 2200, 2200, 2000, 2000, 2000, 2000, 2000, 1800, 1800, 1800, 1800, 1800, 1800,
] as const;

export const USDA_FEMALE_ACTIVE = [
  1000, 1400, 1400, 1600, 1600, 1800, 1800, 1800, 2000, 2000, 2200, 2200, 2400, 2400, 2400, 2400,
  2400, 2400, 2400, 2400, 2200, 2200, 2200, 2200, 2200, 2200, 2000, 2000, 2000, 2000,
] as const;

/** Age-band edges from the facts sheet, in the same order as the calorie columns. */
export const USDA_AGE_BOUNDS: readonly { minAge: number; maxAge: number | null }[] = [
  { minAge: 2, maxAge: 2 },
  { minAge: 3, maxAge: 3 },
  { minAge: 4, maxAge: 4 },
  { minAge: 5, maxAge: 5 },
  { minAge: 6, maxAge: 6 },
  { minAge: 7, maxAge: 7 },
  { minAge: 8, maxAge: 8 },
  { minAge: 9, maxAge: 9 },
  { minAge: 10, maxAge: 10 },
  { minAge: 11, maxAge: 11 },
  { minAge: 12, maxAge: 12 },
  { minAge: 13, maxAge: 13 },
  { minAge: 14, maxAge: 14 },
  { minAge: 15, maxAge: 15 },
  { minAge: 16, maxAge: 16 },
  { minAge: 17, maxAge: 17 },
  { minAge: 18, maxAge: 18 },
  { minAge: 19, maxAge: 20 },
  { minAge: 21, maxAge: 25 },
  { minAge: 26, maxAge: 30 },
  { minAge: 31, maxAge: 35 },
  { minAge: 36, maxAge: 40 },
  { minAge: 41, maxAge: 45 },
  { minAge: 46, maxAge: 50 },
  { minAge: 51, maxAge: 55 },
  { minAge: 56, maxAge: 60 },
  { minAge: 61, maxAge: 65 },
  { minAge: 66, maxAge: 70 },
  { minAge: 71, maxAge: 75 },
  { minAge: 76, maxAge: null },
];
