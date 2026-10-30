import { describe, expect, it } from "vitest";
import { DEFAULT_LOCALE, t, translate } from "@/lib/i18n";

describe("locale strings", () => {
  it("uses the required en-US disclaimer and falls back for the en-GB stub", () => {
    expect(t("home.disclaimer")).toBe("Not an official alert source. In an emergency, call 911.");
    expect(t("home.disclaimer", "en-GB")).toBe(t("home.disclaimer", DEFAULT_LOCALE));
    expect(t("units.L.other", "en-US")).toBe("liters");
    expect(t("units.L.other", "en-GB")).toBe("litres");
    expect(t("units.L.one", "en-GB")).toBe("litre");
    expect(translate({ key: "home.title" }, "en-GB")).toBe("Northroom");
  });

  it("describes a county or equivalent area in the hazard notes", () => {
    const phrase = "county or equivalent area";
    expect(t("engine.hazard.insufficient_data")).toContain(phrase);
    expect(t("engine.hazard.land_area_weight")).toContain(phrase);
    expect(t("engine.hazard.population_weight")).toContain(phrase);
    expect(t("engine.hazard.power_outage")).toContain(phrase);
    expect(t("engine.hazard.nri_invalid_region")).toContain(phrase);
    expect(t("engine.hazard.highest_across_counties", "en-US", { count: 2 })).toBe(
      "Each rating is the highest across the 2 counties or equivalent areas this ZIP touches. The county or equivalent area is shown with the rating.",
    );
  });
});
