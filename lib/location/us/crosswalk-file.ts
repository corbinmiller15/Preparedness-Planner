import { readFileSync } from "node:fs";
import path from "node:path";
import type { ZipCountyCrosswalkRow } from "@/lib/location/us/crosswalk";

export const CROSSWALK_FILENAME = "zip-county-crosswalk.json";

export function defaultCrosswalkPath(cwd = process.cwd()): string {
  return path.join(cwd, "data", CROSSWALK_FILENAME);
}

export type ZipCountyCrosswalkFile = {
  format: 1;
  source: string;
  sourceUrl: string;
  documentationUrl: string;
  vintage: string;
  license: string;
  attribution: string;
  ratio: "land_area";
  rows: ZipCountyCrosswalkRow[];
};

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function coerceRow(item: unknown): ZipCountyCrosswalkRow | null {
  const parts = Array.isArray(item)
    ? {
        zip: item[0],
        countyFips: item[1],
        landAreaRatio: item[2],
        countyName: item[3],
        stateAbbr: item[4],
        stateName: item[5],
      }
    : item && typeof item === "object"
      ? (item as Record<string, unknown>)
      : null;
  if (!parts) return null;
  const zip = text(parts.zip);
  const countyFips = text(parts.countyFips);
  const countyName = text(parts.countyName);
  const stateAbbr = text(parts.stateAbbr);
  const stateName = text(parts.stateName);
  const landAreaRatio = parts.landAreaRatio;
  if (!zip || !/^\d{5}$/.test(zip)) return null;
  if (!countyFips || !/^\d{5}$/.test(countyFips)) return null;
  if (typeof landAreaRatio !== "number" || !Number.isFinite(landAreaRatio) || landAreaRatio < 0) {
    return null;
  }
  if (!countyName || !stateName || !stateAbbr || !/^[A-Za-z]{2}$/.test(stateAbbr)) return null;
  return {
    zip,
    countyFips,
    countyName,
    stateAbbr: stateAbbr.toUpperCase(),
    stateName,
    landAreaRatio,
  };
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
  if (record.format !== 1 || record.ratio !== "land_area" || !Array.isArray(record.rows)) {
    return null;
  }
  const rows: ZipCountyCrosswalkRow[] = [];
  for (const item of record.rows) {
    const row = coerceRow(item);
    if (row) rows.push(row);
  }
  if (rows.length === 0) return null;
  return {
    format: 1,
    source: text(record.source) ?? "",
    sourceUrl: text(record.sourceUrl) ?? "",
    documentationUrl: text(record.documentationUrl) ?? "",
    vintage: text(record.vintage) ?? "",
    license: text(record.license) ?? "",
    attribution: text(record.attribution) ?? "",
    ratio: "land_area",
    rows,
  };
}

export function loadZipCountyCrosswalk(
  filePath = defaultCrosswalkPath(),
): ZipCountyCrosswalkFile | null {
  let raw: string;
  try {
    raw = readFileSync(filePath, "utf8");
  } catch {
    return null;
  }
  return parseZipCountyCrosswalkJson(raw);
}
