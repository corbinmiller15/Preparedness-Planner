/** Saved during onboarding and copied onto each plan. */
export const HOME_TYPES = [
  "apartment_renter",
  "house_owner",
  "house_renter",
  "mobile_home",
  "other",
] as const;

export type HomeType = (typeof HOME_TYPES)[number];

export const BUDGET_LEVELS = ["minimal", "moderate", "comfortable"] as const;

export type BudgetLevel = (typeof BUDGET_LEVELS)[number];

/** How much room someone has to store supplies. Not a measured square footage. */
export const STORAGE_SPACES = ["very_limited", "some", "plenty"] as const;

export type StorageSpace = (typeof STORAGE_SPACES)[number];

/**
 * A way a tier could be stocked. No source fact assigns items to these paths yet,
 * so engine items keep `budgetPath: null` and each tier still offers all three.
 */
export const BUDGET_PATHS = ["free", "low_cost", "standard"] as const;

export type BudgetPath = (typeof BUDGET_PATHS)[number];

/** Which path a plan shows first. Items are still not priced by a source fact. */
export const BUDGET_LEVEL_TO_PATH = {
  minimal: "free",
  moderate: "low_cost",
  comfortable: "standard",
} as const satisfies Record<BudgetLevel, BudgetPath>;

export const PLAN_TIERS = [
  "go_bag",
  "72_hour",
  "1_month",
  "3_month",
  "6_month",
  "12_month",
] as const;

export type PlanTier = (typeof PLAN_TIERS)[number];

export const UNIT_SYSTEMS = ["imperial", "metric"] as const;

export type UnitSystem = (typeof UNIT_SYSTEMS)[number];

/** US launch default. Callers can pass metric. */
export const DEFAULT_UNIT_SYSTEM: UnitSystem = "imperial";
