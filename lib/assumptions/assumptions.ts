/**
 * Review this file when the planner goes past published supply windows.
 * These sentences are shown to people. They are not source facts and must not
 * state a gallon, calorie, or item count for the part of a tier the sources do not cover.
 */

/** Two weeks. WTR-004 asks for a 2-week supply where possible. WTR-005 states 14 gallons per person. */
export const SOURCED_DURATION_DAYS = 14;

export const ASSUMPTIONS = [
  {
    id: "ASM-WTR-REMAINDER",
    kind: "assumption",
    topic: "water",
    label: "Store 2 weeks of water, then treat the rest",
    explanation:
      "Store the 2-week amount shown in the sourced water figure. For the rest of this tier, treat water you can get: a rolling boil for 1 minute, or unscented household bleach as described in the water guidance. This planner does not cite a stored-water total for that remainder.",
  },
  {
    id: "ASM-SUPPLIES-REMAINDER",
    kind: "assumption",
    topic: "supplies",
    label: "Non-food supplies past two weeks",
    explanation:
      "The checklist is a several-day kit. These sources do not publish quantities of batteries, medicine, hygiene items, or other non-food supplies past about two weeks. Extra non-food supplies for the rest of the tier are an assumption, not a cited amount.",
  },
] as const;

export type Assumption = (typeof ASSUMPTIONS)[number];

export function assumptionsForTier(tierDays: number): Assumption[] {
  if (tierDays <= SOURCED_DURATION_DAYS) return [];
  return [...ASSUMPTIONS];
}
