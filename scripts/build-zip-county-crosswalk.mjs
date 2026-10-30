import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

/**
 * Builds data/zip-county-crosswalk.json from the Census Bureau 2020
 * ZCTA-to-county relationship file. Public domain, U.S. government work.
 * No API key. HUD's ZIP-county file has a residential-address ratio, and
 * that download requires a HUD User login, so this script uses Census land area.
 *
 * Source file:
 * https://www2.census.gov/geo/docs/maps-data/data/rel2020/zcta520/tab20_zcta520_county20_natl.txt
 * Documentation:
 * https://www.census.gov/geographies/reference-files/time-series/geo/relationship-files.2020.html
 */

export const CENSUS_ZCTA_COUNTY_URL =
  "https://www2.census.gov/geo/docs/maps-data/data/rel2020/zcta520/tab20_zcta520_county20_natl.txt";

export const CENSUS_ZCTA_COUNTY_DOCS =
  "https://www.census.gov/geographies/reference-files/time-series/geo/relationship-files.2020.html";

/** [postal abbreviation, name] keyed by 2-digit state FIPS. */
const STATE_BY_FIPS = {
  "01": ["AL", "Alabama"],
  "02": ["AK", "Alaska"],
  "04": ["AZ", "Arizona"],
  "05": ["AR", "Arkansas"],
  "06": ["CA", "California"],
  "08": ["CO", "Colorado"],
  "09": ["CT", "Connecticut"],
  10: ["DE", "Delaware"],
  11: ["DC", "District of Columbia"],
  12: ["FL", "Florida"],
  13: ["GA", "Georgia"],
  15: ["HI", "Hawaii"],
  16: ["ID", "Idaho"],
  17: ["IL", "Illinois"],
  18: ["IN", "Indiana"],
  19: ["IA", "Iowa"],
  20: ["KS", "Kansas"],
  21: ["KY", "Kentucky"],
  22: ["LA", "Louisiana"],
  23: ["ME", "Maine"],
  24: ["MD", "Maryland"],
  25: ["MA", "Massachusetts"],
  26: ["MI", "Michigan"],
  27: ["MN", "Minnesota"],
  28: ["MS", "Mississippi"],
  29: ["MO", "Missouri"],
  30: ["MT", "Montana"],
  31: ["NE", "Nebraska"],
  32: ["NV", "Nevada"],
  33: ["NH", "New Hampshire"],
  34: ["NJ", "New Jersey"],
  35: ["NM", "New Mexico"],
  36: ["NY", "New York"],
  37: ["NC", "North Carolina"],
  38: ["ND", "North Dakota"],
  39: ["OH", "Ohio"],
  40: ["OK", "Oklahoma"],
  41: ["OR", "Oregon"],
  42: ["PA", "Pennsylvania"],
  44: ["RI", "Rhode Island"],
  45: ["SC", "South Carolina"],
  46: ["SD", "South Dakota"],
  47: ["TN", "Tennessee"],
  48: ["TX", "Texas"],
  49: ["UT", "Utah"],
  50: ["VT", "Vermont"],
  51: ["VA", "Virginia"],
  53: ["WA", "Washington"],
  54: ["WV", "West Virginia"],
  55: ["WI", "Wisconsin"],
  56: ["WY", "Wyoming"],
  60: ["AS", "American Samoa"],
  66: ["GU", "Guam"],
  69: ["MP", "Northern Mariana Islands"],
  72: ["PR", "Puerto Rico"],
  78: ["VI", "U.S. Virgin Islands"],
};

const REQUIRED_COLUMNS = [
  "GEOID_ZCTA5_20",
  "GEOID_COUNTY_20",
  "NAMELSAD_COUNTY_20",
  "AREALAND_ZCTA5_20",
  "AREALAND_PART",
];

function columnIndex(header, name) {
  const index = header.indexOf(name);
  if (index < 0) throw new Error(`Missing column ${name}`);
  return index;
}

function stateFor(countyFips) {
  return STATE_BY_FIPS[countyFips.slice(0, 2)] ?? null;
}

/**
 * @param {string} text Pipe-delimited Census relationship file, with a header row.
 * @returns {Array<[string, string, number, string, string, string]>}
 * Tuple layout: zip, county FIPS, land-area ratio, county name, state abbreviation, state name.
 * Parts are grouped by ZIP then county. The ratio is AREALAND_PART / AREALAND_ZCTA5_20.
 * Rows are ordered by ZIP, then by ratio descending, then by county FIPS ascending.
 */
export function parseCensusZctaCounty(text) {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/);
  const header = (lines[0] ?? "").split("|").map((name) => name.trim());
  for (const name of REQUIRED_COLUMNS) columnIndex(header, name);
  const zipIndex = columnIndex(header, "GEOID_ZCTA5_20");
  const countyIndex = columnIndex(header, "GEOID_COUNTY_20");
  const nameIndex = columnIndex(header, "NAMELSAD_COUNTY_20");
  const totalIndex = columnIndex(header, "AREALAND_ZCTA5_20");
  const partIndex = columnIndex(header, "AREALAND_PART");

  /** @type {Map<string, { zip: string, countyFips: string, countyName: string, stateAbbr: string, stateName: string, part: number, total: number }>} */
  const groups = new Map();
  /** @type {Set<string>} */
  const unknownStates = new Set();

  for (const line of lines.slice(1)) {
    if (!line.trim()) continue;
    const cols = line.split("|");
    const zip = cols[zipIndex]?.trim() ?? "";
    const countyFips = cols[countyIndex]?.trim() ?? "";
    if (!/^\d{5}$/.test(zip) || !/^\d{5}$/.test(countyFips)) continue;
    const total = Number(cols[totalIndex]?.trim());
    const part = Number(cols[partIndex]?.trim());
    if (!Number.isFinite(total) || total <= 0 || !Number.isFinite(part) || part < 0) continue;
    const countyName = cols[nameIndex]?.trim() ?? "";
    if (!countyName) continue;
    const state = stateFor(countyFips);
    if (!state) {
      unknownStates.add(countyFips.slice(0, 2));
      continue;
    }
    const key = `${zip}|${countyFips}`;
    const existing = groups.get(key);
    if (existing) {
      existing.part += part;
      continue;
    }
    groups.set(key, {
      zip,
      countyFips,
      countyName,
      stateAbbr: state[0],
      stateName: state[1],
      part,
      total,
    });
  }

  if (unknownStates.size > 0) {
    throw new Error(`Unknown state FIPS: ${[...unknownStates].sort().join(", ")}`);
  }

  /** @type {Map<string, Array<[string, string, number, string, string, string]>>} */
  const byZip = new Map();
  for (const item of groups.values()) {
    const ratio = Number((item.part / item.total).toFixed(6));
    const row = [item.zip, item.countyFips, ratio, item.countyName, item.stateAbbr, item.stateName];
    const list = byZip.get(item.zip) ?? [];
    list.push(row);
    byZip.set(item.zip, list);
  }

  /** @type {Array<[string, string, number, string, string, string]>} */
  const rows = [];
  for (const zip of [...byZip.keys()].sort()) {
    const list = byZip.get(zip) ?? [];
    list.sort((left, right) => {
      if (left[2] !== right[2]) return right[2] - left[2];
      if (left[1] === right[1]) return 0;
      return left[1] < right[1] ? -1 : 1;
    });
    rows.push(...list);
  }
  return rows;
}

export function crosswalkDocument(rows, generatedAt = new Date().toISOString()) {
  return {
    format: 1,
    source: "U.S. Census Bureau 2020 ZCTA to County Relationship File",
    sourceUrl: CENSUS_ZCTA_COUNTY_URL,
    documentationUrl: CENSUS_ZCTA_COUNTY_DOCS,
    vintage: "2020",
    license: "Public domain (U.S. government work, 17 U.S.C. § 105). Cite the U.S. Census Bureau.",
    attribution:
      "U.S. Census Bureau, 2020 Census ZIP Code Tabulation Area to County Relationship File (tab20_zcta520_county20_natl.txt).",
    ratio: "land_area",
    ratioDefinition: "AREALAND_PART / AREALAND_ZCTA5_20",
    generatedAt,
    rowCount: rows.length,
    rows,
  };
}

function isDirectRun() {
  const entry = process.argv[1];
  if (!entry) return false;
  return import.meta.url === pathToFileURL(path.resolve(entry)).href;
}

async function main() {
  const out = path.resolve(
    process.cwd(),
    process.argv[2] ?? path.join("data", "zip-county-crosswalk.json"),
  );
  const response = await fetch(CENSUS_ZCTA_COUNTY_URL, {
    headers: { "User-Agent": "preparedness-planner zip-county-crosswalk" },
    signal: AbortSignal.timeout(120_000),
  });
  if (!response.ok) {
    throw new Error(`Census relationship file download failed (${response.status})`);
  }
  const rows = parseCensusZctaCounty(await response.text());
  if (rows.length < 30_000) {
    throw new Error(`Unexpectedly few crosswalk rows: ${rows.length}`);
  }
  await mkdir(path.dirname(out), { recursive: true });
  await writeFile(out, `${JSON.stringify(crosswalkDocument(rows))}\n`);
  const zips = new Set(rows.map((row) => row[0]));
  console.log(`Wrote ${rows.length} county parts for ${zips.size} ZCTAs to ${out}`);
}

if (isDirectRun()) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
