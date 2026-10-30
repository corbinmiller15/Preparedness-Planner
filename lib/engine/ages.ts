import { calorieBandForAge, kcalFor } from "@/lib/facts/calories";
import type { LocalMessage } from "@/lib/i18n";
import type { PlanPerson } from "@/lib/engine/types";

export type CalendarDate = {
  year: number;
  month: number;
  day: number;
};

const MONTH_LENGTHS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] as const;

export function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

export function daysInMonth(year: number, month: number): number {
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) return 0;
  if (month === 2 && isLeapYear(year)) return 29;
  return MONTH_LENGTHS[month - 1] ?? 0;
}

/** True only for a real calendar day. 2026-02-31 and 2026-04-31 are false. */
export function isRealCalendarDate(year: number, month: number, day: number): boolean {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return false;
  if (year < 1 || year > 9999) return false;
  return day >= 1 && day <= daysInMonth(year, month);
}

export function parseIsoDate(value: string): CalendarDate | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!isRealCalendarDate(year, month, day)) return null;
  return { year, month, day };
}

/** Completed years. The birthday counts on the birth month and day. */
export function completedAge(birth: CalendarDate, asOf: CalendarDate): number {
  let age = asOf.year - birth.year;
  const beforeBirthday =
    asOf.month < birth.month || (asOf.month === birth.month && asOf.day < birth.day);
  if (beforeBirthday) age -= 1;
  return age;
}

const invalidAge: { ok: false; message: LocalMessage } = {
  ok: false,
  message: { key: "engine.food.invalid_age" },
};

const underTwo: { ok: false; message: LocalMessage } = {
  ok: false,
  message: { key: "engine.food.under_two" },
};

const approximate: LocalMessage = { key: "engine.food.age_not_exact" };

export type ResolvedAge =
  | { ok: true; age: number; exact: true }
  | { ok: true; age: number; exact: false; message: LocalMessage }
  | { ok: false; message: LocalMessage };

function acceptAge(age: number): ResolvedAge {
  if (!Number.isInteger(age) || age < 0 || age > 130) return invalidAge;
  return { ok: true, age, exact: true };
}

/**
 * Two possible completed ages, one year apart, until the birthday is known.
 * Calories use the larger USDA cell. Equal cells keep the younger age.
 * If the pair is 1 and 2, the age-2 cell is used and flagged not exact.
 * If both ages are under 2, there is no calorie row.
 * A known birthday, a birth month that has already passed, and 31 December
 * (every birthday that year has passed) stay exact and do not use this helper.
 */
function ageWithHigherCalorieBand(lower: number, higher: number, person: PlanPerson): number {
  const sex = person.sex;
  const activity = person.activityLevel;
  if ((sex !== "female" && sex !== "male") || !activity) return lower;
  const lowerBand = calorieBandForAge(lower);
  const higherBand = calorieBandForAge(higher);
  if (!lowerBand || !higherBand) return lower;
  return kcalFor(higherBand, sex, activity) > kcalFor(lowerBand, sex, activity) ? higher : lower;
}

function ambiguousAge(person: PlanPerson, yearDiff: number): ResolvedAge {
  const lower = Math.max(0, yearDiff - 1);
  const higher = yearDiff;
  if (higher < 2) return underTwo;
  if (lower < 2) return { ok: true, age: 2, exact: false, message: approximate };
  if (lower > 130) return invalidAge;
  const age = ageWithHigherCalorieBand(lower, higher, person);
  if (age > 130) return invalidAge;
  return { ok: true, age, exact: false, message: approximate };
}

export function resolveAge(person: PlanPerson, asOf: string | undefined): ResolvedAge {
  if (person.age !== null) {
    if (!Number.isInteger(person.age) || person.age < 0 || person.age > 130) return invalidAge;
    return { ok: true, age: person.age, exact: true };
  }
  if (person.birthYear === null) {
    return { ok: false, message: { key: "engine.food.missing_age" } };
  }
  if (!asOf) {
    return { ok: false, message: { key: "engine.food.missing_as_of" } };
  }
  const date = parseIsoDate(asOf);
  if (!date) return invalidAge;

  const birthYear = person.birthYear;
  if (!Number.isInteger(birthYear) || birthYear < 1 || birthYear > date.year) return invalidAge;

  const month = person.birthMonth;
  const day = person.birthDay;
  if (month !== null && (!Number.isInteger(month) || month < 1 || month > 12)) return invalidAge;
  if (day !== null && month === null) return invalidAge;
  if (day !== null && month !== null && !isRealCalendarDate(birthYear, month, day))
    return invalidAge;

  const yearDiff = date.year - birthYear;
  if (month !== null && day !== null) {
    return acceptAge(completedAge({ year: birthYear, month, day }, date));
  }
  if (month !== null) {
    if (date.month !== month) {
      return acceptAge(date.month > month ? yearDiff : yearDiff - 1);
    }
    if (date.day === daysInMonth(date.year, date.month)) return acceptAge(yearDiff);
    return ambiguousAge(person, yearDiff);
  }
  if (date.month === 12 && date.day === 31) return acceptAge(yearDiff);
  return ambiguousAge(person, yearDiff);
}
