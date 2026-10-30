import { describe, expect, it } from "vitest";
import { buildPreparednessPlan, type PlanInput, type PlanPerson } from "@/lib/engine";
import { SOURCED_DURATION_DAYS } from "@/lib/assumptions/assumptions";
import { getFact, TIER_FACTS, WATER_FACTS } from "@/lib/facts";
import { translate } from "@/lib/i18n";
import { TIER_DAYS } from "@/lib/facts/tiers";
import type { HazardProvider } from "@/lib/hazards/types";
import { US_LIQUID_GALLON_IN_LITRES } from "@/lib/units";
import { createFemaNriHazardProvider } from "@/lib/hazards/us/fema-nri";
import { createUsFixtureNriProvider } from "@/lib/hazards/us/fixture-provider";
import { createUsZipCountyResolver } from "@/lib/location/us/zip-county";
import { BUDGET_PATHS, PLAN_TIERS } from "@/lib/onboarding/options";

const FACT_ID = /^(?:WTR|CAL|KIT|TIER|FS|HAZ|GAP)-[A-Z0-9]+(?:-[A-Z0-9]+)*$/;

function person(overrides: Partial<PlanPerson> = {}): PlanPerson {
  return {
    id: "alex",
    label: "Alex",
    age: 30,
    birthYear: null,
    birthMonth: null,
    birthDay: null,
    sex: "female",
    pregnancyStatus: null,
    isChild: false,
    specialNeeds: null,
    activityLevel: "moderate",
    ...overrides,
  };
}

function input(overrides: Partial<PlanInput> = {}): PlanInput {
  return {
    country: "US",
    postalCode: "70112",
    tier: "72_hour",
    people: [person()],
    homeType: "house_renter",
    budgetLevel: "moderate",
    storageSpace: "some",
    asOf: "2026-10-30",
    ...overrides,
  };
}

function factIds(value: unknown, found: string[] = []): string[] {
  if (typeof value === "string" && FACT_ID.test(value)) found.push(value);
  else if (Array.isArray(value)) value.forEach((item) => factIds(item, found));
  else if (value && typeof value === "object") {
    Object.values(value).forEach((item) => factIds(item, found));
  }
  return found;
}

describe("preparedness engine", () => {
  it("calculates one person's 72-hour water and calories from fact ids", async () => {
    const plan = await buildPreparednessPlan(input());
    expect(plan.water.status).toBe("calculated");
    if (plan.water.status !== "calculated") return;
    expect(plan.water.totalGallons).toBe(3);
    expect(plan.water.volume).toMatchObject({ value: 3, unit: "gal", system: "imperial" });
    expect(plan.water.factIds).toEqual(expect.arrayContaining(["WTR-001", "WTR-003", "TIER-72H"]));

    expect(plan.food.status).toBe("calculated");
    if (plan.food.status !== "calculated") return;
    expect(plan.food.dailyKcal).toBe(2000);
    expect(plan.food.tierKcal).toBe(6000);
    expect(plan.food.members[0]).toMatchObject({ bandId: "CAL-020", adjustmentIds: [] });
    expect(plan.food.governmentMassQuantity.gapIds).toEqual([]);
    expect(plan.food.limitations[0]?.gapIds).toEqual(["GAP-02"]);
  });

  it("scales water by people, tier days, and the published heat factor", async () => {
    const month = await buildPreparednessPlan(
      input({
        tier: "1_month",
        people: [
          person(),
          person({ id: "bee", label: "Bee" }),
          person({ id: "cam", label: "Cam" }),
          person({ id: "dee", label: "Dee" }),
        ],
      }),
    );
    expect(month.water.status === "calculated" && month.water.totalGallons).toBe(56);
    expect(month.water.status === "calculated" && month.water.tierDays).toBe(30);
    expect(month.water.status === "calculated" && month.water.days).toBe(14);
    expect(month.food.status === "calculated" && month.food.dailyKcal).toBe(8000);
    expect(month.food.status === "calculated" && month.food.tierKcal).toBe(8000 * 30);
    expect(month.assumptions.map((item) => item.id)).toEqual([
      "ASM-WTR-REMAINDER",
      "ASM-SUPPLIES-REMAINDER",
      "ASM-PETS",
    ]);
    expect(month.assumptions.every((item) => item.kind === "assumption")).toBe(true);
    expect(JSON.stringify(month.assumptions)).not.toMatch(/\d+\s+gallons/);

    const hot = await buildPreparednessPlan(
      input({ hotClimate: true, people: [person(), person({ id: "bee", label: "Bee" })] }),
    );
    expect(hot.water.status === "calculated" && hot.water.totalGallons).toBe(12);
    expect(hot.water.status === "calculated" && hot.water.factIds).toContain("WTR-008");

    const metric = await buildPreparednessPlan(input({ unitSystem: "metric" }));
    expect(metric.water.status === "calculated" && metric.water.volume.value).toBe(
      3 * US_LIQUID_GALLON_IN_LITRES,
    );
    expect(metric.food.status === "calculated" && metric.food.dailyKcal).toBe(2000);
  });

  it("uses planner day counts for longer food tiers and caps cited water", async () => {
    const year = await buildPreparednessPlan(input({ tier: "12_month" }));
    expect(year.food.status === "calculated" && year.food.days).toBe(365);
    expect(year.food.status === "calculated" && year.food.tierKcal).toBe(2000 * 365);
    expect(year.water.status === "calculated" && year.water.totalGallons).toBe(14);
    expect(year.water.status === "calculated" && year.water.kind).toBe("sourced");
    const quarter = await buildPreparednessPlan(input({ tier: "3_month" }));
    expect(quarter.food.status === "calculated" && quarter.food.tierKcal).toBe(2000 * 90);
    const half = await buildPreparednessPlan(input({ tier: "6_month" }));
    expect(half.food.status === "calculated" && half.food.tierKcal).toBe(2000 * 180);
    expect(half.kit.assumptions[0]?.kind).toBe("assumption");
    expect(half.kit.items.every((item) => item.kind === "sourced")).toBe(true);
  });

  it("keeps go-bag water at 3 days and still counts calories for that tier", async () => {
    const goBag = await buildPreparednessPlan(input({ tier: "go_bag" }));
    expect(goBag.water.status === "calculated" && goBag.water.totalGallons).toBe(3);
    expect(goBag.water.status === "calculated" && goBag.water.assumptions).toEqual([]);
    expect(goBag.assumptions.map((item) => item.id)).toEqual(["ASM-PETS"]);
    expect(goBag.food.status).toBe("calculated");
    if (goBag.food.status !== "calculated") return;
    expect(goBag.food.kind).toBe("sourced");
    expect(goBag.food.dailyKcal).toBe(2000);
    expect(goBag.food.tierKcal).toBe(6000);
    expect(goBag.food.governmentMassQuantity.gapIds).toEqual(["GAP-04"]);
    expect(
      goBag.water.status === "calculated" &&
        goBag.water.notes.some((note) => note.factIds.includes("TIER-GO")),
    ).toBe(true);

    const infant = await buildPreparednessPlan(
      input({
        people: [person(), person({ id: "baby", label: "Baby", age: 1, isChild: true })],
      }),
    );
    expect(infant.food.status).toBe("partial");
    if (infant.food.status !== "partial") return;
    expect(infant.food.dailyKcal).toBe(2000);
    expect(infant.food.excludedPersonIds).toEqual(["baby"]);
    const baby = infant.food.members.find((member) => member.personId === "baby");
    expect(baby).toMatchObject({ status: "no_source_data", gapIds: ["GAP-02"] });
    expect(infant.water.status === "calculated" && infant.water.totalGallons).toBe(6);
    expect(
      infant.water.status === "calculated" &&
        infant.water.notes.some((note) => note.gapIds.includes("GAP-03")),
    ).toBe(true);
  });

  it("leaves calorie gaps blank instead of guessing sex, activity, trimester, or a male pregnancy", async () => {
    const unspecified = await buildPreparednessPlan(
      input({ people: [person({ sex: "unspecified" })] }),
    );
    expect(unspecified.food.status).toBe("no_source_data");

    const noActivity = await buildPreparednessPlan(
      input({ people: [person({ activityLevel: null })] }),
    );
    expect(noActivity.food.members?.[0]).toMatchObject({
      status: "no_source_data",
      message: { key: "engine.food.missing_activity" },
    });

    const trimester = await buildPreparednessPlan(
      input({ people: [person({ pregnancyStatus: "pregnant_unspecified" })] }),
    );
    expect(trimester.food.status).toBe("partial");
    if (trimester.food.status !== "partial") return;
    expect(trimester.food.members[0]).toMatchObject({
      status: "partial",
      dailyKcal: 2000,
      unapplied: { factIds: ["CAL-P01", "CAL-P02", "CAL-P03"] },
    });

    const second = await buildPreparednessPlan(
      input({ people: [person({ pregnancyStatus: "pregnant_t2" })] }),
    );
    expect(second.food.status === "calculated" && second.food.dailyKcal).toBe(2340);
    expect(second.food.status === "calculated" && second.food.tierKcal).toBe(7020);

    const mismatch = await buildPreparednessPlan(
      input({ people: [person({ sex: "male", pregnancyStatus: "pregnant_t2" })] }),
    );
    expect(mismatch.food.members?.[0]).toMatchObject({
      status: "no_source_data",
      message: { key: "engine.food.inconsistent_pregnancy" },
    });
  });

  it("calculates an exact age from birth month and year", async () => {
    const aged = await buildPreparednessPlan(
      input({
        people: [person({ age: null, birthYear: 2000, birthMonth: 1, birthDay: 15, sex: "male" })],
      }),
    );
    expect(aged.food.status === "calculated" && aged.food.members[0]).toMatchObject({
      age: 26,
      bandId: "CAL-020",
      dailyKcal: 2600,
    });
    const yearOnly = await buildPreparednessPlan(
      input({ people: [person({ age: null, birthYear: 2000, sex: "male" })] }),
    );
    expect(yearOnly.food.status).toBe("calculated");
    if (yearOnly.food.status !== "calculated") return;
    expect(yearOnly.food.members[0]).toMatchObject({
      status: "calculated",
      age: 25,
      ageExact: false,
      bandId: "CAL-019",
      dailyKcal: 2800,
    });
    expect(
      yearOnly.food.members[0]?.status === "calculated" && yearOnly.food.members[0].notes,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ message: { key: "engine.food.age_not_exact" } }),
      ]),
    );
    const missing = await buildPreparednessPlan(
      input({ asOf: undefined, people: [person({ age: null, birthYear: 2000 })] }),
    );
    expect(missing.food.members?.[0]).toMatchObject({
      message: { key: "engine.food.missing_as_of" },
    });
  });

  it("records home, budget, and storage without changing sourced quantities", async () => {
    const limited = await buildPreparednessPlan(
      input({ homeType: "apartment_renter", budgetLevel: "minimal", storageSpace: "very_limited" }),
    );
    const roomy = await buildPreparednessPlan(
      input({ homeType: "house_owner", budgetLevel: "comfortable", storageSpace: "plenty" }),
    );
    expect(limited.water.status === "calculated" && roomy.water.status === "calculated").toBe(true);
    if (limited.water.status !== "calculated" || roomy.water.status !== "calculated") return;
    expect(limited.water.totalGallons).toBe(roomy.water.totalGallons);
    expect(limited.water.adaptation.storage.limit).toBeNull();
    expect(limited.water.adaptation.storageSpace).toBe("very_limited");
    expect(limited.water.adaptation.budgetOptions.options).toBeNull();
    expect(limited.kit.items.map((item) => item.text)).toEqual(
      roomy.kit.items.map((item) => item.text),
    );
    expect(limited.kit.items.every((item) => item.budgetPath === null)).toBe(true);
    expect(limited.kit.items[0]?.budgetPathsOffered).toEqual(["free", "low_cost", "standard"]);
    expect(limited.defaultBudgetPath).toBe("free");
    expect(roomy.defaultBudgetPath).toBe("standard");
  });

  it("offers free, low-cost, and standard paths on every tier without assigning items", async () => {
    for (const tier of PLAN_TIERS) {
      const plan = await buildPreparednessPlan(input({ tier }));
      expect(Object.keys(plan.budgetPaths)).toEqual([...BUDGET_PATHS]);
      expect(plan.defaultBudgetPath).toBe("low_cost");
      for (const path of BUDGET_PATHS) {
        expect(plan.budgetPaths[path]).toMatchObject({
          tier,
          path,
          isDefault: path === "low_cost",
          status: "no_source_data",
          items: [],
          factIds: [],
        });
      }
    }
  });

  it("resolves a US ZIP to county ratings and Ready.gov actions, and refuses UK guidance", async () => {
    const plan = await buildPreparednessPlan(input());
    expect(plan.hazards.status).toBe("ok");
    if (plan.hazards.status !== "ok") return;
    expect(plan.hazards.region).toMatchObject({
      id: "22071",
      name: "Orleans Parish",
      country: "US",
    });
    expect(plan.hazards.provenance).toBe("fixture");
    expect(plan.hazards.disclaimer?.key).toBe("engine.hazard.fixture_disclaimer");
    const flood = plan.hazards.groups.find((group) => group.hazard === "Flood");
    expect(flood?.rating).toBe("very_high");
    expect(flood?.nriKeys).toEqual(expect.arrayContaining(["CFLD", "RFLD"]));
    expect(flood?.actions.map((action) => action.factId)).toEqual([
      "HAZ-02-B",
      "HAZ-02-D",
      "HAZ-02-A",
    ]);
    const outage = plan.hazards.groups.find((group) => group.hazard === "Power outage");
    expect(outage).toMatchObject({ rating: null, note: { key: "engine.hazard.power_outage" } });
    expect(plan.hazards.otherRatings.some((rating) => rating.key === "DRGT")).toBe(true);

    const uk = await buildPreparednessPlan(input({ country: "gb", postalCode: "SW1A 1AA" }));
    expect(uk.hazards).toMatchObject({
      status: "unavailable",
      message: { key: "engine.hazard.gb_unavailable" },
    });
    expect(JSON.stringify(uk.hazards)).not.toContain("Drop, Cover");

    const germany = await buildPreparednessPlan(input({ country: "DE", postalCode: "10115" }));
    expect(germany.hazards.status).toBe("unsupported_country");

    const missing = await buildPreparednessPlan(input({ postalCode: "00000" }));
    expect(missing.hazards.status).toBe("not_found");
    const bad = await buildPreparednessPlan(input({ postalCode: "abc" }));
    expect(bad.hazards.status).toBe("invalid_postal_code");
  });

  it("cites resolvable fact ids and omits link-only publishers", async () => {
    const plan = await buildPreparednessPlan(
      input({
        tier: "1_month",
        people: [person({ pregnancyStatus: "breastfeeding_6_12", specialNeeds: "insulin" })],
        hotClimate: true,
      }),
    );
    const ids = factIds(plan);
    expect(ids.length).toBeGreaterThan(10);
    for (const id of ids) expect(getFact(id), id).toBeDefined();
    expect(plan.food.status === "calculated" && plan.food.tierKcal).toBe((2000 + 400) * 30);
    expect(plan.food.status !== "no_source_data" && plan.food.factIds).toEqual(
      expect.arrayContaining(["GAP-01", "CAL-P05"]),
    );
    const serialized = JSON.stringify(plan);
    expect(serialized).not.toContain("redcross.org");
    expect(serialized).not.toContain("churchofjesuschrist.org");
    expect(serialized).not.toContain("byu.edu");
    expect(serialized).not.toContain("usu.edu");
  });

  it("accepts a swapped hazard provider", async () => {
    const fetchImpl = async (url: string | URL | Request) => {
      expect(String(url)).toContain("STCOFIPS%3D%2736061%27");
      return new Response(
        JSON.stringify({
          features: [
            {
              attributes: {
                STCOFIPS: "36061",
                RISK_RATNG: "Relatively Low",
                RISK_SCORE: 4.5,
                ERQK_RISKR: "Relatively Moderate",
                ERQK_RISKS: 12,
              },
            },
          ],
        }),
      );
    };
    const plan = await buildPreparednessPlan(input({ postalCode: "10001" }), {
      resolvers: [createUsZipCountyResolver()],
      providers: [createFemaNriHazardProvider({ fetchImpl })],
    });
    expect(plan.hazards.status).toBe("ok");
    if (plan.hazards.status !== "ok") return;
    expect(plan.hazards.provenance).toBe("live");
    expect(plan.hazards.composite?.score).toBe(4.5);
    expect(plan.hazards.groups.find((group) => group.hazard === "Earthquake")?.rating).toBe(
      "relatively_moderate",
    );
    expect(createUsFixtureNriProvider().id).toBe("us_nri_fixture");
  });

  it("checks short, long, and ZIP+4 postal codes", async () => {
    const cases = ["1234", "123456", "", "   "] as const;
    for (const postalCode of cases) {
      const plan = await buildPreparednessPlan(input({ postalCode }));
      expect(plan.hazards.status, postalCode).toBe("invalid_postal_code");
    }
    const zip4 = await buildPreparednessPlan(input({ postalCode: "12345-6789" }));
    expect(zip4.hazards.status).toBe("not_found");
    const padded = await buildPreparednessPlan(input({ postalCode: " 70112 " }));
    expect(padded.hazards.status).toBe("ok");
    if (padded.hazards.status !== "ok") return;
    expect(padded.hazards.region).toMatchObject({ id: "22071", name: "Orleans Parish" });
  });

  it("keeps an unknown hazard key and a null attribute feature from crashing", async () => {
    const stub: HazardProvider = {
      country: "US",
      id: "stub_unknown",
      async ratingsForRegion() {
        return {
          status: "ok",
          provenance: "live",
          providerId: "stub_unknown",
          composite: null,
          disclaimer: null,
          hazards: [
            {
              key: "XYZ",
              name: "Unmapped",
              rating: "relatively_low",
              raw: "Relatively Low",
              score: null,
            },
          ],
        };
      },
    };
    const plan = await buildPreparednessPlan(input(), {
      resolvers: [createUsZipCountyResolver()],
      providers: [stub],
    });
    expect(plan.hazards.status).toBe("ok");
    if (plan.hazards.status !== "ok") return;
    expect(plan.hazards.otherRatings).toEqual([
      {
        key: "XYZ",
        name: "Unmapped",
        rating: "relatively_low",
        raw: "Relatively Low",
        score: null,
      },
    ]);
    expect(plan.hazards.groups.some((group) => group.nriKeys.includes("XYZ"))).toBe(false);

    const empty = await buildPreparednessPlan(input(), {
      resolvers: [createUsZipCountyResolver()],
      providers: [
        createFemaNriHazardProvider({
          cacheTtlMs: 0,
          fetchImpl: async () => new Response(JSON.stringify({ features: [{ attributes: null }] })),
        }),
      ],
    });
    expect(empty.hazards.status).toBe("no_ratings");

    const malformed = await buildPreparednessPlan(input(), {
      resolvers: [createUsZipCountyResolver()],
      providers: [
        createFemaNriHazardProvider({
          cacheTtlMs: 0,
          fetchImpl: async () => new Response("not-json", { status: 200 }),
        }),
      ],
    });
    expect(malformed.hazards).toMatchObject({
      status: "unavailable",
      message: { key: "engine.hazard.nri_invalid_response" },
    });
  });

  it("names pet water and food as an assumption on every tier", async () => {
    for (const tier of PLAN_TIERS) {
      const plan = await buildPreparednessPlan(input({ tier }));
      expect(plan.assumptions.map((item) => item.label)).toContain(
        "pets: add water/food for each pet",
      );
      const pets = plan.assumptions.find((item) => item.id === "ASM-PETS");
      expect(pets).toMatchObject({ kind: "assumption", topic: "pets" });
      expect(JSON.stringify(pets)).not.toMatch(/\d+\s+gallons/);
    }
  });

  it("notes extra water for breastfeeding and not for a healthy 70-year-old", async () => {
    const nursing = await buildPreparednessPlan(
      input({ people: [person({ pregnancyStatus: "breastfeeding_0_6" })] }),
    );
    expect(nursing.water.status).toBe("calculated");
    if (nursing.water.status !== "calculated") return;
    expect(nursing.water.notes.some((note) => note.gapIds.includes("GAP-03"))).toBe(true);
    expect(
      nursing.water.notes.some((note) => note.message.key === "engine.water.special_group"),
    ).toBe(true);

    const senior = await buildPreparednessPlan(
      input({
        people: [
          person({
            age: 70,
            sex: "female",
            activityLevel: "sedentary",
            pregnancyStatus: "none",
            specialNeeds: null,
            isChild: false,
          }),
        ],
      }),
    );
    expect(senior.water.status).toBe("calculated");
    if (senior.water.status !== "calculated") return;
    expect(senior.water.notes.some((note) => note.gapIds.includes("GAP-03"))).toBe(false);
    expect(senior.food.status === "calculated" && senior.food.dailyKcal).toBe(1600);
  });

  it("sums a mixed household at the published calorie rows", async () => {
    const plan = await buildPreparednessPlan(
      input({
        people: [
          person({
            id: "toddler",
            label: "Toddler",
            age: 2,
            sex: "male",
            activityLevel: "sedentary",
            isChild: true,
          }),
          person({ id: "teen", label: "Teen", age: 16, sex: "male", activityLevel: "active" }),
          person({ id: "dad", label: "Dad", age: 35, sex: "male", activityLevel: "moderate" }),
          person({ id: "mom", label: "Mom", age: 35, sex: "female", activityLevel: "moderate" }),
          person({
            id: "elder",
            label: "Elder",
            age: 80,
            sex: "female",
            activityLevel: "sedentary",
          }),
        ],
      }),
    );
    expect(plan.food.status).toBe("calculated");
    if (plan.food.status !== "calculated") return;
    expect(
      plan.food.members.map((member) => (member.status === "calculated" ? member.dailyKcal : 0)),
    ).toEqual([1000, 3200, 2600, 2000, 1600]);
    expect(plan.food.dailyKcal).toBe(10400);
    expect(plan.food.tierKcal).toBe(10400 * 3);
  });

  it("converts a hot-climate supply to metric litres", async () => {
    const plan = await buildPreparednessPlan(
      input({
        hotClimate: true,
        unitSystem: "metric",
        tier: "1_month",
        people: [
          person(),
          person({ id: "b", label: "B" }),
          person({ id: "c", label: "C" }),
          person({ id: "d", label: "D" }),
        ],
      }),
    );
    expect(plan.water.status).toBe("calculated");
    if (plan.water.status !== "calculated") return;
    expect(plan.water.totalGallons).toBe(112);
    expect(plan.water.hotClimateFactor).toBe(2);
    expect(plan.water.volume).toMatchObject({
      unit: "L",
      system: "metric",
      value: 112 * US_LIQUID_GALLON_IN_LITRES,
    });
  });
});

describe("birth year, water notes, and rotation", () => {
  it("keeps calories for a household stored with birth year only", async () => {
    const plan = await buildPreparednessPlan(
      input({
        people: [
          person({
            id: "ada",
            label: "Ada",
            age: null,
            birthYear: 1996,
            sex: "female",
            activityLevel: "moderate",
            isChild: false,
          }),
          person({
            id: "ben",
            label: "Ben",
            age: null,
            birthYear: 1995,
            sex: "male",
            activityLevel: "moderate",
            isChild: false,
          }),
        ],
      }),
    );
    expect(plan.food.status).toBe("calculated");
    if (plan.food.status !== "calculated") return;
    expect(plan.food.dailyKcal).toBe(4600);
    expect(
      plan.food.members.map((member) => (member.status === "calculated" ? member.age : null)),
    ).toEqual([29, 30]);
    for (const member of plan.food.members) {
      expect(member.status).toBe("calculated");
      if (member.status !== "calculated") continue;
      expect(member.ageExact).toBe(false);
      expect(member.notes.some((note) => note.message.key === "engine.food.age_not_exact")).toBe(
        true,
      );
    }
    expect(translate({ key: "engine.food.age_not_exact" })).toContain(
      "add a full birth date for exact numbers",
    );
  });

  it("adds the extra-water note when age is unknown and isChild is false", async () => {
    const unknown = await buildPreparednessPlan(
      input({ people: [person({ age: null, birthYear: null, isChild: false })] }),
    );
    expect(unknown.water.status).toBe("calculated");
    if (unknown.water.status !== "calculated") return;
    expect(unknown.water.totalGallons).toBe(3);
    expect(unknown.water.notes.some((note) => note.gapIds.includes("GAP-03"))).toBe(true);

    const birthYearChild = await buildPreparednessPlan(
      input({
        people: [
          person(),
          person({
            id: "kid",
            label: "Kid",
            age: null,
            birthYear: 2025,
            isChild: false,
            sex: "male",
            activityLevel: "sedentary",
          }),
        ],
      }),
    );
    expect(birthYearChild.food.members?.find((member) => member.personId === "kid")).toMatchObject({
      status: "no_source_data",
      message: { key: "engine.food.under_two" },
    });
    expect(birthYearChild.water.status).toBe("calculated");
    if (birthYearChild.water.status !== "calculated") return;
    expect(birthYearChild.water.totalGallons).toBe(6);
    expect(birthYearChild.water.notes.some((note) => note.gapIds.includes("GAP-03"))).toBe(true);
  });

  it("shows the altitude and dry-climate note without changing gallons", async () => {
    const plan = await buildPreparednessPlan(input());
    expect(plan.water.status).toBe("calculated");
    if (plan.water.status !== "calculated") return;
    expect(plan.water.totalGallons).toBe(3);
    expect(plan.water.appliedGallonsPerPersonPerDay).toBe(1);
    expect(plan.water.factIds).toContain("WTR-009");
    expect(plan.water.notes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          message: { key: "engine.water.altitude_dry" },
          factIds: ["WTR-009"],
        }),
      ]),
    );
  });

  it("includes the 6-month water rotation and the pantry rotation line", async () => {
    const plan = await buildPreparednessPlan(input({ tier: "12_month" }));
    const water = WATER_FACTS.find((fact) => fact.id === "WTR-011");
    const pantry = TIER_FACTS.find((fact) => fact.id === "TIER-ROT");
    expect(plan.rotation.map((item) => item.text)).toEqual([water?.text, pantry?.guidance]);
    expect(plan.rotation[0]).toMatchObject({
      kind: "sourced",
      factIds: ["WTR-011", "GAP-06"],
    });
    expect(plan.rotation[1]?.factIds).toEqual(["TIER-ROT"]);
    expect(plan.water.status).toBe("calculated");
    if (plan.water.status !== "calculated") return;
    expect(plan.water.factIds).toEqual(expect.arrayContaining(["WTR-011", "GAP-06"]));
    expect(plan.water.notes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          message: { key: "engine.water.rotation" },
          factIds: ["WTR-011", "GAP-06"],
          gapIds: ["GAP-06"],
        }),
      ]),
    );
    expect(plan.water.totalGallons).toBe(14);
    expect(plan.food.status === "calculated" && plan.food.tierKcal).toBe(2000 * 365);
  });
});

describe("approximate ages", () => {
  it("feeds a birth-year teen from the higher calorie band and flags the household", async () => {
    const teen = await buildPreparednessPlan(
      input({
        people: [
          person({
            id: "teen",
            label: "Teen",
            age: null,
            birthYear: 2011,
            sex: "male",
            activityLevel: "moderate",
          }),
        ],
      }),
    );
    expect(teen.hasApproximateAges).toBe(true);
    expect(teen.food.status).toBe("calculated");
    if (teen.food.status !== "calculated") return;
    expect(teen.food.dailyKcal).toBe(2600);
    expect(teen.food.members[0]).toMatchObject({
      age: 15,
      ageExact: false,
      bandId: "CAL-014",
      dailyKcal: 2600,
    });

    const active = await buildPreparednessPlan(
      input({
        people: [
          person({
            id: "older",
            label: "Older",
            age: null,
            birthYear: 2007,
            sex: "male",
            activityLevel: "active",
          }),
        ],
      }),
    );
    expect(active.hasApproximateAges).toBe(true);
    expect(active.food.status === "calculated" && active.food.dailyKcal).toBe(3200);
    expect(active.food.status === "calculated" && active.food.members[0]).toMatchObject({
      age: 18,
      ageExact: false,
      bandId: "CAL-017",
    });

    const child = await buildPreparednessPlan(
      input({
        people: [
          person({
            id: "child",
            label: "Child",
            age: null,
            birthYear: 2015,
            sex: "male",
            activityLevel: "moderate",
          }),
        ],
      }),
    );
    expect(child.food.status === "calculated" && child.food.members[0]).toMatchObject({
      age: 11,
      ageExact: false,
      dailyKcal: 2000,
    });

    const exactTeen = await buildPreparednessPlan(
      input({
        people: [
          person({
            age: null,
            birthYear: 2007,
            birthMonth: 1,
            birthDay: 15,
            sex: "male",
            activityLevel: "active",
          }),
        ],
      }),
    );
    expect(exactTeen.hasApproximateAges).toBe(false);
    expect(exactTeen.food.status === "calculated" && exactTeen.food.dailyKcal).toBe(3000);

    const underTwo = await buildPreparednessPlan(
      input({
        people: [person({ age: null, birthYear: 2025, sex: "male", activityLevel: "sedentary" })],
      }),
    );
    expect(underTwo.hasApproximateAges).toBe(false);
    expect(underTwo.food.members?.[0]).toMatchObject({
      status: "no_source_data",
      message: { key: "engine.food.under_two" },
    });

    const straddlesTwo = await buildPreparednessPlan(
      input({
        people: [person({ age: null, birthYear: 2024, sex: "male", activityLevel: "sedentary" })],
      }),
    );
    expect(straddlesTwo.hasApproximateAges).toBe(true);
    expect(straddlesTwo.food.status === "calculated" && straddlesTwo.food.dailyKcal).toBe(1000);
    expect(straddlesTwo.food.status === "calculated" && straddlesTwo.food.members[0]).toMatchObject(
      {
        age: 2,
        ageExact: false,
        bandId: "CAL-001",
      },
    );

    const dated = await buildPreparednessPlan(input());
    expect(dated.hasApproximateAges).toBe(false);
  });

  it("does not flag a household whose calories are missing for a reason other than age", async () => {
    const missingSex = await buildPreparednessPlan(
      input({
        people: [person({ age: null, birthYear: 2000, sex: "unspecified" })],
      }),
    );
    expect(missingSex.hasApproximateAges).toBe(false);
    expect(missingSex.food.members?.[0]).toMatchObject({
      status: "no_source_data",
      message: { key: "engine.food.missing_sex" },
    });

    const missingActivity = await buildPreparednessPlan(
      input({
        people: [person({ age: null, birthYear: 2007, sex: "male", activityLevel: null })],
      }),
    );
    expect(missingActivity.hasApproximateAges).toBe(false);
    expect(missingActivity.food.members?.[0]).toMatchObject({
      status: "no_source_data",
      message: { key: "engine.food.missing_activity" },
    });
  });

  it("uses the higher calorie cell when the birth month is the current month", async () => {
    const plan = await buildPreparednessPlan(
      input({
        asOf: "2026-10-15",
        people: [
          person({
            age: null,
            birthYear: 2007,
            birthMonth: 10,
            sex: "male",
            activityLevel: "sedentary",
          }),
        ],
      }),
    );
    expect(plan.hasApproximateAges).toBe(true);
    expect(plan.food.status).toBe("calculated");
    if (plan.food.status !== "calculated") return;
    expect(plan.food.dailyKcal).toBe(2600);
    expect(plan.food.members[0]).toMatchObject({
      age: 19,
      ageExact: false,
      bandId: "CAL-018",
      dailyKcal: 2600,
    });
  });
});

describe("tier and household size grid", () => {
  const sizes = [0, 1, 12, 15] as const;
  it.each(PLAN_TIERS.flatMap((tier) => sizes.map((count) => [tier, count] as const)))(
    "%s with %i people",
    async (tier, count) => {
      const plan = await buildPreparednessPlan(
        input({
          tier,
          people: Array.from({ length: count }, (_, index) =>
            person({ id: `p${index}`, label: `Person ${index}` }),
          ),
        }),
      );
      if (count === 0) {
        expect(plan.water).toMatchObject({
          status: "no_source_data",
          message: { key: "engine.plan.no_people" },
        });
        expect(plan.food).toMatchObject({
          status: "no_source_data",
          message: { key: "engine.plan.no_people" },
        });
        return;
      }
      const days = TIER_DAYS[tier].days;
      const waterDays = Math.min(days, SOURCED_DURATION_DAYS);
      expect(plan.water.status).toBe("calculated");
      if (plan.water.status !== "calculated" || plan.food.status !== "calculated") return;
      expect(plan.water.totalGallons).toBe(count * waterDays);
      expect(plan.water.days).toBe(waterDays);
      expect(plan.food.dailyKcal).toBe(2000 * count);
      expect(plan.food.days).toBe(days);
      expect(plan.food.tierKcal).toBe(2000 * count * days);
    },
  );
});
