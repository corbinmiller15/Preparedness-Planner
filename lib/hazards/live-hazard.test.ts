import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildPreparednessPlan, type PlanInput, type PlanPerson } from "@/lib/engine";
import { clearFemaNriCache } from "@/lib/hazards/us/fema-nri";
import { defaultHazardDependencies } from "@/lib/hazards/defaults";
import {
  clearZipCountyCrosswalkCache,
  crosswalkFileReads,
  loadZipCountyCrosswalk,
} from "@/lib/location/us/crosswalk-file";

function person(): PlanPerson {
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
  };
}

function input(postalCode: string): PlanInput {
  return {
    country: "US",
    postalCode,
    tier: "72_hour",
    people: [person()],
    homeType: "house_renter",
    budgetLevel: "moderate",
    storageSpace: "some",
    asOf: "2026-10-30",
  };
}

function ratingResponse(fips: string, rating = "Relatively Moderate", score: number | null = 10) {
  return new Response(
    JSON.stringify({
      features: [
        {
          attributes: {
            STCOFIPS: fips,
            COUNTY: "Sample",
            STATEABBRV: "SD",
            RISK_RATNG: rating,
            RISK_SCORE: score,
          },
        },
      ],
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}

describe("live hazard plans", () => {
  it("returns both Meade and Pennington for 57719, ranked by weight", async () => {
    clearFemaNriCache();
    const file = loadZipCountyCrosswalk();
    expect(file?.vintage).toBe("2020");
    expect(file?.sourceUrl).toContain("tab20_zcta520_county20_natl.txt");
    const plan = await buildPreparednessPlan(
      input("57719"),
      defaultHazardDependencies({
        provider: "fema_nri",
        crosswalkRows: file?.rows,
        cacheTtlMs: 0,
        fetchImpl: async (url) => {
          const fips = decodeURIComponent(String(url)).match(/STCOFIPS='(\d{5})'/)?.[1] ?? "";
          return ratingResponse(fips);
        },
      }),
    );
    expect(plan.hazards.status).toBe("ok");
    if (plan.hazards.status !== "ok") return;
    const ids = plan.hazards.counties?.map((county) => county.id) ?? [];
    expect(ids).toHaveLength(2);
    expect(ids).toEqual(expect.arrayContaining(["46093", "46103"]));
    expect(plan.hazards.region.id).toBe(ids[0]);
    expect(plan.hazards.areaNote?.key).toMatch(/engine\.hazard\.(population|land_area)_weight/);
  });

  it("sends a Connecticut ZIP to a planning-region FIPS", async () => {
    clearFemaNriCache();
    const file = loadZipCountyCrosswalk();
    let queried = "";
    const plan = await buildPreparednessPlan(
      input("06511"),
      defaultHazardDependencies({
        provider: "fema_nri",
        crosswalkRows: file?.rows,
        cacheTtlMs: 0,
        fetchImpl: async (url) => {
          queried = decodeURIComponent(String(url));
          return ratingResponse("09170", "Relatively Moderate", 40);
        },
      }),
    );
    expect(queried).toContain("STCOFIPS='09170'");
    expect(queried).not.toContain("09009");
    expect(plan.hazards.status).toBe("ok");
    if (plan.hazards.status !== "ok") return;
    expect(plan.hazards.region.id).toBe("09170");
  });

  it("asks for a home ZIP for a PO Box code such as 73301", async () => {
    const file = loadZipCountyCrosswalk();
    const plan = await buildPreparednessPlan(
      input("73301"),
      defaultHazardDependencies({
        provider: "fema_nri",
        crosswalkRows: file?.rows,
        fetchImpl: async () => {
          throw new Error("PO Box ZIPs are not queried");
        },
      }),
    );
    expect(plan.hazards).toMatchObject({
      status: "not_found",
      message: { key: "engine.hazard.enter_home_zip" },
    });
  });

  it("explains an Insufficient Data composite instead of treating it as a risk level", async () => {
    clearFemaNriCache();
    const plan = await buildPreparednessPlan(
      input("00901"),
      defaultHazardDependencies({
        provider: "fema_nri",
        crosswalkRows: [{ zip: "00901", countyFips: "72127", weight: 1, weightKind: "population" }],
        cacheTtlMs: 0,
        fetchImpl: async () => ratingResponse("72127", "Insufficient Data", null),
      }),
    );
    expect(plan.hazards.status).toBe("ok");
    if (plan.hazards.status !== "ok") return;
    expect(plan.hazards.composite).toEqual({
      rating: null,
      score: null,
      raw: "Insufficient Data",
    });
    expect(plan.hazards.ratingNote?.key).toBe("engine.hazard.insufficient_data");
  });

  it("reads the crosswalk once and queries each county once", async () => {
    clearFemaNriCache();
    clearZipCountyCrosswalkCache();
    const before = crosswalkFileReads();
    let calls = 0;
    const config = {
      env: { HAZARD_PROVIDER: "fema_nri" },
      cacheTtlMs: 60_000,
      fetchImpl: async (url: string | URL | Request) => {
        calls += 1;
        const fips = decodeURIComponent(String(url)).match(/STCOFIPS='(\d{5})'/)?.[1] ?? "22071";
        return ratingResponse(fips);
      },
    };
    await buildPreparednessPlan(input("70112"), defaultHazardDependencies(config));
    await buildPreparednessPlan(input("70112"), defaultHazardDependencies(config));
    expect(calls).toBe(1);
    expect(crosswalkFileReads() - before).toBe(1);
  });

  it("keeps the Next.js build from downloading the crosswalk", () => {
    const pkg = JSON.parse(readFileSync("package.json", "utf8")) as { scripts: { build: string } };
    expect(pkg.scripts.build).toBe("next build");
  });
});
