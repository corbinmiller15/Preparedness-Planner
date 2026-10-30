import type { LocalMessage } from "@/lib/i18n";
import { stateForCountyFips } from "@/lib/location/us/state-fips";
import { normalizeUsPostalCode } from "@/lib/location/us/zip-county";
import type {
  PostalRegionResolver,
  PostalResolveResult,
  RankedCountyRef,
  RegionRef,
} from "@/lib/location/types";

/**
 * One ZCTA–county match. `weight` is the Census land-area share
 * AREALAND_PART / AREALAND_ZCTA5_20. Higher weights rank first.
 */
export type ZipCountyWeightKind = "population" | "land_area";

export type ZipCountyMatch = {
  zip: string;
  countyFips: string;
  weight: number;
  weightKind: ZipCountyWeightKind;
};

export type ZipCountyLookupResult =
  | { status: "invalid_postal_code"; message: LocalMessage }
  | { status: "not_found"; message: LocalMessage }
  | { status: "found"; counties: ZipCountyMatch[] };

const ZIP = /^\d{5}$/;
const FIPS = /^\d{5}$/;

function isMatch(row: ZipCountyMatch): boolean {
  return (
    ZIP.test(row.zip) &&
    FIPS.test(row.countyFips) &&
    typeof row.weight === "number" &&
    Number.isFinite(row.weight) &&
    row.weight > 0 &&
    (row.weightKind === "population" || row.weightKind === "land_area")
  );
}

/** Largest weight first. Equal weights use the lower county FIPS. */
export function compareZipCountyMatches(left: ZipCountyMatch, right: ZipCountyMatch): number {
  if (left.weight !== right.weight) return right.weight - left.weight;
  if (left.countyFips === right.countyFips) return 0;
  return left.countyFips < right.countyFips ? -1 : 1;
}

function mergeCountyParts(rows: readonly ZipCountyMatch[]): ZipCountyMatch[] {
  const byFips = new Map<string, ZipCountyMatch>();
  for (const row of rows) {
    const existing = byFips.get(row.countyFips);
    if (!existing || row.weight > existing.weight) byFips.set(row.countyFips, row);
  }
  return [...byFips.values()].sort(compareZipCountyMatches);
}

export function indexZipCounties(
  rows: readonly ZipCountyMatch[],
): ReadonlyMap<string, readonly ZipCountyMatch[]> {
  const grouped = new Map<string, ZipCountyMatch[]>();
  for (const row of rows) {
    if (!isMatch(row)) continue;
    const list = grouped.get(row.zip) ?? [];
    list.push(row);
    grouped.set(row.zip, list);
  }
  for (const [zip, list] of grouped) grouped.set(zip, mergeCountyParts(list));
  return grouped;
}

function isZipIndex(
  source: readonly ZipCountyMatch[] | ReadonlyMap<string, readonly ZipCountyMatch[]>,
): source is ReadonlyMap<string, readonly ZipCountyMatch[]> {
  return !Array.isArray(source);
}

/** Every county for the ZIP, highest weight first. */
export function lookupZipCounties(
  source: readonly ZipCountyMatch[] | ReadonlyMap<string, readonly ZipCountyMatch[]>,
  postalCode: unknown,
): ZipCountyLookupResult {
  const zip = typeof postalCode === "string" ? normalizeUsPostalCode(postalCode) : null;
  if (!zip) {
    return { status: "invalid_postal_code", message: { key: "engine.hazard.invalid_postal" } };
  }
  const counties = isZipIndex(source) ? source.get(zip) : indexZipCounties(source).get(zip);
  if (!counties || counties.length === 0) {
    return { status: "not_found", message: { key: "engine.hazard.not_found" } };
  }
  return { status: "found", counties: [...counties] };
}

export type CountyNameLookup = (countyFips: string) => string;

function countyLabel(countyFips: string, nameFor?: CountyNameLookup): string {
  const name = nameFor?.(countyFips)?.trim();
  return name ? name : countyFips;
}

function regionFor(row: ZipCountyMatch, nameFor?: CountyNameLookup): RegionRef {
  const state = stateForCountyFips(row.countyFips);
  return {
    country: "US",
    id: row.countyFips,
    name: countyLabel(row.countyFips, nameFor),
    kind: "county_or_equivalent",
    subdivisionCode: state?.abbr,
    subdivisionName: state?.name,
  };
}

function ranked(rows: readonly ZipCountyMatch[], nameFor?: CountyNameLookup): RankedCountyRef[] {
  return rows.map((row) => ({
    id: row.countyFips,
    name: countyLabel(row.countyFips, nameFor),
    weight: row.weight,
    weightKind: row.weightKind,
  }));
}

/**
 * Resolves a ZIP to every matching county, ranked by weight.
 * `region` is the highest-ranked county, which is the one the hazard provider queries.
 */
export function createUsZipCountyCrosswalkResolver(
  rows: readonly ZipCountyMatch[],
  nameFor?: CountyNameLookup,
): PostalRegionResolver {
  const index = indexZipCounties(rows);
  return {
    country: "US",
    async resolve(postalCode: string): Promise<PostalResolveResult> {
      const found = lookupZipCounties(index, postalCode);
      if (found.status === "not_found") {
        return { status: "not_found", message: { key: "engine.hazard.enter_home_zip" } };
      }
      if (found.status !== "found") return found;
      const top = found.counties[0]!;
      return {
        status: "found",
        region: regionFor(top, nameFor),
        counties: ranked(found.counties, nameFor),
      };
    },
  };
}

/** Used when live mode is on and the committed crosswalk file cannot be read. */
export function createMissingZipCountyResolver(): PostalRegionResolver {
  return {
    country: "US",
    async resolve(postalCode: string): Promise<PostalResolveResult> {
      if (!normalizeUsPostalCode(postalCode)) {
        return { status: "invalid_postal_code", message: { key: "engine.hazard.invalid_postal" } };
      }
      return { status: "unavailable", message: { key: "engine.hazard.crosswalk_missing" } };
    },
  };
}
