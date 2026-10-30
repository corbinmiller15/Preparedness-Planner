import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

/**
 * Builds data/zip-county-crosswalk.json.
 * This script is not part of `npm run build`. The Next.js build reads the committed file.
 *
 * Land area: Census 2020 ZCTA to county relationship file (public domain).
 * Population: 2020 Census P.L. 94-171 tract totals, allocated by ZCTA-tract land area.
 * Connecticut: 2022 planning regions (09110–09190), because FEMA's county layer no longer
 * uses the retired 09001–09015 county codes. Town population is allocated by ZCTA-town land.
 */

export const CENSUS_ZCTA_COUNTY_URL =
  "https://www2.census.gov/geo/docs/maps-data/data/rel2020/zcta520/tab20_zcta520_county20_natl.txt";

export const CENSUS_ZCTA_TRACT_URL =
  "https://www2.census.gov/geo/docs/maps-data/data/rel2020/zcta520/tab20_zcta520_tract20_natl.txt";

export const CENSUS_ZCTA_COUNTY_DOCS =
  "https://www.census.gov/geographies/reference-files/time-series/geo/relationship-files.2020.html";

export const CT_ZCTA_PLANNING_REGION_URL =
  "https://www2.census.gov/geo/docs/maps-data/data/rel2022/acs22_cousub22_zcta520_st09.txt";

export const CT_COUNTY_CROSSWALK_URL =
  "https://www2.census.gov/geo/docs/reference/ct_change/ct_cou_to_cousub_crosswalk.txt";

export const CT_RELATIONSHIP_DOCS =
  "https://www.census.gov/geographies/reference-files/2022/geo/relationship-files.html";

export const PL94_ROOT =
  "https://www2.census.gov/programs-surveys/decennial/2020/data/01-Redistricting_File--PL_94-171";

const PL_STATES = [
  ["Alabama", "al"],
  ["Alaska", "ak"],
  ["Arizona", "az"],
  ["Arkansas", "ar"],
  ["California", "ca"],
  ["Colorado", "co"],
  ["Connecticut", "ct"],
  ["Delaware", "de"],
  ["District_of_Columbia", "dc"],
  ["Florida", "fl"],
  ["Georgia", "ga"],
  ["Hawaii", "hi"],
  ["Idaho", "id"],
  ["Illinois", "il"],
  ["Indiana", "in"],
  ["Iowa", "ia"],
  ["Kansas", "ks"],
  ["Kentucky", "ky"],
  ["Louisiana", "la"],
  ["Maine", "me"],
  ["Maryland", "md"],
  ["Massachusetts", "ma"],
  ["Michigan", "mi"],
  ["Minnesota", "mn"],
  ["Mississippi", "ms"],
  ["Missouri", "mo"],
  ["Montana", "mt"],
  ["Nebraska", "ne"],
  ["Nevada", "nv"],
  ["New_Hampshire", "nh"],
  ["New_Jersey", "nj"],
  ["New_Mexico", "nm"],
  ["New_York", "ny"],
  ["North_Carolina", "nc"],
  ["North_Dakota", "nd"],
  ["Ohio", "oh"],
  ["Oklahoma", "ok"],
  ["Oregon", "or"],
  ["Pennsylvania", "pa"],
  ["Puerto_Rico", "pr"],
  ["Rhode_Island", "ri"],
  ["South_Carolina", "sc"],
  ["South_Dakota", "sd"],
  ["Tennessee", "tn"],
  ["Texas", "tx"],
  ["Utah", "ut"],
  ["Vermont", "vt"],
  ["Virginia", "va"],
  ["Washington", "wa"],
  ["West_Virginia", "wv"],
  ["Wisconsin", "wi"],
  ["Wyoming", "wy"],
];

function headerIndex(header, name) {
  const index = header.indexOf(name);
  if (index < 0) throw new Error(`Missing column ${name}`);
  return index;
}

function splitHeader(line) {
  return line
    .replace(/^\uFEFF/, "")
    .split("|")
    .map((name) => name.trim());
}

/**
 * @param {Array<{ countyFips: string, population: number | null, land: number }>} parts
 * @returns {Array<[string, number, "p" | "l"]>}
 */
export function rankCountyParts(parts) {
  const populationKnown = parts.every((part) => typeof part.population === "number");
  const population = parts.reduce((sum, part) => sum + (part.population ?? 0), 0);
  const land = parts.reduce((sum, part) => sum + part.land, 0);
  const usePopulation = populationKnown && population > 0;
  const total = usePopulation ? population : land;
  if (!(total > 0)) return [];
  const kind = usePopulation ? "p" : "l";
  const ranked = parts
    .map((part) => {
      const raw = usePopulation ? (part.population ?? 0) : part.land;
      return [part.countyFips, Number((raw / total).toFixed(6)), kind];
    })
    .filter((row) => row[1] > 0);
  ranked.sort((left, right) => {
    if (left[1] !== right[1]) return right[1] - left[1];
    if (left[0] === right[0]) return 0;
    return left[0] < right[0] ? -1 : 1;
  });
  return ranked;
}

/** @returns {Array<{ zip: string, countyFips: string, land: number }>} */
export function parseCensusZctaCounty(text) {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/);
  const header = splitHeader(lines[0] ?? "");
  const zipIndex = headerIndex(header, "GEOID_ZCTA5_20");
  const countyIndex = headerIndex(header, "GEOID_COUNTY_20");
  const partIndex = headerIndex(header, "AREALAND_PART");
  /** @type {Map<string, { zip: string, countyFips: string, land: number }>} */
  const groups = new Map();
  for (const line of lines.slice(1)) {
    if (!line.trim()) continue;
    const cols = line.split("|");
    const zip = cols[zipIndex]?.trim() ?? "";
    const countyFips = cols[countyIndex]?.trim() ?? "";
    if (!/^\d{5}$/.test(zip) || !/^\d{5}$/.test(countyFips)) continue;
    const land = Number(cols[partIndex]?.trim());
    if (!Number.isFinite(land) || land <= 0) continue;
    const key = `${zip}|${countyFips}`;
    const existing = groups.get(key);
    if (existing) existing.land += land;
    else groups.set(key, { zip, countyFips, land });
  }
  return [...groups.values()];
}

/** @returns {Array<{ zip: string, tract: string, part: number, tractLand: number }>} */
export function parseZctaTracts(text) {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/);
  const header = splitHeader(lines[0] ?? "");
  const zipIndex = headerIndex(header, "GEOID_ZCTA5_20");
  const tractIndex = headerIndex(header, "GEOID_TRACT_20");
  const tractLandIndex = headerIndex(header, "AREALAND_TRACT_20");
  const partIndex = headerIndex(header, "AREALAND_PART");
  /** @type {Array<{ zip: string, tract: string, part: number, tractLand: number }>} */
  const rows = [];
  for (const line of lines.slice(1)) {
    if (!line.trim()) continue;
    const cols = line.split("|");
    const zip = cols[zipIndex]?.trim() ?? "";
    const tract = cols[tractIndex]?.trim() ?? "";
    if (!/^\d{5}$/.test(zip) || !/^\d{11}$/.test(tract)) continue;
    const part = Number(cols[partIndex]?.trim());
    const tractLand = Number(cols[tractLandIndex]?.trim());
    if (!Number.isFinite(part) || part <= 0 || !Number.isFinite(tractLand) || tractLand <= 0) {
      continue;
    }
    rows.push({ zip, tract, part, tractLand });
  }
  return rows;
}

/**
 * @param {Array<{ zip: string, tract: string, part: number, tractLand: number }>} tracts
 * @param {Map<string, number>} tractPopulation
 * @returns {Map<string, number>} key `${zip}|${countyFips}`
 */
export function allocateTractPopulation(tracts, tractPopulation) {
  /** @type {Map<string, number>} */
  const allocated = new Map();
  for (const row of tracts) {
    const population = tractPopulation.get(row.tract);
    if (population === undefined) continue;
    const key = `${row.zip}|${row.tract.slice(0, 5)}`;
    allocated.set(key, (allocated.get(key) ?? 0) + (population * row.part) / row.tractLand);
  }
  return allocated;
}

/** @returns {Map<string, string>} 2022 county-subdivision GEOID to 2020 GEOID */
export function parseConnecticutTownCrosswalk(text) {
  /** @type {Map<string, string>} */
  const nextToOld = new Map();
  for (const line of text.replace(/^\uFEFF/, "").split(/\r?\n/)) {
    if (!/^\d{2}\|/.test(line)) continue;
    const cols = line.split("|");
    const oldGeoid = cols[6]?.trim() ?? "";
    const newGeoid = cols[7]?.trim() ?? "";
    if (/^\d{10}$/.test(oldGeoid) && /^\d{10}$/.test(newGeoid)) nextToOld.set(newGeoid, oldGeoid);
  }
  return nextToOld;
}

/**
 * @param {string} text
 * @param {Map<string, string>} nextToOld
 * @param {Map<string, number>} townPopulation keyed by 2020 county-subdivision GEOID
 * @returns {Map<string, { countyFips: string, population: number | null, land: number }[]>}
 */
export function parseConnecticutPlanningParts(text, nextToOld, townPopulation) {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/);
  const header = splitHeader(lines[0] ?? "");
  const cousubIndex = headerIndex(header, "GEOID_COUSUB_22");
  const zipIndex = headerIndex(header, "GEOID_ZCTA5_20");
  const cousubLandIndex = headerIndex(header, "AREALAND_COUSUB_22");
  const partIndex = headerIndex(header, "AREALAND_PART");
  /** @type {Map<string, { land: number, population: number, populationKnown: boolean }>} */
  const groups = new Map();
  for (const line of lines.slice(1)) {
    if (!line.trim()) continue;
    const cols = line.split("|");
    const zip = cols[zipIndex]?.trim() ?? "";
    const cousub = cols[cousubIndex]?.trim() ?? "";
    if (!/^\d{5}$/.test(zip) || !/^\d{10}$/.test(cousub)) continue;
    const region = cousub.slice(0, 5);
    if (!/^091\d\d$/.test(region)) continue;
    const land = Number(cols[partIndex]?.trim());
    const cousubLand = Number(cols[cousubLandIndex]?.trim());
    if (!Number.isFinite(land) || land <= 0) continue;
    const oldGeoid = nextToOld.get(cousub);
    const townPop = oldGeoid ? townPopulation.get(oldGeoid) : undefined;
    const key = `${zip}|${region}`;
    const existing = groups.get(key) ?? { land: 0, population: 0, populationKnown: true };
    existing.land += land;
    if (townPop === undefined || !Number.isFinite(cousubLand) || cousubLand <= 0) {
      existing.populationKnown = false;
    } else {
      existing.population += (townPop * land) / cousubLand;
    }
    groups.set(key, existing);
  }
  /** @type {Map<string, { countyFips: string, population: number | null, land: number }[]>} */
  const byZip = new Map();
  for (const [key, value] of groups) {
    const [zip, countyFips] = key.split("|");
    const list = byZip.get(zip) ?? [];
    list.push({
      countyFips,
      population: value.populationKnown ? value.population : null,
      land: value.land,
    });
    byZip.set(zip, list);
  }
  return byZip;
}

/**
 * @param {Array<{ zip: string, countyFips: string, land: number }>} landRows
 * @param {Map<string, number>} populationByZipCounty
 * @param {Map<string, { countyFips: string, population: number | null, land: number }[]>} connecticut
 */
export function buildRankedRows(landRows, populationByZipCounty, connecticut) {
  /** @type {Map<string, { countyFips: string, population: number | null, land: number }[]>} */
  const byZip = new Map();
  for (const row of landRows) {
    if (row.countyFips.startsWith("090")) continue;
    const population = populationByZipCounty.has(`${row.zip}|${row.countyFips}`)
      ? populationByZipCounty.get(`${row.zip}|${row.countyFips}`)
      : null;
    const list = byZip.get(row.zip) ?? [];
    list.push({ countyFips: row.countyFips, population, land: row.land });
    byZip.set(row.zip, list);
  }
  for (const [zip, parts] of connecticut) {
    const list = (byZip.get(zip) ?? []).filter((part) => !part.countyFips.startsWith("090"));
    list.push(...parts);
    byZip.set(zip, list);
  }

  /** @type {Array<[string, string, number, "p" | "l"]>} */
  const rows = [];
  for (const zip of [...byZip.keys()].sort()) {
    for (const ranked of rankCountyParts(byZip.get(zip) ?? [])) {
      rows.push([zip, ranked[0], ranked[1], ranked[2]]);
    }
  }
  return rows;
}

export function crosswalkDocument(rows) {
  /** @type {Record<string, Array<[string, number, "p" | "l"]>>} */
  const zcta = {};
  for (const [zip, countyFips, weight, kind] of rows) {
    const list = zcta[zip] ?? [];
    list.push([countyFips, weight, kind]);
    zcta[zip] = list;
  }
  return {
    vintage: "2020",
    ctPlanningRegionVintage: "2022",
    sourceUrl: CENSUS_ZCTA_COUNTY_URL,
    documentationUrl: CENSUS_ZCTA_COUNTY_DOCS,
    populationSourceUrl: `${PL94_ROOT}/`,
    populationMethod:
      "2020 Census tract population allocated by ZCTA-tract land area, summed to the county. Connecticut planning regions use 2020 town population allocated by ZCTA-town land area. A ZIP whose population total is missing or zero is ranked by land area.",
    ctSourceUrl: CT_ZCTA_PLANNING_REGION_URL,
    ctDocumentationUrl: CT_RELATIONSHIP_DOCS,
    ctCountyCrosswalkUrl: CT_COUNTY_CROSSWALK_URL,
    license: "Public domain (U.S. government work, 17 U.S.C. § 105). Cite the U.S. Census Bureau.",
    weight: "population_or_land_area",
    weightDefinition:
      "p is a share of estimated 2020 population. l is a share of land area (AREALAND_PART / ZCTA land). Counties are ranked by that share, then by county FIPS.",
    zcta,
  };
}

function parseGeoPopulation(geoText) {
  /** @type {Map<string, number>} */
  const tracts = new Map();
  /** @type {Map<string, number>} */
  const towns = new Map();
  for (const line of geoText.split("\n")) {
    if (!line) continue;
    const cols = line.split("|");
    const sumlev = cols[2];
    const geoid = cols[9];
    const population = Number(cols[90]);
    if (!Number.isFinite(population)) continue;
    if (sumlev === "140" && geoid?.length === 11) tracts.set(geoid, population);
    if (sumlev === "060" && geoid?.length === 10) towns.set(geoid, population);
  }
  return { tracts, towns };
}

function unzipGeo(zipPath, abbr) {
  return new Promise((resolve, reject) => {
    const child = spawn("unzip", ["-p", zipPath, `${abbr}geo2020.pl`], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    const chunks = [];
    child.stdout.on("data", (chunk) => chunks.push(chunk));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`unzip ${abbr}geo2020.pl exited ${code}`));
        return;
      }
      resolve(Buffer.concat(chunks).toString("latin1"));
    });
  });
}

async function download(url) {
  const response = await fetch(url, {
    headers: { "User-Agent": "preparedness-planner zip-county-crosswalk" },
    signal: AbortSignal.timeout(180_000),
  });
  if (!response.ok) throw new Error(`Download failed (${response.status}) ${url}`);
  return Buffer.from(await response.arrayBuffer());
}

async function mapPool(items, limit, fn) {
  const results = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await fn(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return results;
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
  const [countyText, tractText, ctZctaText, ctCrosswalkText] = await Promise.all([
    download(CENSUS_ZCTA_COUNTY_URL).then((body) => body.toString("utf8")),
    download(CENSUS_ZCTA_TRACT_URL).then((body) => body.toString("utf8")),
    download(CT_ZCTA_PLANNING_REGION_URL).then((body) => body.toString("utf8")),
    download(CT_COUNTY_CROSSWALK_URL).then((body) => body.toString("utf8")),
  ]);

  /** @type {Map<string, number>} */
  const tractPopulation = new Map();
  /** @type {Map<string, number>} */
  const connecticutTowns = new Map();
  const temp = await mkdtemp(path.join(tmpdir(), "pl94-"));
  try {
    await mapPool(PL_STATES, 4, async ([folder, abbr]) => {
      const zipPath = path.join(temp, `${abbr}.zip`);
      const body = await download(`${PL94_ROOT}/${folder}/${abbr}2020.pl.zip`);
      await writeFile(zipPath, body);
      const parsed = parseGeoPopulation(await unzipGeo(zipPath, abbr));
      for (const [geoid, population] of parsed.tracts) tractPopulation.set(geoid, population);
      if (abbr === "ct") {
        for (const [geoid, population] of parsed.towns) connecticutTowns.set(geoid, population);
      }
      await rm(zipPath, { force: true });
      console.log(`Read ${abbr} tracts ${parsed.tracts.size}`);
    });
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
  if (tractPopulation.size < 50_000) {
    throw new Error(`Unexpectedly few tracts: ${tractPopulation.size}`);
  }

  const populationByZipCounty = allocateTractPopulation(
    parseZctaTracts(tractText),
    tractPopulation,
  );
  const townCrosswalk = parseConnecticutTownCrosswalk(ctCrosswalkText);
  if (townCrosswalk.size < 100) throw new Error("Connecticut town crosswalk was not readable");
  const connecticut = parseConnecticutPlanningParts(ctZctaText, townCrosswalk, connecticutTowns);
  const rows = buildRankedRows(
    parseCensusZctaCounty(countyText),
    populationByZipCounty,
    connecticut,
  );
  if (rows.length < 30_000) throw new Error(`Unexpectedly few crosswalk rows: ${rows.length}`);
  const document = crosswalkDocument(rows);
  const { mkdir } = await import("node:fs/promises");
  await mkdir(path.dirname(out), { recursive: true });
  await writeFile(out, `${JSON.stringify(document)}\n`);
  const zips = new Set(rows.map((row) => row[0]));
  const populationZips = new Set(rows.filter((row) => row[3] === "p").map((row) => row[0]));
  console.log(
    `Wrote ${rows.length} county parts for ${zips.size} ZCTAs (${populationZips.size} ranked by population) to ${out}`,
  );
}

if (isDirectRun()) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
