import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildRankedRows,
  parseCensusZctaCounty,
  parseConnecticutPlanningParts,
  parseConnecticutTownCrosswalk,
  rankCountyParts,
} from "../../../scripts/build-zip-county-crosswalk.mjs";
import {
  createUsZipCountyCrosswalkResolver,
  lookupZipCounties,
  type ZipCountyMatch,
} from "@/lib/location/us/crosswalk";
import {
  clearZipCountyCrosswalkCache,
  countyName,
  crosswalkFileReads,
  loadZipShard,
  parseZipShardJson,
} from "@/lib/location/us/crosswalk-file";

const rows: ZipCountyMatch[] = [
  { zip: "10001", countyFips: "36061", weight: 1, weightKind: "population" },
  { zip: "73949", countyFips: "40007", weight: 0.25, weightKind: "population" },
  { zip: "73949", countyFips: "20093", weight: 0.75, weightKind: "population" },
  { zip: "50000", countyFips: "36061", weight: 0.5, weightKind: "land_area" },
  { zip: "50000", countyFips: "36005", weight: 0.5, weightKind: "land_area" },
];

describe("ZIP to county crosswalk", () => {
  it("returns the only county for a single-county ZIP", () => {
    const found = lookupZipCounties(rows, "10001");
    expect(found.status).toBe("found");
    if (found.status !== "found") return;
    expect(found.counties).toEqual([
      { zip: "10001", countyFips: "36061", weight: 1, weightKind: "population" },
    ]);
  });

  it("accepts ZIP+4 and surrounding spaces for that county", () => {
    expect(lookupZipCounties(rows, " 10001-1234 ").status).toBe("found");
  });

  it("returns every county for a split ZIP ranked by weight", () => {
    const found = lookupZipCounties(rows, "73949");
    expect(found.status).toBe("found");
    if (found.status !== "found") return;
    expect(found.counties.map((county) => [county.countyFips, county.weight])).toEqual([
      ["20093", 0.75],
      ["40007", 0.25],
    ]);
  });

  it("breaks equal weights by the lower county FIPS", () => {
    const found = lookupZipCounties(rows, "50000");
    expect(found.status).toBe("found");
    if (found.status !== "found") return;
    expect(found.counties.map((county) => county.countyFips)).toEqual(["36005", "36061"]);
  });

  it("returns not_found for an unknown ZIP", () => {
    expect(lookupZipCounties(rows, "00501")).toEqual({
      status: "not_found",
      message: { key: "engine.hazard.not_found" },
    });
  });

  it("rejects malformed postal input", () => {
    for (const input of ["", "abc", "1234", "123456", "10001-12", "12 345", "100011234"]) {
      expect(lookupZipCounties(rows, input).status, input).toBe("invalid_postal_code");
    }
    expect(lookupZipCounties(rows, null).status).toBe("invalid_postal_code");
    expect(lookupZipCounties(rows, undefined).status).toBe("invalid_postal_code");
    expect(lookupZipCounties(rows, 10001).status).toBe("invalid_postal_code");
  });

  it("returns every matching county from the resolver, ranked by weight", async () => {
    const resolver = createUsZipCountyCrosswalkResolver(rows);
    await expect(resolver.resolve("73949")).resolves.toEqual({
      status: "found",
      region: {
        country: "US",
        id: "20093",
        name: "20093",
        kind: "county_or_equivalent",
        subdivisionCode: "KS",
        subdivisionName: "Kansas",
      },
      counties: [
        { id: "20093", name: "20093", weight: 0.75, weightKind: "population" },
        { id: "40007", name: "40007", weight: 0.25, weightKind: "population" },
      ],
    });
  });

  it("asks for a home ZIP when the code is not a ZCTA", async () => {
    const resolver = createUsZipCountyCrosswalkResolver(rows);
    await expect(resolver.resolve("73301")).resolves.toEqual({
      status: "not_found",
      message: { key: "engine.hazard.enter_home_zip" },
    });
  });
});

describe("county ranking", () => {
  it("ranks by population when every part has a population", () => {
    expect(
      rankCountyParts([
        { countyFips: "47125", population: 20, land: 800 },
        { countyFips: "21047", population: 80, land: 200 },
      ]),
    ).toEqual([
      ["21047", 0.8, "p"],
      ["47125", 0.2, "p"],
    ]);
  });

  it("falls back to land area when population is missing or zero", () => {
    expect(
      rankCountyParts([
        { countyFips: "47125", population: null, land: 80 },
        { countyFips: "21047", population: 10, land: 20 },
      ]),
    ).toEqual([
      ["47125", 0.8, "l"],
      ["21047", 0.2, "l"],
    ]);
    expect(
      rankCountyParts([
        { countyFips: "36061", population: 0, land: 10 },
        { countyFips: "36005", population: 0, land: 30 },
      ]),
    ).toEqual([
      ["36005", 0.75, "l"],
      ["36061", 0.25, "l"],
    ]);
  });
});

describe("Connecticut planning regions", () => {
  const header = ["GEOID_COUSUB_22", "GEOID_ZCTA5_20", "AREALAND_COUSUB_22", "AREALAND_PART"].join(
    "|",
  );

  it("maps a New Haven ZIP onto the planning region and ranks by town population", () => {
    const text = [
      header,
      "0917035650|06511|100|10",
      "0917052070|06511|1000|90",
      "0914010000|06000|100|80",
      "0917010000|06000|1000|20",
    ].join("\n");
    const towns = parseConnecticutTownCrosswalk(
      [
        "09|009|New Haven County|170|South Central|35650|0900935650|0917035650|Hamden town",
        "09|009|New Haven County|170|South Central|52070|0900952070|0917052070|New Haven town",
        "09|009|New Haven County|140|Naugatuck Valley|10000|0900910000|0914010000|One town",
        "09|009|New Haven County|170|South Central|10000|0900910001|0917010000|Two town",
      ].join("\n"),
    );
    const population = new Map([
      ["0900935650", 0],
      ["0900952070", 1000],
      ["0900910000", 10],
      ["0900910001", 1000],
    ]);
    const parts = parseConnecticutPlanningParts(text, towns, population);
    expect(rankCountyParts(parts.get("06511") ?? [])).toEqual([["09170", 1, "p"]]);
    const split = rankCountyParts(parts.get("06000") ?? []);
    expect(split[0]?.[0]).toBe("09170");
    expect(split[0]?.[2]).toBe("p");
    expect(split.map((row) => row[0])).toEqual(["09170", "09140"]);
  });
});

describe("Census relationship parsing", () => {
  it("reads a ZCTA to county land file and drops blank ZCTAs", () => {
    const text = [
      "GEOID_ZCTA5_20|GEOID_COUNTY_20|AREALAND_PART",
      "10001|36061|1000",
      "|01001|5",
      "73949|20093|7500",
      "73949|40007|2500",
    ].join("\n");
    expect(parseCensusZctaCounty(text)).toEqual([
      { zip: "10001", countyFips: "36061", land: 1000 },
      { zip: "73949", countyFips: "20093", land: 7500 },
      { zip: "73949", countyFips: "40007", land: 2500 },
    ]);
  });

  it("replaces retired Connecticut county codes with planning regions", () => {
    const rows = buildRankedRows(
      [
        { zip: "06511", countyFips: "09009", land: 100 },
        { zip: "10001", countyFips: "36061", land: 50 },
      ],
      new Map([["10001|36061", 10]]),
      new Map([["06511", [{ countyFips: "09170", population: 20, land: 100 }]]]),
    );
    expect(rows).toEqual([
      ["06511", "09170", 1, "p"],
      ["10001", "36061", 1, "p"],
    ]);
    expect(rows.some((row) => row[1].startsWith("090"))).toBe(false);
  });
});

describe("crosswalk shards", () => {
  it("reads a prefix shard and skips a malformed row", () => {
    expect(parseZipShardJson(JSON.stringify({ "10001": [["36061", 1, "p"], ["nope"]] }))).toEqual([
      { zip: "10001", countyFips: "36061", weight: 1, weightKind: "population" },
    ]);
    expect(parseZipShardJson("{")).toEqual([]);
  });

  it("loads one ZIP prefix per read and does not load another prefix", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "crosswalk-"));
    writeFileSync(path.join(dir, "100.json"), JSON.stringify({ "10001": [["36061", 1, "l"]] }));
    writeFileSync(path.join(dir, "065.json"), JSON.stringify({ "06511": [["09170", 1, "p"]] }));
    clearZipCountyCrosswalkCache();
    const before = crosswalkFileReads();
    expect(loadZipShard("100", dir).map((row) => row.zip)).toEqual(["10001"]);
    expect(loadZipShard("100", dir)).toHaveLength(1);
    expect(crosswalkFileReads() - before).toBe(1);
    expect(loadZipShard("065", dir).map((row) => row.countyFips)).toEqual(["09170"]);
    expect(loadZipShard("065", dir).some((row) => row.zip === "10001")).toBe(false);
    expect(crosswalkFileReads() - before).toBe(2);
  });

  it("uses bundled Census names, including a Connecticut planning region", () => {
    expect(countyName("22071")).toBe("Orleans Parish");
    expect(countyName("09170")).toBe("South Central Connecticut Planning Region");
    expect(countyName("47125")).toBe("Montgomery County");
    expect(countyName("21047")).toBe("Christian County");
    expect(countyName("22071")).not.toBe("22071");
  });
});
