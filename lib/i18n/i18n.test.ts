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
});
