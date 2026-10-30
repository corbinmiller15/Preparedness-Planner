import { CALORIE_ADJUSTMENTS, CALORIE_BANDS } from "@/lib/facts/calories";
import { FOOD_SAFETY_FACTS } from "@/lib/facts/food-safety";
import { GAP_FACTS } from "@/lib/facts/gaps";
import { HAZARD_ACTION_FACTS } from "@/lib/facts/hazards";
import { KIT_FACTS } from "@/lib/facts/kit";
import { TIER_FACTS } from "@/lib/facts/tiers";
import type { Fact } from "@/lib/facts/types";
import { WATER_FACTS } from "@/lib/facts/water";

export const ALL_FACTS: readonly Fact[] = [
  ...WATER_FACTS,
  ...CALORIE_BANDS,
  ...CALORIE_ADJUSTMENTS,
  ...KIT_FACTS,
  ...TIER_FACTS,
  ...FOOD_SAFETY_FACTS,
  ...HAZARD_ACTION_FACTS,
  ...GAP_FACTS,
];

const factsById = new Map<string, Fact>(ALL_FACTS.map((fact) => [fact.id, fact]));

export function getFact(id: string): Fact | undefined {
  return factsById.get(id);
}

export {
  ACTIVITY_DEFINITIONS,
  ACTIVITY_LEVELS,
  CALORIE_ADJUSTMENTS,
  CALORIE_BANDS,
  calorieAdjustmentForStatus,
  calorieBandForAge,
  kcalFor,
  PREGNANCY_STATUSES,
} from "@/lib/facts/calories";
export type { ActivityLevel, PregnancyStatus } from "@/lib/facts/calories";
export { FOOD_SAFETY_FACTS } from "@/lib/facts/food-safety";
export { GAP_FACTS } from "@/lib/facts/gaps";
export { HAZARD_ACTION_FACTS, HAZARD_NAMES, hazardActions } from "@/lib/facts/hazards";
export { KIT_FACTS, KIT_FURTHER_READING, KIT_MAINTENANCE } from "@/lib/facts/kit";
export { FURTHER_READING, SOURCES } from "@/lib/facts/sources";
export { TIER_DAYS, TIER_FACTS, tierFact } from "@/lib/facts/tiers";
export {
  GALLONS_PER_PERSON_PER_DAY,
  HOT_CLIMATE_WATER_FACTOR,
  WATER_FACTS,
} from "@/lib/facts/water";
export type {
  CalorieAdjustmentFact,
  CalorieBandFact,
  Fact,
  FactSource,
  FoodSafetyFact,
  FurtherReading,
  GapFact,
  HazardActionFact,
  HazardPhase,
  KitFact,
  TierFact,
  WaterFact,
} from "@/lib/facts/types";
