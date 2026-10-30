import type { LocalMessage } from "@/lib/i18n";
import type { PlanPerson } from "@/lib/engine/types";

export function ageFromBirthYear(birthYear: number, asOf: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(asOf);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  if (!Number.isInteger(birthYear) || birthYear > year) return null;
  return year - birthYear;
}

export function resolveAge(
  person: PlanPerson,
  asOf: string | undefined,
): { ok: true; age: number } | { ok: false; message: LocalMessage } {
  if (person.age !== null) {
    if (!Number.isInteger(person.age) || person.age < 0 || person.age > 130) {
      return { ok: false, message: { key: "engine.food.invalid_age" } };
    }
    return { ok: true, age: person.age };
  }
  if (person.birthYear === null) {
    return { ok: false, message: { key: "engine.food.missing_age" } };
  }
  if (!asOf) {
    return { ok: false, message: { key: "engine.food.missing_as_of" } };
  }
  const age = ageFromBirthYear(person.birthYear, asOf);
  if (age === null || age > 130) {
    return { ok: false, message: { key: "engine.food.invalid_age" } };
  }
  return { ok: true, age };
}
