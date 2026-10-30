import { FOOD_SAFETY_FACTS } from "@/lib/facts/food-safety";
import { KIT_FACTS, KIT_MAINTENANCE } from "@/lib/facts/kit";
import { supplyItem } from "@/lib/engine/adaptations";
import type { AdaptationContext, SupplyItem } from "@/lib/engine/types";

export type KitResult = {
  items: SupplyItem[];
  factIds: string[];
  maintenance: {
    text: string;
    sourceUrls: string[];
    relatedFactIds: string[];
  };
};

export function planKit(context: AdaptationContext): KitResult {
  const items = KIT_FACTS.map((fact) => supplyItem([fact.id], fact.text, context));
  return {
    items,
    factIds: items.flatMap((item) => item.factIds),
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
