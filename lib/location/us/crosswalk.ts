import type { LocalMessage } from "@/lib/i18n";
import { normalizeUsPostalCode } from "@/lib/location/us/zip-county";
import type { PostalRegionResolver, PostalResolveResult, RegionRef } from "@/lib/location/types";

/**
 * One ZCTA–county part from the Census relationship file.
 * `landAreaRatio` is AREALAND_PART / AREALAND_ZCTA5_20, not a residential-address ratio.
 */
export type ZipCountyCrosswalkRow = {
  zip: string;
  countyFips: string;
  countyName: string;
  stateAbbr: string;
  stateName: string;
  landAreaRatio: number;
};

export type ZipCountyLookupResult =
  | { status: "invalid_postal_code"; message: LocalMessage }
  | { status: "not_found"; message: LocalMessage }
  | { status: "found"; primary: ZipCountyCrosswalkRow; counties: ZipCountyCrosswalkRow[] };

const ZIP = /^\d{5}$/;
const FIPS = /^\d{5}$/;

function isRow(row: ZipCountyCrosswalkRow): boolean {
  return (
    ZIP.test(row.zip) &&
    FIPS.test(row.countyFips) &&
    typeof row.landAreaRatio === "number" &&
    Number.isFinite(row.landAreaRatio) &&
    row.landAreaRatio >= 0 &&
    row.countyName.trim().length > 0 &&
    row.stateAbbr.trim().length > 0 &&
    row.stateName.trim().length > 0
  );
}

/** Largest land-area share first. Equal shares use the lower county FIPS. */
export function compareZipCountyRows(
  left: ZipCountyCrosswalkRow,
  right: ZipCountyCrosswalkRow,
): number {
  if (left.landAreaRatio !== right.landAreaRatio) {
    return right.landAreaRatio - left.landAreaRatio;
  }
  if (left.countyFips === right.countyFips) return 0;
  return left.countyFips < right.countyFips ? -1 : 1;
}

function mergeCountyParts(rows: readonly ZipCountyCrosswalkRow[]): ZipCountyCrosswalkRow[] {
  const byFips = new Map<string, ZipCountyCrosswalkRow>();
  for (const row of rows) {
    const existing = byFips.get(row.countyFips);
    if (!existing || row.landAreaRatio > existing.landAreaRatio) byFips.set(row.countyFips, row);
  }
  return [...byFips.values()].sort(compareZipCountyRows);
}

export function indexZipCounties(
  rows: readonly ZipCountyCrosswalkRow[],
): ReadonlyMap<string, readonly ZipCountyCrosswalkRow[]> {
  const grouped = new Map<string, ZipCountyCrosswalkRow[]>();
  for (const row of rows) {
    if (!isRow(row)) continue;
    const list = grouped.get(row.zip) ?? [];
    list.push(row);
    grouped.set(row.zip, list);
  }
  for (const [zip, list] of grouped) grouped.set(zip, mergeCountyParts(list));
  return grouped;
}

function isZipIndex(
  source: readonly ZipCountyCrosswalkRow[] | ReadonlyMap<string, readonly ZipCountyCrosswalkRow[]>,
): source is ReadonlyMap<string, readonly ZipCountyCrosswalkRow[]> {
  return !Array.isArray(source);
}

export function lookupZipCounties(
  source: readonly ZipCountyCrosswalkRow[] | ReadonlyMap<string, readonly ZipCountyCrosswalkRow[]>,
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
  const listed = [...counties];
  return { status: "found", primary: listed[0]!, counties: listed };
}

function regionFor(row: ZipCountyCrosswalkRow): RegionRef {
  return {
    country: "US",
    id: row.countyFips,
    name: row.countyName,
    kind: "county_or_equivalent",
    subdivisionCode: row.stateAbbr,
    subdivisionName: row.stateName,
  };
}

/** Resolves a ZIP to the primary county. `lookupZipCounties` still lists every part. */
export function createUsZipCountyCrosswalkResolver(
  rows: readonly ZipCountyCrosswalkRow[],
): PostalRegionResolver {
  const index = indexZipCounties(rows);
  return {
    country: "US",
    async resolve(postalCode: string): Promise<PostalResolveResult> {
      const found = lookupZipCounties(index, postalCode);
      if (found.status !== "found") return found;
      return { status: "found", region: regionFor(found.primary) };
    },
  };
}

/** Used when live mode is on and `data/zip-county-crosswalk.json` is not loaded. */
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
