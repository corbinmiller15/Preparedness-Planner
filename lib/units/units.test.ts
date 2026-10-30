import { describe, expect, it } from "vitest";
import {
  celsiusToFahrenheit,
  fahrenheitToCelsius,
  litresToGallons,
  US_LIQUID_GALLON_IN_LITRES,
  volumeFromGallons,
  volumeLabel,
} from "@/lib/units";

describe("units", () => {
  it("defaults to US gallons and converts with the international gallon", () => {
    expect(volumeFromGallons(1)).toMatchObject({ value: 1, unit: "gal", system: "imperial" });
    const metric = volumeFromGallons(1, "metric");
    expect(metric.value).toBe(US_LIQUID_GALLON_IN_LITRES);
    expect(litresToGallons(metric.value)).toBeCloseTo(1, 10);
    expect(volumeLabel(metric, "en-GB")).toBe(`${metric.value.toFixed(3)} litres`);
    expect(volumeLabel(volumeFromGallons(1), "en-US")).toBe("1 gallon");
    expect(fahrenheitToCelsius(32)).toBe(0);
    expect(celsiusToFahrenheit(100)).toBe(212);
  });
});
