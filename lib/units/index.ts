import { t, type Locale, DEFAULT_LOCALE } from "@/lib/i18n";
import { DEFAULT_UNIT_SYSTEM, type UnitSystem } from "@/lib/onboarding/options";

/** International definition of the US liquid gallon. */
export const US_LIQUID_GALLON_IN_LITRES = 3.785411784;

export type VolumeUnit = "gal" | "L";

export type Volume = {
  /** Amount in US liquid gallons, the unit used by the water facts. */
  sourceGallons: number;
  sourceUnit: "gal";
  system: UnitSystem;
  value: number;
  unit: VolumeUnit;
};

export function volumeFromGallons(
  gallons: number,
  system: UnitSystem = DEFAULT_UNIT_SYSTEM,
): Volume {
  if (system === "metric") {
    return {
      sourceGallons: gallons,
      sourceUnit: "gal",
      system,
      value: gallons * US_LIQUID_GALLON_IN_LITRES,
      unit: "L",
    };
  }
  return {
    sourceGallons: gallons,
    sourceUnit: "gal",
    system: "imperial",
    value: gallons,
    unit: "gal",
  };
}

export function litresToGallons(litres: number): number {
  return litres / US_LIQUID_GALLON_IN_LITRES;
}

export function fahrenheitToCelsius(fahrenheit: number): number {
  return ((fahrenheit - 32) * 5) / 9;
}

export function celsiusToFahrenheit(celsius: number): number {
  return (celsius * 9) / 5 + 32;
}

/** Display rounding only. `Volume.value` stays exact. */
export function formatVolumeAmount(value: number): string {
  if (!Number.isFinite(value)) return "";
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
}

export function volumeLabel(volume: Volume, locale: Locale = DEFAULT_LOCALE): string {
  const plural = volume.value === 1 ? "one" : "other";
  const key =
    volume.unit === "gal" ? (`units.gal.${plural}` as const) : (`units.L.${plural}` as const);
  return `${formatVolumeAmount(volume.value)} ${t(key, locale)}`;
}
