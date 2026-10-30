import type { LocalMessage } from "@/lib/i18n";

/** ISO 3166-1 alpha-2. */
export type CountryCode = string;

export type RegionRef = {
  country: CountryCode;
  /** Stable id inside the country. For the US this is the 5-digit county FIPS. */
  id: string;
  name: string;
  /** What `id` refers to, such as `county_or_equivalent`. */
  kind: string;
  subdivisionCode?: string;
  subdivisionName?: string;
};

/** One county match, highest weight first. `weightKind` is the same for every county in a ZIP. */
export type RankedCountyRef = {
  id: string;
  name: string;
  weight: number;
  weightKind: "population" | "land_area";
};

export type PostalResolveResult =
  | { status: "found"; region: RegionRef; counties?: readonly RankedCountyRef[] }
  | { status: "invalid_postal_code"; message: LocalMessage }
  | { status: "not_found"; message: LocalMessage }
  | { status: "unavailable"; message: LocalMessage };

export interface PostalRegionResolver {
  readonly country: CountryCode;
  resolve(postalCode: string): Promise<PostalResolveResult>;
}

export function normalizeCountry(country: string): string | null {
  const code = country.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(code) ? code : null;
}
