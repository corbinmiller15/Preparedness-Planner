import { describe, expect, it } from "vitest";
import { buildPreparednessPlan, type PlanInput, type PlanPerson } from "@/lib/engine";
import { getFact } from "@/lib/facts";
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
    expect(month.water.status === "calculated" && month.water.totalGallons).toBe(120);

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

  it("does not invent a go-bag food quantity or a calorie for a child under 2", async () => {
    const goBag = await buildPreparednessPlan(input({ tier: "go_bag" }));
    expect(goBag.water.status === "calculated" && goBag.water.totalGallons).toBe(3);
    expect(goBag.food.status).toBe("no_source_data");
    if (goBag.food.status !== "no_source_data") return;
    expect(goBag.food.gapIds).toEqual(["GAP-04"]);
    expect(goBag.food).not.toHaveProperty("dailyKcal");
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

  it("uses birth year only with an as-of date", async () => {
    const aged = await buildPreparednessPlan(
      input({ people: [person({ age: null, birthYear: 2000, sex: "male" })] }),
    );
    expect(aged.food.status === "calculated" && aged.food.members[0]).toMatchObject({
      age: 26,
      bandId: "CAL-020",
      dailyKcal: 2600,
    });
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
  });

  it("offers free, low-cost, and standard paths on every tier without assigning items", async () => {
    for (const tier of PLAN_TIERS) {
      const plan = await buildPreparednessPlan(input({ tier }));
      expect(Object.keys(plan.budgetPaths)).toEqual([...BUDGET_PATHS]);
      for (const path of BUDGET_PATHS) {
        expect(plan.budgetPaths[path]).toMatchObject({
          tier,
          path,
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
});
