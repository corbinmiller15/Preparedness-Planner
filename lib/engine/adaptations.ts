import { TIER_DAYS } from "@/lib/facts/tiers";
import type { LocalMessage } from "@/lib/i18n";
import { BUDGET_PATHS, type BudgetPath, type PlanTier } from "@/lib/onboarding/options";
import type {
  AdaptationContext,
  BudgetPathOffer,
  ItemAdaptation,
  SupplyItem,
} from "@/lib/engine/types";

const storageMessage: LocalMessage = { key: "engine.adaptation.storage" };
const budgetMessage: LocalMessage = { key: "engine.adaptation.budget" };
const pathMessage: LocalMessage = { key: "engine.budget_path.unassigned" };

export function itemAdaptation(factIds: string[], context: AdaptationContext): ItemAdaptation {
  return {
    factIds,
    homeType: context.homeType,
    budgetLevel: context.budgetLevel,
    storageSpace: context.storageSpace,
    storage: {
      status: "no_source_data",
      message: storageMessage,
      factIds: [],
      gapIds: [],
      limit: null,
    },
    budgetOptions: {
      status: "no_source_data",
      message: budgetMessage,
      factIds: [],
      gapIds: [],
      options: null,
    },
  };
}

export function supplyItem(
  factIds: string[],
  text: string,
  context: AdaptationContext,
): SupplyItem {
  return {
    factIds,
    text,
    budgetPath: null,
    budgetPathsOffered: BUDGET_PATHS,
    adaptation: itemAdaptation(factIds, context),
  };
}

export function budgetPathOffers(tier: PlanTier): Record<BudgetPath, BudgetPathOffer> {
  const tierFactId = TIER_DAYS[tier].factId;
  const offers = {} as Record<BudgetPath, BudgetPathOffer>;
  for (const path of BUDGET_PATHS) {
    offers[path] = {
      tier,
      tierFactId,
      path,
      status: "no_source_data",
      message: pathMessage,
      factIds: [],
      gapIds: [],
      items: [],
    };
  }
  return offers;
}
