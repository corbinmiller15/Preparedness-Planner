import { FURTHER_READING, SOURCES } from "@/lib/facts/sources";
import type { PlanTier } from "@/lib/onboarding/options";
import type { TierFact } from "@/lib/facts/types";

export const TIER_FACTS = [
  {
    id: "TIER-GO",
    kind: "tier",
    tier: "Go-bag",
    guidance:
      "Ready.gov mentions a go bag (hurricane, wildfire pages) and a work kit for at least 24 hours",
    quantity: "No government food quantity found",
    sources: [SOURCES.readyKit],
    furtherReading: [],
  },
  {
    id: "TIER-72H",
    kind: "tier",
    tier: "72-hour kit",
    guidance:
      "CDC: 3-day water. Ready.gov: several-day supply. Be Ready Utah: 3 days, ideally up to 5",
    quantity: "Calories: no pounds given; use the calorie method",
    sources: [SOURCES.cdcWater, SOURCES.bruKit],
    furtherReading: [FURTHER_READING.redCrossKit],
  },
  {
    id: "TIER-1M",
    kind: "tier",
    tier: "1 month",
    guidance: "Be Ready Utah: minimum 1-month food supply at home",
    quantity: "No federal quantity found",
    sources: [SOURCES.bruFood],
    furtherReading: [FURTHER_READING.churchLongTerm],
  },
  {
    id: "TIER-3M",
    kind: "tier",
    tier: "3 months",
    guidance: "Be Ready Utah: work toward a 3-month supply",
    quantity: "No federal quantity found",
    sources: [SOURCES.bruFood],
    furtherReading: [FURTHER_READING.churchFaq],
  },
  {
    id: "TIER-6M",
    kind: "tier",
    tier: "6 months",
    guidance: "Be Ready Utah: 6 months to a year or longer is recommended, without going into debt",
    quantity: "No quantity found",
    sources: [SOURCES.bruFood],
    furtherReading: [],
  },
  {
    id: "TIER-12M",
    kind: "tier",
    tier: "12 months",
    guidance: "Be Ready Utah: storing a year for the household is a bonus goal",
    quantity:
      "No government quantity found. Pound-based lists exist only in BYU/USU and Church materials (link only)",
    sources: [SOURCES.bruFood],
    furtherReading: [FURTHER_READING.byuFoodStorage, FURTHER_READING.usuBooklet],
  },
  {
    id: "TIER-ROT",
    kind: "tier",
    tier: "Rotating pantry",
    guidance:
      "Be Ready Utah: maintain a rotation system; eat what you store; cool, dark, dry at 40 to 70 °F. Ready.gov: replace expired items, re-check needs yearly",
    quantity: "Not applicable",
    sources: [SOURCES.bruFood, SOURCES.readyKit],
    furtherReading: [FURTHER_READING.churchFaq],
  },
] as const satisfies readonly TierFact[];

/**
 * Day counts used by the planner.
 * 72-hour is the CDC 3-day supply. Go-bag water stays at that same 3 days.
 * 30, 90, 180, and 365 are planner definitions for the month tiers named by
 * the TIER- facts. Those facts do not print a day count.
 */
export const TIER_DAYS = {
  go_bag: { days: 3, factId: "TIER-GO", governmentDayCount: false },
  "72_hour": { days: 3, factId: "TIER-72H", governmentDayCount: true },
  "1_month": { days: 30, factId: "TIER-1M", governmentDayCount: false },
  "3_month": { days: 90, factId: "TIER-3M", governmentDayCount: false },
  "6_month": { days: 180, factId: "TIER-6M", governmentDayCount: false },
  "12_month": { days: 365, factId: "TIER-12M", governmentDayCount: false },
} as const satisfies Record<
  PlanTier,
  { days: number; factId: TierFact["id"]; governmentDayCount: boolean }
>;

export function tierFact(id: TierFact["id"]): TierFact {
  const fact = TIER_FACTS.find((item) => item.id === id);
  if (!fact) throw new Error(`Missing tier fact ${id}`);
  return fact;
}
