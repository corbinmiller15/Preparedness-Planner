import {
  ACTIVITY_DEFINITIONS,
  calorieAdjustmentForStatus,
  calorieBandForAge,
  kcalFor,
  type PregnancyStatus,
} from "@/lib/facts/calories";
import { TIER_DAYS } from "@/lib/facts/tiers";
import { BUDGET_PATHS } from "@/lib/onboarding/options";
import { resolveAge } from "@/lib/engine/ages";
import { itemAdaptation } from "@/lib/engine/adaptations";
import type {
  AdaptationContext,
  FoodResult,
  MemberCalories,
  NoSourceData,
  PlanPerson,
  SourcedNote,
} from "@/lib/engine/types";

const offered: {
  budgetPath: null;
  budgetPathsOffered: typeof BUDGET_PATHS;
} = {
  budgetPath: null,
  budgetPathsOffered: BUDGET_PATHS,
};

function massGap(tier: AdaptationContext["tier"], factId: string): NoSourceData {
  if (tier === "go_bag") {
    return {
      status: "no_source_data",
      message: { key: "engine.food.pounds_not_given" },
      factIds: ["GAP-04", factId],
      gapIds: ["GAP-04"],
    };
  }
  if (tier === "72_hour") {
    return {
      status: "no_source_data",
      message: { key: "engine.food.pounds_not_given" },
      factIds: [factId],
      gapIds: [],
    };
  }
  return {
    status: "no_source_data",
    message: { key: "engine.food.month_mass" },
    factIds: ["GAP-01", factId],
    gapIds: ["GAP-01"],
  };
}

function memberBase(person: PlanPerson): { personId: string; label: string } {
  return { personId: person.id, label: person.label };
}

function unspecifiedStage(status: PregnancyStatus): NoSourceData | null {
  if (status === "pregnant_unspecified") {
    return {
      status: "no_source_data",
      message: { key: "engine.food.pregnancy_stage" },
      factIds: ["CAL-P01", "CAL-P02", "CAL-P03"],
      gapIds: [],
    };
  }
  if (status === "breastfeeding_unspecified") {
    return {
      status: "no_source_data",
      message: { key: "engine.food.breastfeeding_stage" },
      factIds: ["CAL-P04", "CAL-P05"],
      gapIds: [],
    };
  }
  return null;
}

export function planFood(args: {
  people: PlanPerson[];
  context: AdaptationContext;
  asOf: string | undefined;
}): FoodResult {
  const tierDays = TIER_DAYS[args.context.tier];
  if (args.people.length === 0) {
    return {
      status: "no_source_data",
      message: { key: "engine.plan.no_people" },
      factIds: [],
      gapIds: [],
      peopleNotEvaluated: [],
      ...offered,
    };
  }

  const members = args.people.map((person) => memberCalories(person, tierDays.days, args.asOf));
  const counted = members.filter(
    (member): member is Exclude<MemberCalories, { status: "no_source_data" }> =>
      member.status !== "no_source_data",
  );
  const limitations: SourcedNote[] = [
    {
      message: { key: "engine.food.table_edition" },
      factIds: ["GAP-02"],
      gapIds: ["GAP-02"],
    },
  ];
  const governmentMassQuantity: NoSourceData = massGap(args.context.tier, tierDays.factId);

  if (counted.length === 0) {
    return {
      status: "no_source_data",
      message: { key: "engine.food.incomplete_household" },
      factIds: ["GAP-02", tierDays.factId],
      gapIds: ["GAP-02"],
      peopleNotEvaluated: args.people.map((person) => person.id),
      members,
      ...offered,
    };
  }

  const dailyKcal = counted.reduce((sum, member) => sum + member.dailyKcal, 0);
  const factIds = new Set<string>([tierDays.factId, "GAP-02"]);
  for (const member of members) {
    for (const id of member.factIds) factIds.add(id);
  }
  if (args.context.tier === "go_bag") factIds.add("GAP-04");
  if (args.context.tier !== "go_bag" && args.context.tier !== "72_hour") factIds.add("GAP-01");
  const excludedPersonIds = members
    .filter((member) => member.status === "no_source_data")
    .map((member) => member.personId);
  const partial =
    excludedPersonIds.length > 0 || members.some((member) => member.status === "partial");

  return {
    status: partial ? "partial" : "calculated",
    kind: "sourced",
    method: "calorie_method",
    days: tierDays.days,
    daysAreGovernmentFigure: tierDays.governmentDayCount,
    dailyKcal,
    tierKcal: dailyKcal * tierDays.days,
    factIds: [...factIds],
    members,
    excludedPersonIds,
    limitations,
    governmentMassQuantity,
    ...offered,
    adaptation: itemAdaptation([tierDays.factId], args.context),
  };
}

function memberCalories(
  person: PlanPerson,
  days: number,
  asOf: string | undefined,
): MemberCalories {
  const base = memberBase(person);
  const ageResult = resolveAge(person, asOf);
  if (!ageResult.ok) {
    const underTwo = ageResult.message.key === "engine.food.under_two";
    return {
      ...base,
      status: "no_source_data",
      message: ageResult.message,
      factIds: underTwo ? ["GAP-02"] : [],
      gapIds: underTwo ? ["GAP-02"] : [],
    };
  }
  if (ageResult.age < 2) {
    return {
      ...base,
      status: "no_source_data",
      message: { key: "engine.food.under_two" },
      factIds: ["GAP-02"],
      gapIds: ["GAP-02"],
    };
  }
  const status = person.pregnancyStatus;
  if (person.sex === "male" && status && status !== "none") {
    return {
      ...base,
      status: "no_source_data",
      message: { key: "engine.food.inconsistent_pregnancy" },
      factIds: [],
      gapIds: [],
    };
  }
  if (person.sex !== "female" && person.sex !== "male") {
    return {
      ...base,
      status: "no_source_data",
      message: { key: "engine.food.missing_sex" },
      factIds: [],
      gapIds: [],
    };
  }
  if (!person.activityLevel) {
    return {
      ...base,
      status: "no_source_data",
      message: { key: "engine.food.missing_activity" },
      factIds: [],
      gapIds: [],
    };
  }

  const band = calorieBandForAge(ageResult.age);
  if (!band) {
    return {
      ...base,
      status: "no_source_data",
      message: { key: "engine.food.invalid_age" },
      factIds: ["GAP-02"],
      gapIds: ["GAP-02"],
    };
  }

  const dailyBase = kcalFor(band, person.sex, person.activityLevel);
  const notes: SourcedNote[] = [
    {
      message: { key: "engine.food.table_edition" },
      factIds: ["GAP-02", band.id],
      gapIds: ["GAP-02"],
    },
  ];
  if (!ageResult.exact) {
    notes.push({
      message: ageResult.message,
      factIds: [],
      gapIds: [],
    });
  }
  const activity = {
    activityLevel: person.activityLevel,
    activityDefinition: ACTIVITY_DEFINITIONS[person.activityLevel],
  };
  const unapplied = status ? unspecifiedStage(status) : null;
  if (unapplied) {
    return {
      ...base,
      status: "partial",
      age: ageResult.age,
      ageExact: ageResult.exact,
      dailyKcal: dailyBase,
      tierKcal: dailyBase * days,
      days,
      bandId: band.id,
      ...activity,
      factIds: [band.id, ...unapplied.factIds, "GAP-02"],
      notes,
      unapplied,
    };
  }

  const adjustment =
    person.sex === "female" && status && status !== "none"
      ? calorieAdjustmentForStatus(status)
      : undefined;
  const adjustmentIds = adjustment ? [adjustment.id] : [];
  if (adjustment) {
    notes.push({
      message: { key: "engine.food.adjustment_scope" },
      factIds: [adjustment.id],
      gapIds: [],
    });
  }
  const dailyKcal = dailyBase + (adjustment?.kcalPerDayChange ?? 0);
  return {
    ...base,
    status: "calculated",
    age: ageResult.age,
    ageExact: ageResult.exact,
    dailyKcal,
    tierKcal: dailyKcal * days,
    days,
    bandId: band.id,
    ...activity,
    adjustmentIds,
    factIds: [band.id, ...adjustmentIds],
    notes,
  };
}
