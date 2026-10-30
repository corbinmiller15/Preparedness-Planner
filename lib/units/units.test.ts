import { describe, expect, it } from "vitest";
import {
  celsiusToFahrenheit,
  fahrenheitToCelsius,
  formatVolumeAmount,
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

  it("trims metric litres, including 56 gallons and a 14-day supply for 12 people", () => {
    const fiftySix = 56 * US_LIQUID_GALLON_IN_LITRES;
    expect(fiftySix).toBeCloseTo(211.983059904, 8);
    expect(formatVolumeAmount(fiftySix)).toBe("211.983");
    expect(volumeLabel(volumeFromGallons(56, "metric"), "en-GB")).toBe("211.983 litres");
    expect(volumeLabel(volumeFromGallons(56, "metric"))).toBe("211.983 liters");

    const twoWeeksForTwelve = volumeFromGallons(14 * 12, "metric");
    expect(formatVolumeAmount(twoWeeksForTwelve.value)).toBe("635.949");
    expect(volumeLabel(twoWeeksForTwelve, "en-GB")).toBe("635.949 litres");
    expect(formatVolumeAmount(1.23)).toBe("1.23");
    expect(formatVolumeAmount(2.5)).toBe("2.5");
  });
});
