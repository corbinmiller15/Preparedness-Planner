import { readFile } from "node:fs/promises";
import path from "node:path";

/**
 * Resolves one ZIP with the committed Census crosswalk and queries FEMA's
 * public county National Risk Index. No API key. Not used by `npm run build`.
 *
 *   npm run hazard:lookup -- 70112
 */

const FEMA_NRI_COUNTIES_QUERY =
  "https://services.arcgis.com/XG15cJAlne2vxtgt/arcgis/rest/services/National_Risk_Index_Counties/FeatureServer/0/query";

const CROSSWALK_DIR = path.join(process.cwd(), "data", "zip-county");
const COUNTY_NAMES_PATH = path.join(process.cwd(), "data", "county-names.json");

function usage() {
  console.error("Usage: npm run hazard:lookup -- <ZIP>");
}

function normalizeZip(postalCode) {
  const match = /^(\d{5})(?:-\d{4})?$/.exec(postalCode.trim());
  return match ? match[1] : null;
}

function countiesForZip(zcta, zip) {
  const matches = Array.isArray(zcta?.[zip]) ? zcta[zip] : [];
  return matches
    .filter((row) => Array.isArray(row) && /^\d{5}$/.test(row[0]))
    .map((row) => ({
      countyFips: row[0],
      weight: row[1],
      weightKind: row[2] === "p" ? "population" : "land_area",
    }))
    .sort((left, right) => {
      if (left.weight !== right.weight) return right.weight - left.weight;
      if (left.countyFips === right.countyFips) return 0;
      return left.countyFips < right.countyFips ? -1 : 1;
    });
}

async function queryNri(countyFips) {
  const params = new URLSearchParams({
    where: `STCOFIPS='${countyFips}'`,
    outFields: "STCOFIPS,COUNTY,STATE,STATEABBRV,RISK_RATNG,RISK_SCORE",
    returnGeometry: "false",
    f: "json",
  });
  const response = await fetch(`${FEMA_NRI_COUNTIES_QUERY}?${params.toString()}`, {
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) return { status: "unavailable", reason: "http", httpStatus: response.status };
  const body = await response.json();
  if (!body || body.error || !Array.isArray(body.features)) {
    return { status: "unavailable", reason: "invalid_response" };
  }
  const attributes = body.features[0]?.attributes;
  if (!attributes) return { status: "not_found" };
  return {
    status: "ok",
    countyFips: attributes.STCOFIPS ?? countyFips,
    county: attributes.COUNTY ?? null,
    state: attributes.STATEABBRV ?? null,
    rating: attributes.RISK_RATNG ?? null,
    score: typeof attributes.RISK_SCORE === "number" ? attributes.RISK_SCORE : null,
  };
}

async function main() {
  const postalCode = process.argv[2];
  if (!postalCode) {
    usage();
    process.exit(2);
  }
  const zip = normalizeZip(postalCode);
  if (!zip) {
    console.error("That postal code is not a 5-digit ZIP or ZIP+4.");
    process.exit(1);
  }
  let shard;
  let index;
  let names = {};
  try {
    index = JSON.parse(await readFile(path.join(CROSSWALK_DIR, "index.json"), "utf8"));
    shard = JSON.parse(await readFile(path.join(CROSSWALK_DIR, `${zip.slice(0, 3)}.json`), "utf8"));
  } catch {
    console.error(`Crosswalk shard not found under ${CROSSWALK_DIR}`);
    process.exit(2);
  }
  try {
    names = JSON.parse(await readFile(COUNTY_NAMES_PATH, "utf8")).names ?? {};
  } catch {
    names = {};
  }
  const counties = countiesForZip(shard, zip).map((county) => ({
    ...county,
    countyName: names[county.countyFips] ?? county.countyFips,
  }));
  if (counties.length === 0) {
    console.error(
      `${zip} is not in the Census ZCTA crosswalk. PO Box and some unique ZIPs are left out. Enter the ZIP where you live.`,
    );
    process.exit(1);
  }
  const ratings = [];
  for (const county of counties) {
    try {
      ratings.push({ ...county, nri: await queryNri(county.countyFips) });
    } catch (error) {
      const timedOut = error instanceof Error && error.name === "TimeoutError";
      ratings.push({
        ...county,
        nri: { status: "unavailable", reason: timedOut ? "timeout" : "network" },
      });
    }
  }
  console.log(
    JSON.stringify(
      {
        zip,
        crosswalk: {
          vintage: index.vintage ?? null,
          sourceUrl: index.sourceUrl ?? null,
          populationSourceUrl: index.populationSourceUrl ?? null,
          ctSourceUrl: index.ctSourceUrl ?? null,
          weight: index.weight ?? null,
        },
        counties: ratings,
        note: "Counties are ranked by estimated 2020 population when that share exists, otherwise by land area. Ratings are FEMA National Risk Index values for each county. This is not an official alert. In an emergency, call 911.",
      },
      null,
      2,
    ),
  );
  if (ratings.some((county) => county.nri.status !== "ok")) process.exit(1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
