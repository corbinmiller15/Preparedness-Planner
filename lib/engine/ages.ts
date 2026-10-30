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

const notExact: { ok: false; message: LocalMessage } = {
  ok: false,
  message: { key: "engine.food.age_not_exact" },
};

function acceptAge(age: number): { ok: true; age: number } | { ok: false; message: LocalMessage } {
  if (!Number.isInteger(age) || age < 0 || age > 130) return invalidAge;
  return { ok: true, age };
}

/**
 * A birth year spans two completed ages until the birthday is known.
 * If either possible age is under 2, withhold the calorie row instead of
 * assigning the age-2 figure.
 */
function fromRange(
  minAge: number,
  maxAge: number,
): { ok: true; age: number } | { ok: false; message: LocalMessage } {
  if (maxAge < 0 || minAge > 130) return invalidAge;
  if (maxAge < 2 || minAge < 2) return underTwo;
  return notExact;
}

/**
 * Completed age from a birth year alone.
 * A year is not an exact age, so this returns a number only on 31 December,
 * when every birthday in that year has already happened. Impossible dates return null.
 */
export function ageFromBirthYear(birthYear: number, asOf: string): number | null {
  const date = parseIsoDate(asOf);
  if (!date || !Number.isInteger(birthYear) || birthYear > date.year || birthYear < 1) return null;
  if (date.month !== 12 || date.day !== 31) return null;
  const age = date.year - birthYear;
  if (age < 0 || age > 130) return null;
  return age;
}

export function resolveAge(
  person: PlanPerson,
  asOf: string | undefined,
): { ok: true; age: number } | { ok: false; message: LocalMessage } {
  if (person.age !== null) {
    if (!Number.isInteger(person.age) || person.age < 0 || person.age > 130) return invalidAge;
    return { ok: true, age: person.age };
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
    return fromRange(yearDiff - 1, yearDiff);
  }
  if (date.month === 12 && date.day === 31) return acceptAge(yearDiff);
  return fromRange(yearDiff - 1, yearDiff);
}
