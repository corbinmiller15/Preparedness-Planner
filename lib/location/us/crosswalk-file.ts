import { readFileSync } from "node:fs";
import path from "node:path";
import {
  createUsZipCountyCrosswalkResolver,
  type ZipCountyMatch,
  type ZipCountyWeightKind,
} from "@/lib/location/us/crosswalk";
import type { PostalRegionResolver } from "@/lib/location/types";

export const CROSSWALK_FILENAME = "zip-county-crosswalk.json";

export function defaultCrosswalkPath(cwd = process.cwd()): string {
  return path.join(cwd, "data", CROSSWALK_FILENAME);
}

export type ZipCountyCrosswalkFile = {
  vintage: string;
  sourceUrl: string;
  documentationUrl: string;
  populationSourceUrl: string;
  ctSourceUrl: string;
  license: string;
  weight: "population_or_land_area";
  rows: ZipCountyMatch[];
};

type CachedCrosswalk = {
  file: ZipCountyCrosswalkFile;
  resolver: PostalRegionResolver;
};

const cache = new Map<string, CachedCrosswalk>();
let fileReads = 0;

export function crosswalkFileReads(): number {
  return fileReads;
}

export function clearZipCountyCrosswalkCache(): void {
  cache.clear();
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
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

export function parseZipCountyCrosswalkJson(raw: string): ZipCountyCrosswalkFile | null {
  let value: unknown;
  try {
    value = JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const vintage = text(record.vintage);
  const sourceUrl = text(record.sourceUrl);
  if (!vintage || !sourceUrl || record.weight !== "population_or_land_area") return null;
  if (!record.zcta || typeof record.zcta !== "object" || Array.isArray(record.zcta)) return null;

  const rows: ZipCountyMatch[] = [];
  for (const [zip, pairs] of Object.entries(record.zcta as Record<string, unknown>)) {
    if (!/^\d{5}$/.test(zip) || !Array.isArray(pairs)) continue;
    for (const pair of pairs) {
      const row = matchFromPair(zip, pair);
      if (row) rows.push(row);
    }
  }
  if (rows.length === 0) return null;
  return {
    vintage,
    sourceUrl,
    documentationUrl: text(record.documentationUrl) ?? "",
    populationSourceUrl: text(record.populationSourceUrl) ?? "",
    ctSourceUrl: text(record.ctSourceUrl) ?? "",
    license: text(record.license) ?? "",
    weight: "population_or_land_area",
    rows,
  };
}

function readCached(filePath: string): CachedCrosswalk | null {
  const hit = cache.get(filePath);
  if (hit) return hit;
  fileReads += 1;
  let raw: string;
  try {
    raw = readFileSync(filePath, "utf8");
  } catch {
    return null;
  }
  const file = parseZipCountyCrosswalkJson(raw);
  if (!file) return null;
  const cached = { file, resolver: createUsZipCountyCrosswalkResolver(file.rows) };
  cache.set(filePath, cached);
  return cached;
}

/** Reads the committed crosswalk once per path for this process. This does not download anything. */
export function loadZipCountyCrosswalk(
  filePath = defaultCrosswalkPath(),
): ZipCountyCrosswalkFile | null {
  return readCached(filePath)?.file ?? null;
}

export function crosswalkResolver(filePath = defaultCrosswalkPath()): PostalRegionResolver | null {
  return readCached(filePath)?.resolver ?? null;
}
