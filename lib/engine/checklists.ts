import { assumptionsForTier } from "@/lib/assumptions/assumptions";
import { FOOD_SAFETY_FACTS } from "@/lib/facts/food-safety";
import { KIT_FACTS, KIT_MAINTENANCE } from "@/lib/facts/kit";
import { TIER_DAYS, TIER_FACTS } from "@/lib/facts/tiers";
import { WATER_FACTS } from "@/lib/facts/water";
import { supplyItem } from "@/lib/engine/adaptations";
import type { AdaptationContext, SupplyItem } from "@/lib/engine/types";

export type KitResult = {
  items: SupplyItem[];
  factIds: string[];
  assumptions: ReturnType<typeof assumptionsForTier>;
  maintenance: {
    text: string;
    sourceUrls: string[];
    relatedFactIds: string[];
  };
};

/** Sourced rotation lines. Water uses the 6-month period where the sources disagree (GAP-06). */
export function planRotation(context: AdaptationContext): SupplyItem[] {
  const water = WATER_FACTS.find((fact) => fact.id === "WTR-011");
  const pantry = TIER_FACTS.find((fact) => fact.id === "TIER-ROT");
  if (!water || !pantry) throw new Error("Missing rotation facts");
  return [
    supplyItem(["WTR-011", "GAP-06"], water.text, context),
    supplyItem(["TIER-ROT"], pantry.guidance, context),
  ];
}

export function planKit(context: AdaptationContext): KitResult {
  const items = KIT_FACTS.map((fact) => supplyItem([fact.id], fact.text, context));
  return {
    items,
    factIds: items.flatMap((item) => item.factIds),
    assumptions: assumptionsForTier(TIER_DAYS[context.tier].days).filter(
      (item) => item.topic === "supplies",
    ),
    maintenance: {
      text: KIT_MAINTENANCE.text,
      sourceUrls: KIT_MAINTENANCE.sources.map((source) => source.url),
      relatedFactIds: [...KIT_MAINTENANCE.relatedFactIds],
    },
  };
}

export type FoodSafetyResult = {
  items: SupplyItem[];
  factIds: string[];
};

export function planFoodSafety(context: AdaptationContext): FoodSafetyResult {
  const items = FOOD_SAFETY_FACTS.map((fact) => supplyItem([fact.id], fact.text, context));
  return {
    items,
    factIds: items.flatMap((item) => item.factIds),
  };
}
