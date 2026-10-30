export type Jurisdiction = "federal" | "state";

export type FactSource = {
  url: string;
  publisher: string;
  jurisdiction: Jurisdiction;
};

/** Link only. No body text from the publisher is stored. */
export type FurtherReading = {
  id: string;
  url: string;
  publisher: string;
  linkOnly: true;
};

export type FactBase = {
  sources: FactSource[];
  furtherReading: FurtherReading[];
};

export type WaterFact = FactBase & {
  id: `WTR-${string}`;
  kind: "water";
  field: string;
  text: string;
};

export type CalorieSex = "female" | "male";

export type CalorieBandFact = FactBase & {
  id: `CAL-${string}`;
  kind: "calorie_band";
  ageLabel: string;
  minAge: number;
  maxAge: number | null;
  kcal: Record<CalorieSex, Record<"sedentary" | "moderate" | "active", number>>;
};

export type CalorieAdjustmentFact = FactBase & {
  id: `CAL-P${string}`;
  kind: "calorie_adjustment";
  stage: string;
  kcalPerDayChange: number;
  applicability: string;
};

export type KitFact = FactBase & {
  id: `KIT-${string}`;
  kind: "kit";
  group: "basic" | "additional";
  text: string;
};

export type TierFact = FactBase & {
  id: `TIER-${string}`;
  kind: "tier";
  tier: string;
  guidance: string;
  quantity: string;
};

export type FoodSafetyFact = FactBase & {
  id: `FS-${string}`;
  kind: "food_safety";
  text: string;
};

export type HazardPhase = "before" | "during" | "after";

export type HazardActionFact = FactBase & {
  id: `HAZ-${string}`;
  kind: "hazard_action";
  hazard: string;
  phase: HazardPhase;
  text: string;
};

export type GapFact = FactBase & {
  id: `GAP-${string}`;
  kind: "gap";
  text: string;
};

export type Fact =
  | WaterFact
  | CalorieBandFact
  | CalorieAdjustmentFact
  | KitFact
  | TierFact
  | FoodSafetyFact
  | HazardActionFact
  | GapFact;
