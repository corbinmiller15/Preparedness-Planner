import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildPreparednessPlan, type PlanInput } from "@/lib/engine";
import {
  DEFAULT_HAZARD_PROVIDER_TIMEOUT_MS,
  hazardProviderMode,
  hazardProviderTimeoutMs,
} from "@/lib/hazards/config";
import { defaultHazardDependencies } from "@/lib/hazards/defaults";

function input(): PlanInput {
  return {
    country: "US",
    postalCode: "70112",
    tier: "72_hour",
    people: [
      {
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
      },
    ],
    homeType: "house_renter",
    budgetLevel: "moderate",
    storageSpace: "some",
    asOf: "2026-10-30",
  };
}

describe("hazard provider config", () => {
  it("uses the fixture provider when no config is set", async () => {
    expect(hazardProviderMode({})).toBe("fixture");
    expect(hazardProviderMode({ HAZARD_PROVIDER: "" })).toBe("fixture");
    expect(hazardProviderMode({ HAZARD_PROVIDER: "fixture" })).toBe("fixture");
    expect(hazardProviderMode({ HAZARD_PROVIDER: "live" })).toBe("fixture");

    const deps = defaultHazardDependencies({ env: {} });
    expect(deps.providers.map((provider) => provider.id)).toEqual([
      "us_nri_fixture",
      "gb_unavailable",
    ]);

    let called = false;
    const plan = await buildPreparednessPlan(
      input(),
      defaultHazardDependencies({
        env: {},
        fetchImpl: async () => {
          called = true;
          throw new Error("fixture mode must not query FEMA");
        },
      }),
    );
    expect(called).toBe(false);
    expect(plan.hazards).toMatchObject({
      status: "ok",
      provenance: "fixture",
      providerId: "us_nri_fixture",
      region: { id: "22071", name: "Orleans Parish" },
    });
  });

  it("selects the live provider only for fema_nri", async () => {
    expect(hazardProviderMode({ HAZARD_PROVIDER: " fema_nri " })).toBe("fema_nri");
    expect(hazardProviderMode({ HAZARD_PROVIDER: "FEMA_NRI" })).toBe("fema_nri");
    expect(hazardProviderTimeoutMs({})).toBe(DEFAULT_HAZARD_PROVIDER_TIMEOUT_MS);
    expect(hazardProviderTimeoutMs({ HAZARD_PROVIDER_TIMEOUT_MS: "2500" })).toBe(2500);
    expect(hazardProviderTimeoutMs({ HAZARD_PROVIDER_TIMEOUT_MS: "0" })).toBe(
      DEFAULT_HAZARD_PROVIDER_TIMEOUT_MS,
    );

    const missing = defaultHazardDependencies({
      env: { HAZARD_PROVIDER: "fema_nri" },
      crosswalkPath: path.join("data", "missing-zip-county-crosswalk.json"),
    });
    expect(missing.providers.map((provider) => provider.id)).toEqual([
      "fema_nri",
      "gb_unavailable",
    ]);
    await expect(missing.resolvers[0]?.resolve("10001")).resolves.toMatchObject({
      status: "unavailable",
      message: { key: "engine.hazard.crosswalk_missing" },
    });
    await expect(missing.resolvers[0]?.resolve("abc")).resolves.toMatchObject({
      status: "invalid_postal_code",
    });

    const deps = defaultHazardDependencies({
      provider: "fixture",
      env: { HAZARD_PROVIDER: "fema_nri" },
    });
    expect(deps.providers[0]?.id).toBe("us_nri_fixture");
  });
});
