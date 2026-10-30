import { assumptionsForTier } from "@/lib/assumptions/assumptions";
import { budgetPathOffers } from "@/lib/engine/adaptations";
import { resolveAge } from "@/lib/engine/ages";
import { planFood } from "@/lib/engine/calories";
import { planFoodSafety, planKit, planRotation } from "@/lib/engine/checklists";
import type {
  AdaptationContext,
  FoodResult,
  PlanInput,
  SupplyItem,
  WaterResult,
} from "@/lib/engine/types";
import { planWater } from "@/lib/engine/water";
import { buildHazardModule, type HazardModuleResult } from "@/lib/hazards/module";
import { defaultHazardDependencies, type HazardDependencies } from "@/lib/hazards/defaults";
import type { BudgetPathOffer } from "@/lib/engine/types";
import type { BudgetPath } from "@/lib/onboarding/options";
import { BUDGET_LEVEL_TO_PATH, DEFAULT_UNIT_SYSTEM } from "@/lib/onboarding/options";
import { TIER_DAYS } from "@/lib/facts/tiers";
import type { KitResult, FoodSafetyResult } from "@/lib/engine/checklists";

export type PreparednessPlan = {
  context: AdaptationContext & {
    country: string;
    postalCode: string;
    unitSystem: typeof DEFAULT_UNIT_SYSTEM | "metric";
    hotClimate: boolean;
    asOf: string | null;
  };
  water: WaterResult;
  food: FoodResult;
  kit: KitResult;
  foodSafety: FoodSafetyResult;
  /** WTR-011 and TIER-ROT. Shown on every plan; they do not change gallon or calorie totals. */
  rotation: SupplyItem[];
  hazards: HazardModuleResult;
  assumptions: ReturnType<typeof assumptionsForTier>;
  defaultBudgetPath: BudgetPath;
  budgetPaths: Record<BudgetPath, BudgetPathOffer>;
};

export async function buildPreparednessPlan(
  input: PlanInput,
  deps: HazardDependencies = defaultHazardDependencies(),
): Promise<PreparednessPlan> {
  const unitSystem = input.unitSystem ?? DEFAULT_UNIT_SYSTEM;
  const context: AdaptationContext = {
    tier: input.tier,
    homeType: input.homeType,
    budgetLevel: input.budgetLevel,
    storageSpace: input.storageSpace,
  };
  const ages = new Map(
    input.people.map((person) => {
      const resolved = resolveAge(person, input.asOf);
      return [person.id, resolved.ok ? resolved.age : null] as const;
    }),
  );
  const hazards = await buildHazardModule(
    { country: input.country, postalCode: input.postalCode },
    deps,
  );
  return {
    context: {
      ...context,
      country: input.country,
      postalCode: input.postalCode,
      unitSystem,
      hotClimate: input.hotClimate ?? false,
      asOf: input.asOf ?? null,
    },
    water: planWater({
      people: input.people,
      context,
      unitSystem,
      hotClimate: input.hotClimate ?? false,
      ages,
    }),
    food: planFood({ people: input.people, context, asOf: input.asOf }),
    kit: planKit(context),
    foodSafety: planFoodSafety(context),
    rotation: planRotation(context),
    hazards,
    assumptions: assumptionsForTier(TIER_DAYS[input.tier].days),
    defaultBudgetPath: BUDGET_LEVEL_TO_PATH[input.budgetLevel],
    budgetPaths: budgetPathOffers(input.tier, input.budgetLevel),
  };
}
