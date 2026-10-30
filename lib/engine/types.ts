import type { LocalMessage } from "@/lib/i18n";
import type {
  BudgetLevel,
  BudgetPath,
  HomeType,
  PlanTier,
  StorageSpace,
  UnitSystem,
} from "@/lib/onboarding/options";
import type { Assumption } from "@/lib/assumptions/assumptions";
import type { Volume } from "@/lib/units";
import type { ActivityLevel, PregnancyStatus } from "@/lib/facts/calories";

export type { ActivityLevel, PregnancyStatus };

export type PlanPerson = {
  id: string;
  label: string;
  age: number | null;
  birthYear: number | null;
  /**
   * 1–12. With `birthYear`, completed age is exact except during the birth month,
   * when `birthDay` is also required.
   */
  birthMonth: number | null;
  /** Day of the month. With `birthYear` and `birthMonth`, completed age is exact. */
  birthDay: number | null;
  sex: "female" | "male" | "unspecified" | null;
  pregnancyStatus: PregnancyStatus | null;
  isChild: boolean;
  specialNeeds: string | null;
  activityLevel: ActivityLevel | null;
};

export type PlanInput = {
  country: string;
  postalCode: string;
  tier: PlanTier;
  people: PlanPerson[];
  homeType: HomeType;
  budgetLevel: BudgetLevel;
  storageSpace: StorageSpace;
  unitSystem?: UnitSystem;
  hotClimate?: boolean;
  /** ISO date `YYYY-MM-DD`, required when a person has a birth year and no age. */
  asOf?: string;
};

export type AdaptationContext = {
  tier: PlanTier;
  homeType: HomeType;
  budgetLevel: BudgetLevel;
  storageSpace: StorageSpace;
};

export type SourcedNote = {
  message: LocalMessage;
  factIds: string[];
  gapIds: string[];
};

export type NoSourceData = {
  status: "no_source_data";
  message: LocalMessage;
  factIds: string[];
  gapIds: string[];
};

export type ItemAdaptation = {
  factIds: string[];
  homeType: HomeType;
  budgetLevel: BudgetLevel;
  storageSpace: StorageSpace;
  storage: NoSourceData & { limit: null };
  budgetOptions: NoSourceData & { options: null };
};

/** A checklist or safety line. `budgetPath` stays null until a fact assigns one. */
export type SupplyItem = {
  kind: "sourced";
  factIds: string[];
  text: string;
  budgetPath: null;
  budgetPathsOffered: readonly BudgetPath[];
  adaptation: ItemAdaptation;
};

export type BudgetPathOffer = {
  tier: PlanTier;
  /** Fact for the tier this offer belongs to. It does not define a price. */
  tierFactId: string;
  path: BudgetPath;
  /** True for the path selected from the person's budget level. */
  isDefault: boolean;
  status: "no_source_data";
  message: LocalMessage;
  factIds: string[];
  gapIds: string[];
  items: SupplyItem[];
};

export type WaterResult =
  | (NoSourceData & {
      status: "no_source_data";
      budgetPath: null;
      budgetPathsOffered: readonly BudgetPath[];
    })
  | {
      status: "calculated";
      kind: "sourced";
      people: number;
      /** Days multiplied into the gallon total. Capped at the sourced window. */
      days: number;
      /** Full tier length, including days past the sourced water window. */
      tierDays: number;
      daysAreGovernmentFigure: boolean;
      sourceGallonsPerPersonPerDay: 1;
      appliedGallonsPerPersonPerDay: number;
      hotClimateFactor: 1 | 2;
      totalGallons: number;
      volume: Volume;
      perPersonPerDay: Volume;
      factIds: string[];
      notes: SourcedNote[];
      assumptions: Assumption[];
      budgetPath: null;
      budgetPathsOffered: readonly BudgetPath[];
      adaptation: ItemAdaptation;
    };

export type MemberCalories =
  | {
      status: "calculated";
      personId: string;
      label: string;
      age: number;
      dailyKcal: number;
      tierKcal: number;
      days: number;
      bandId: string;
      activityLevel: ActivityLevel;
      activityDefinition: string;
      adjustmentIds: string[];
      factIds: string[];
      notes: SourcedNote[];
    }
  | {
      status: "partial";
      personId: string;
      label: string;
      age: number;
      dailyKcal: number;
      tierKcal: number;
      days: number;
      bandId: string;
      activityLevel: ActivityLevel;
      activityDefinition: string;
      factIds: string[];
      notes: SourcedNote[];
      unapplied: NoSourceData;
    }
  | (NoSourceData & {
      personId: string;
      label: string;
    });

export type FoodResult =
  | (NoSourceData & {
      peopleNotEvaluated: string[];
      members?: MemberCalories[];
      budgetPath: null;
      budgetPathsOffered: readonly BudgetPath[];
    })
  | {
      status: "calculated" | "partial";
      kind: "sourced";
      method: "calorie_method";
      days: number;
      daysAreGovernmentFigure: boolean;
      dailyKcal: number;
      tierKcal: number;
      factIds: string[];
      members: MemberCalories[];
      excludedPersonIds: string[];
      limitations: SourcedNote[];
      governmentMassQuantity: NoSourceData;
      budgetPath: null;
      budgetPathsOffered: readonly BudgetPath[];
      adaptation: ItemAdaptation;
    };
