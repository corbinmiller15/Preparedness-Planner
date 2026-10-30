import { GALLONS_PER_PERSON_PER_DAY, HOT_CLIMATE_WATER_FACTOR } from "@/lib/facts/water";
import { TIER_DAYS } from "@/lib/facts/tiers";
import { BUDGET_PATHS, type UnitSystem } from "@/lib/onboarding/options";
import { volumeFromGallons } from "@/lib/units";
import { itemAdaptation } from "@/lib/engine/adaptations";
import type { AdaptationContext, PlanPerson, SourcedNote, WaterResult } from "@/lib/engine/types";

function hasText(value: string | null): boolean {
  return value !== null && value.trim().length > 0;
}

export function personMayNeedMoreWater(person: PlanPerson, age: number | null): boolean {
  if (person.isChild || (age !== null && age < 18)) return true;
  if (hasText(person.specialNeeds)) return true;
  const status = person.pregnancyStatus;
  return status !== null && status !== "none";
}

export function planWater(args: {
  people: PlanPerson[];
  context: AdaptationContext;
  unitSystem: UnitSystem;
  hotClimate: boolean;
  ages: Map<string, number | null>;
}): WaterResult {
  const offered: {
    budgetPath: null;
    budgetPathsOffered: typeof BUDGET_PATHS;
  } = {
    budgetPath: null,
    budgetPathsOffered: BUDGET_PATHS,
  };
  if (args.people.length === 0) {
    return {
      status: "no_source_data",
      message: { key: "engine.plan.no_people" },
      factIds: ["WTR-001"],
      gapIds: [],
      ...offered,
    };
  }

  const tierDays = TIER_DAYS[args.context.tier];
  const hotClimateFactor = args.hotClimate ? HOT_CLIMATE_WATER_FACTOR : 1;
  const applied = GALLONS_PER_PERSON_PER_DAY * hotClimateFactor;
  const totalGallons = args.people.length * applied * tierDays.days;
  const factIds = ["WTR-001", tierDays.factId];
  if (args.context.tier === "go_bag" || args.context.tier === "72_hour") {
    factIds.push("WTR-003");
  }
  if (args.hotClimate) factIds.push("WTR-008");

  const notes: SourcedNote[] = [];
  if (args.context.tier === "go_bag") {
    notes.push({
      message: { key: "engine.water.go_bag_days" },
      factIds: ["TIER-GO", "WTR-003"],
      gapIds: [],
    });
  }
  if (args.context.tier === "1_month") {
    notes.push({
      message: { key: "engine.water.month_days" },
      factIds: ["TIER-1M", "GAP-01"],
      gapIds: ["GAP-01"],
    });
  }
  if (args.hotClimate) {
    notes.push({
      message: { key: "engine.water.hot_climate" },
      factIds: ["WTR-008"],
      gapIds: [],
    });
  }
  const special = args.people.some((person) =>
    personMayNeedMoreWater(person, args.ages.get(person.id) ?? null),
  );
  if (special) {
    notes.push({
      message: { key: "engine.water.special_group" },
      factIds: ["WTR-006", "WTR-007", "GAP-03"],
      gapIds: ["GAP-03"],
    });
  }

  return {
    status: "calculated",
    people: args.people.length,
    days: tierDays.days,
    daysAreGovernmentFigure: tierDays.governmentDayCount,
    sourceGallonsPerPersonPerDay: GALLONS_PER_PERSON_PER_DAY,
    appliedGallonsPerPersonPerDay: applied,
    hotClimateFactor,
    totalGallons,
    volume: volumeFromGallons(totalGallons, args.unitSystem),
    perPersonPerDay: volumeFromGallons(applied, args.unitSystem),
    factIds,
    notes,
    ...offered,
    adaptation: itemAdaptation(["WTR-001"], args.context),
  };
}
