import { describe, expect, it } from "vitest";
import { buildPreparednessPlan, parseIsoDate, resolveAge, type PlanPerson } from "@/lib/engine";
import { CALORIE_BANDS, kcalFor, type ActivityLevel } from "@/lib/facts/calories";
import type { CalorieSex } from "@/lib/facts/types";
import { translate } from "@/lib/i18n";

function sheetKcal(age: number, sex: CalorieSex, activity: ActivityLevel): number {
  const band = CALORIE_BANDS.find(
    (item) => age >= item.minAge && (item.maxAge === null || age <= item.maxAge),
  );
  if (!band) throw new Error(`No calorie band for age ${age}`);
  return kcalFor(band, sex, activity);
}

function person(overrides: Partial<PlanPerson> = {}): PlanPerson {
  return {
    id: "alex",
    label: "Alex",
    age: null,
    birthYear: 2000,
    birthMonth: null,
    birthDay: null,
    sex: "male",
    pregnancyStatus: null,
    isChild: false,
    specialNeeds: null,
    activityLevel: "moderate",
    ...overrides,
  };
}

describe("calendar dates and exact age", () => {
  it("rejects impossible dates", () => {
    expect(parseIsoDate("2026-02-31")).toBeNull();
    expect(parseIsoDate("2026-04-31")).toBeNull();
    expect(parseIsoDate("2026-02-29")).toBeNull();
    expect(parseIsoDate("1900-02-29")).toBeNull();
    expect(parseIsoDate("2026-13-01")).toBeNull();
    expect(parseIsoDate("2026-00-10")).toBeNull();
    expect(parseIsoDate("2026-01-00")).toBeNull();
    expect(parseIsoDate("2024-02-29")).toEqual({ year: 2024, month: 2, day: 29 });
    expect(parseIsoDate("2000-02-29")).toEqual({ year: 2000, month: 2, day: 29 });

    expect(resolveAge(person(), "2026-02-31")).toEqual({
      ok: false,
      message: { key: "engine.food.invalid_age" },
    });
    expect(resolveAge(person(), "2026-04-31")).toEqual({
      ok: false,
      message: { key: "engine.food.invalid_age" },
    });
    expect(
      resolveAge(person({ birthYear: 2026, birthMonth: 2, birthDay: 31 }), "2026-10-30"),
    ).toEqual({ ok: false, message: { key: "engine.food.invalid_age" } });
  });

  it("uses the full birth date, so a 22-month-old is under 2", () => {
    const bornDecember = resolveAge(
      person({ birthYear: 2024, birthMonth: 12, birthDay: 15 }),
      "2026-10-30",
    );
    expect(bornDecember).toEqual({ ok: true, age: 1, exact: true });

    const monthOnly = resolveAge(person({ birthYear: 2024, birthMonth: 12 }), "2026-10-30");
    expect(monthOnly).toEqual({ ok: true, age: 1, exact: true });

    const turnedTwo = resolveAge(
      person({ birthYear: 2024, birthMonth: 12, birthDay: 15 }),
      "2026-12-15",
    );
    expect(turnedTwo).toEqual({ ok: true, age: 2, exact: true });
  });

  it("uses the higher calorie cell when the birthday is unknown, and withholds ages under 2", () => {
    expect(resolveAge(person({ birthYear: 2025 }), "2026-10-30")).toEqual({
      ok: false,
      message: { key: "engine.food.under_two" },
    });
    expect(resolveAge(person({ birthYear: 2024 }), "2026-01-15")).toEqual({
      ok: true,
      age: 2,
      exact: false,
      message: { key: "engine.food.age_not_exact" },
    });
    expect(resolveAge(person({ birthYear: 2000 }), "2026-10-30")).toEqual({
      ok: true,
      age: 25,
      exact: false,
      message: { key: "engine.food.age_not_exact" },
    });
    expect(translate({ key: "engine.food.age_not_exact" })).toContain(
      "add a full birth date for exact numbers",
    );
    expect(resolveAge(person({ birthYear: 2000, birthMonth: 1 }), "2026-10-30")).toEqual({
      ok: true,
      age: 26,
      exact: true,
    });
    expect(
      resolveAge(person({ birthYear: 2000, birthMonth: 11, birthDay: 1 }), "2026-10-30"),
    ).toEqual({ ok: true, age: 25, exact: true });
    expect(resolveAge(person({ birthYear: 2000, birthMonth: 10 }), "2026-10-15")).toEqual({
      ok: true,
      age: 25,
      exact: false,
      message: { key: "engine.food.age_not_exact" },
    });
    expect(resolveAge(person({ birthYear: 2000, birthMonth: 10 }), "2026-10-31")).toEqual({
      ok: true,
      age: 26,
      exact: true,
    });
    expect(resolveAge(person({ birthYear: 2000 }), "2026-12-31")).toEqual({
      ok: true,
      age: 26,
      exact: true,
    });
  });

  it("uses the higher calorie cell for a birth month when the day is still unknown", () => {
    expect(
      resolveAge(
        person({ birthYear: 2007, birthMonth: 10, sex: "male", activityLevel: "sedentary" }),
        "2026-10-15",
      ),
    ).toEqual({
      ok: true,
      age: 19,
      exact: false,
      message: { key: "engine.food.age_not_exact" },
    });
    expect(
      resolveAge(
        person({ birthYear: 2014, birthMonth: 10, sex: "male", activityLevel: "moderate" }),
        "2026-10-15",
      ),
    ).toEqual({
      ok: true,
      age: 12,
      exact: false,
      message: { key: "engine.food.age_not_exact" },
    });
  });

  it("uses the higher calorie cell for every inexact age, including children", () => {
    const asOf = "2026-10-30";
    expect(
      resolveAge(person({ birthYear: 2011, sex: "male", activityLevel: "moderate" }), asOf),
    ).toEqual({
      ok: true,
      age: 15,
      exact: false,
      message: { key: "engine.food.age_not_exact" },
    });
    expect(
      resolveAge(person({ birthYear: 2007, sex: "male", activityLevel: "active" }), asOf),
    ).toEqual({
      ok: true,
      age: 18,
      exact: false,
      message: { key: "engine.food.age_not_exact" },
    });
    expect(
      resolveAge(person({ birthYear: 2015, sex: "male", activityLevel: "moderate" }), asOf),
    ).toEqual({
      ok: true,
      age: 11,
      exact: false,
      message: { key: "engine.food.age_not_exact" },
    });
    expect(
      resolveAge(
        person({
          birthYear: 2007,
          birthMonth: 1,
          birthDay: 15,
          sex: "male",
          activityLevel: "active",
        }),
        asOf,
      ),
    ).toEqual({ ok: true, age: 19, exact: true });
  });

  it("leaves a December 2024 child out of the calorie total", async () => {
    const plan = await buildPreparednessPlan({
      country: "US",
      postalCode: "70112",
      tier: "72_hour",
      people: [
        person({ id: "adult", age: 30, birthYear: null, sex: "female" }),
        person({
          id: "toddler",
          label: "Toddler",
          birthYear: 2024,
          birthMonth: 12,
          birthDay: 15,
          isChild: true,
          sex: "male",
          activityLevel: "sedentary",
        }),
      ],
      homeType: "house_renter",
      budgetLevel: "moderate",
      storageSpace: "some",
      asOf: "2026-10-30",
    });
    expect(plan.food.status).toBe("partial");
    if (plan.food.status !== "partial") return;
    expect(plan.food.dailyKcal).toBe(2000);
    expect(plan.food.members.find((member) => member.personId === "toddler")).toMatchObject({
      status: "no_source_data",
      message: { key: "engine.food.under_two" },
      gapIds: ["GAP-02"],
    });
  });

  it("uses the higher calorie cell for every child pair where the older age needs more", async () => {
    const sexes: CalorieSex[] = ["male", "female"];
    const activities: ActivityLevel[] = ["sedentary", "moderate", "active"];
    const rising: Array<{
      lower: number;
      higher: number;
      sex: CalorieSex;
      activity: ActivityLevel;
      kcal: number;
      birthYear: number;
    }> = [];
    for (let lower = 2; lower <= 11; lower += 1) {
      for (const sex of sexes) {
        for (const activity of activities) {
          const younger = sheetKcal(lower, sex, activity);
          const older = sheetKcal(lower + 1, sex, activity);
          if (older > younger) {
            rising.push({
              lower,
              higher: lower + 1,
              sex,
              activity,
              kcal: older,
              birthYear: 2026 - (lower + 1),
            });
          }
        }
      }
    }
    expect(rising).toHaveLength(28);
    expect(rising).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sex: "male",
          activity: "moderate",
          lower: 11,
          higher: 12,
          kcal: 2200,
          birthYear: 2014,
        }),
        expect.objectContaining({
          sex: "female",
          activity: "active",
          lower: 2,
          higher: 3,
          kcal: 1400,
        }),
        expect.objectContaining({
          sex: "male",
          activity: "sedentary",
          lower: 10,
          higher: 11,
          kcal: 1800,
        }),
      ]),
    );
    for (const row of rising) {
      const label = `${row.sex} ${row.activity} ${row.lower}/${row.higher}`;
      const resolved = resolveAge(
        person({
          birthYear: row.birthYear,
          sex: row.sex,
          activityLevel: row.activity,
        }),
        "2026-10-30",
      );
      expect(resolved, label).toEqual({
        ok: true,
        age: row.higher,
        exact: false,
        message: { key: "engine.food.age_not_exact" },
      });
      const plan = await buildPreparednessPlan({
        country: "US",
        postalCode: "70112",
        tier: "72_hour",
        people: [
          person({
            age: null,
            birthYear: row.birthYear,
            sex: row.sex,
            activityLevel: row.activity,
          }),
        ],
        homeType: "house_renter",
        budgetLevel: "moderate",
        storageSpace: "some",
        asOf: "2026-10-30",
      });
      expect(plan.hasApproximateAges, label).toBe(true);
      expect(plan.food.status === "calculated" && plan.food.dailyKcal, label).toBe(row.kcal);
    }
  });
});
