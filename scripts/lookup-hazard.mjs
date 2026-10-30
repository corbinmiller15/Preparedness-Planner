import { readFile } from "node:fs/promises";
import path from "node:path";

/**
 * Resolves one ZIP with the generated Census crosswalk and queries the public
 * FEMA National Risk Index county layer. No API key.
 *
 *   npm run data:zip-county
 *   npm run hazard:lookup -- 70112
 *
 * The same selection rule as lib/location/us/crosswalk.ts: largest land-area
 * ratio, then the lower county FIPS. Ratings are FEMA's, not a local score.
 */

const FEMA_NRI_COUNTIES_QUERY =
  "https://services.arcgis.com/XG15cJAlne2vxtgt/arcgis/rest/services/National_Risk_Index_Counties/FeatureServer/0/query";

const CROSSWALK_PATH = path.join(process.cwd(), "data", "zip-county-crosswalk.json");

function usage() {
  console.error("Usage: npm run hazard:lookup -- <ZIP>");
  console.error("Generate the crosswalk first with: npm run data:zip-county");
}

function normalizeZip(postalCode) {
  const match = /^(\d{5})(?:-\d{4})?$/.exec(postalCode.trim());
  return match ? match[1] : null;
}

function countiesForZip(rows, zip) {
  const matches = [];
  for (const row of rows) {
    if (!Array.isArray(row) || row[0] !== zip) continue;
    matches.push({
      zip: row[0],
      countyFips: row[1],
      landAreaRatio: row[2],
      countyName: row[3],
      stateAbbr: row[4],
      stateName: row[5],
    });
  }
  matches.sort((left, right) => {
    if (left.landAreaRatio !== right.landAreaRatio) return right.landAreaRatio - left.landAreaRatio;
    if (left.countyFips === right.countyFips) return 0;
    return left.countyFips < right.countyFips ? -1 : 1;
  });
  return matches;
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
  if (!response.ok) {
    return { status: "unavailable", reason: "http", httpStatus: response.status };
  }
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
  let document;
  try {
    document = JSON.parse(await readFile(CROSSWALK_PATH, "utf8"));
  } catch {
    console.error(`Crosswalk file not found at ${CROSSWALK_PATH}`);
    usage();
    process.exit(2);
  }
  const counties = countiesForZip(document.rows ?? [], zip);
  if (counties.length === 0) {
    console.error(`${zip} is not in the Census ZCTA-county crosswalk.`);
    process.exit(1);
  }
  const primary = counties[0];
  let nri;
  try {
    nri = await queryNri(primary.countyFips);
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "TimeoutError";
    nri = { status: "unavailable", reason: timedOut ? "timeout" : "network" };
  }
  console.log(
    JSON.stringify(
      {
        zip,
        crosswalk: {
          source: document.source ?? null,
          attribution: document.attribution ?? null,
          ratio: "land_area",
        },
        primary,
        counties,
        nri,
        note: "County ratings are FEMA National Risk Index values. This is not an official alert. In an emergency, call 911.",
      },
      null,
      2,
    ),
  );
  if (nri.status !== "ok") process.exit(1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
