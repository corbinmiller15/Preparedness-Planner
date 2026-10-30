import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  lookupZipCounties,
  type ZipCountyMatch,
  type ZipCountyWeightKind,
} from "@/lib/location/us/crosswalk";
import { stateForCountyFips } from "@/lib/location/us/state-fips";
import { normalizeUsPostalCode } from "@/lib/location/us/zip-county";
import type {
  PostalRegionResolver,
  PostalResolveResult,
  RankedCountyRef,
  RegionRef,
} from "@/lib/location/types";

export const CROSSWALK_DIRNAME = "zip-county";
export const COUNTY_NAMES_FILENAME = "county-names.json";

export function defaultCrosswalkDir(cwd = process.cwd()): string {
  return path.join(cwd, "data", CROSSWALK_DIRNAME);
}

export function defaultCountyNamesPath(cwd = process.cwd()): string {
  return path.join(cwd, "data", COUNTY_NAMES_FILENAME);
}

const shards = new Map<string, ZipCountyMatch[]>();
let shardReads = 0;
let namesCache: { path: string; names: Map<string, string> } | null = null;
let nameReads = 0;

export function crosswalkFileReads(): number {
  return shardReads;
}

export function countyNameReads(): number {
  return nameReads;
}

export function clearZipCountyCrosswalkCache(): void {
  shards.clear();
  namesCache = null;
}

function weightKind(value: unknown): ZipCountyWeightKind | null {
  if (value === "p" || value === "population") return "population";
  if (value === "l" || value === "land_area") return "land_area";
  return null;
}

function matchFromPair(zip: string, pair: unknown): ZipCountyMatch | null {
  if (!Array.isArray(pair) || pair.length < 3) return null;
  const countyFips = pair[0];
  const weight = pair[1];
  const kind = weightKind(pair[2]);
  if (typeof countyFips !== "string" || !/^\d{5}$/.test(countyFips)) return null;
  if (typeof weight !== "number" || !Number.isFinite(weight) || weight <= 0) return null;
  if (!kind) return null;
  return { zip, countyFips, weight, weightKind: kind };
}

export function parseZipShardJson(raw: string): ZipCountyMatch[] {
  let value: unknown;
  try {
    value = JSON.parse(raw) as unknown;
  } catch {
    return [];
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  const rows: ZipCountyMatch[] = [];
  for (const [zip, pairs] of Object.entries(value as Record<string, unknown>)) {
    if (!/^\d{5}$/.test(zip) || !Array.isArray(pairs)) continue;
    for (const pair of pairs) {
      const row = matchFromPair(zip, pair);
      if (row) rows.push(row);
    }
  }
  return rows;
}

/** Loads one 3-digit ZIP prefix. A missing shard is cached as empty and is not a network call. */
export function loadZipShard(prefix: string, dir = defaultCrosswalkDir()): ZipCountyMatch[] {
  if (!/^\d{3}$/.test(prefix)) return [];
  const filePath = path.join(dir, `${prefix}.json`);
  const hit = shards.get(filePath);
  if (hit) return hit;
  shardReads += 1;
  let rows: ZipCountyMatch[] = [];
  try {
    rows = parseZipShardJson(readFileSync(filePath, "utf8"));
  } catch {
    rows = [];
  }
  shards.set(filePath, rows);
  return rows;
}

export function crosswalkDatasetReady(dir = defaultCrosswalkDir()): boolean {
  return existsSync(path.join(dir, "index.json"));
}

function loadNames(filePath: string): Map<string, string> {
  if (namesCache?.path === filePath) return namesCache.names;
  nameReads += 1;
  try {
    const value = JSON.parse(readFileSync(filePath, "utf8")) as { names?: Record<string, string> };
    const names = new Map(
      Object.entries(value.names ?? {}).filter(
        (entry): entry is [string, string] =>
          /^\d{5}$/.test(entry[0]) && typeof entry[1] === "string" && entry[1].trim().length > 0,
      ),
    );
    namesCache = { path: filePath, names };
    return names;
  } catch {
    return new Map();
  }
}

export function countyName(countyFips: string, filePath = defaultCountyNamesPath()): string {
  return loadNames(filePath).get(countyFips) ?? countyFips;
}

function regionFor(row: ZipCountyMatch, name: string): RegionRef {
  const state = stateForCountyFips(row.countyFips);
  return {
    country: "US",
    id: row.countyFips,
    name,
    kind: "county_or_equivalent",
    subdivisionCode: state?.abbr,
    subdivisionName: state?.name,
  };
}

function ranked(
  rows: readonly ZipCountyMatch[],
  nameFor: (fips: string) => string,
): RankedCountyRef[] {
  return rows.map((row) => ({
    id: row.countyFips,
    name: nameFor(row.countyFips),
    weight: row.weight,
    weightKind: row.weightKind,
  }));
}

/** Resolves a ZIP by reading only that ZIP's 3-digit prefix shard. */
export function crosswalkResolver(
  dir = defaultCrosswalkDir(),
  namesPath = defaultCountyNamesPath(),
): PostalRegionResolver | null {
  if (!crosswalkDatasetReady(dir)) return null;
  return {
    country: "US",
    async resolve(postalCode: string): Promise<PostalResolveResult> {
      const zip = normalizeUsPostalCode(postalCode);
      if (!zip) {
        return { status: "invalid_postal_code", message: { key: "engine.hazard.invalid_postal" } };
      }
      const found = lookupZipCounties(loadZipShard(zip.slice(0, 3), dir), postalCode);
      if (found.status === "not_found") {
        return { status: "not_found", message: { key: "engine.hazard.enter_home_zip" } };
      }
      if (found.status !== "found") return found;
      const nameFor = (fips: string) => countyName(fips, namesPath);
      const top = found.counties[0]!;
      return {
        status: "found",
        region: regionFor(top, nameFor(top.countyFips)),
        counties: ranked(found.counties, nameFor),
      };
    },
  };
}
