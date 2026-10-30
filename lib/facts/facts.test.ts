import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CALORIE_ADJUSTMENTS, CALORIE_BANDS, calorieBandForAge } from "@/lib/facts/calories";
import { ALL_FACTS, FURTHER_READING, getFact, KIT_FACTS } from "@/lib/facts";
import { HAZARD_ACTION_FACTS } from "@/lib/facts/hazards";
import { WATER_FACTS } from "@/lib/facts/water";

const SOURCE_HOSTS = new Set([
  "www.ready.gov",
  "www.cdc.gov",
  "beready.utah.gov",
  "fns-prod.azureedge.us",
  "www.dietaryguidelines.gov",
  "www.fna.usda.gov",
  "www.fsis.usda.gov",
]);

const LINK_ONLY_HOSTS = new Set([
  "www.redcross.org",
  "www.churchofjesuschrist.org",
  "ndfs.byu.edu",
  "extension.usu.edu",
]);

describe("fact catalog", () => {
  it("keeps stable unique ids and federal or state source hosts", () => {
    const ids = ALL_FACTS.map((fact) => fact.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.filter((id) => id.startsWith("WTR-"))).toHaveLength(14);
    expect(ids.filter((id) => /^CAL-\d+$/.test(id))).toHaveLength(30);
    expect(ids.filter((id) => id.startsWith("CAL-P"))).toHaveLength(5);
    expect(ids.filter((id) => id.startsWith("KIT-"))).toHaveLength(30);
    expect(ids.filter((id) => id.startsWith("HAZ-"))).toHaveLength(24);
    expect(ids.filter((id) => id.startsWith("GAP-"))).toHaveLength(7);
    expect(ids).toContain("TIER-GO");
    expect(ids).toContain("FS-001");

    for (const fact of ALL_FACTS) {
      expect(fact.id).toMatch(/^(WTR|CAL|KIT|TIER|FS|HAZ|GAP)-/);
      for (const source of fact.sources) {
        expect(SOURCE_HOSTS.has(new URL(source.url).host)).toBe(true);
      }
      for (const link of fact.furtherReading) {
        expect(link.linkOnly).toBe(true);
        expect(LINK_ONLY_HOSTS.has(new URL(link.url).host)).toBe(true);
        expect(link).not.toHaveProperty("text");
      }
    }
  });

  it("matches published USDA calorie cells and pregnancy adders", () => {
    expect(calorieBandForAge(2)?.id).toBe("CAL-001");
    expect(calorieBandForAge(2)?.kcal.male.sedentary).toBe(1000);
    expect(calorieBandForAge(2)?.kcal.female.active).toBe(1000);
    expect(calorieBandForAge(19)?.id).toBe("CAL-018");
    expect(calorieBandForAge(20)?.kcal.male.sedentary).toBe(2600);
    expect(calorieBandForAge(30)?.id).toBe("CAL-020");
    expect(calorieBandForAge(30)?.kcal.male.moderate).toBe(2600);
    expect(calorieBandForAge(30)?.kcal.female.moderate).toBe(2000);
    expect(calorieBandForAge(76)?.id).toBe("CAL-030");
    expect(calorieBandForAge(90)?.kcal.male.active).toBe(2400);
    expect(calorieBandForAge(1)).toBeUndefined();
    expect(CALORIE_ADJUSTMENTS.map((row) => row.kcalPerDayChange)).toEqual([0, 340, 452, 330, 400]);
    expect(CALORIE_BANDS).toHaveLength(30);
  });

  it("stores kit and water facts without copying link-only publishers into the text", () => {
    expect(KIT_FACTS[0]?.id).toBe("KIT-B01");
    expect(KIT_FACTS[13]?.id).toBe("KIT-B14");
    expect(KIT_FACTS.at(-1)?.id).toBe("KIT-A16");
    expect(WATER_FACTS.find((fact) => fact.id === "WTR-014")?.text).toContain("rolling boil");
    const prose = ALL_FACTS.map((fact) => {
      if ("text" in fact) return fact.text;
      if (fact.kind === "tier") return `${fact.guidance} ${fact.quantity}`;
      if (fact.kind === "calorie_adjustment") return `${fact.stage} ${fact.applicability}`;
      return fact.ageLabel;
    }).join("\n");
    expect(prose).not.toContain("redcross.org");
    expect(prose).not.toContain("churchofjesuschrist.org");
    expect(prose).not.toContain("byu.edu");
    expect(FURTHER_READING.byuFoodStorage.url).toContain("https:/brightspotcdn");
    expect(getFact("GAP-04")?.kind).toBe("gap");
  });

  it("keeps hazard action ids in before, during, after order", () => {
    expect(HAZARD_ACTION_FACTS[0]?.id).toBe("HAZ-01-B");
    expect(HAZARD_ACTION_FACTS[2]?.id).toBe("HAZ-01-A");
    expect(HAZARD_ACTION_FACTS.at(-3)?.id).toBe("HAZ-08-B");
    expect(
      HAZARD_ACTION_FACTS.every((fact) =>
        fact.sources[0]?.url.startsWith("https://www.ready.gov/"),
      ),
    ).toBe(true);
  });

  it("does not put the disclaimer sentence only in the page component", () => {
    const page = readFileSync(new URL("../../app/page.tsx", import.meta.url), "utf8");
    expect(page).not.toContain("911");
    expect(page).toContain('t("home.disclaimer"');
  });
});
