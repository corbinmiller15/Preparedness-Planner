import { describe, expect, it } from "vitest";
import { parseCensusZctaCounty } from "../../../scripts/build-zip-county-crosswalk.mjs";
import {
  createUsZipCountyCrosswalkResolver,
  lookupZipCounties,
  type ZipCountyCrosswalkRow,
} from "@/lib/location/us/crosswalk";
import { parseZipCountyCrosswalkJson } from "@/lib/location/us/crosswalk-file";

const rows: ZipCountyCrosswalkRow[] = [
  {
    zip: "10001",
    countyFips: "36061",
    countyName: "New York County",
    stateAbbr: "NY",
    stateName: "New York",
    landAreaRatio: 1,
  },
  {
    zip: "73949",
    countyFips: "40007",
    countyName: "Alpha County",
    stateAbbr: "OK",
    stateName: "Oklahoma",
    landAreaRatio: 0.25,
  },
  {
    zip: "73949",
    countyFips: "20093",
    countyName: "Beta County",
    stateAbbr: "KS",
    stateName: "Kansas",
    landAreaRatio: 0.75,
  },
  {
    zip: "50000",
    countyFips: "36061",
    countyName: "New York County",
    stateAbbr: "NY",
    stateName: "New York",
    landAreaRatio: 0.5,
  },
  {
    zip: "50000",
    countyFips: "36005",
    countyName: "Bronx County",
    stateAbbr: "NY",
    stateName: "New York",
    landAreaRatio: 0.5,
  },
];

describe("ZIP to county crosswalk", () => {
  it("returns the only county for a single-county ZIP", () => {
    const found = lookupZipCounties(rows, "10001");
    expect(found.status).toBe("found");
    if (found.status !== "found") return;
    expect(found.counties).toHaveLength(1);
    expect(found.primary).toMatchObject({ countyFips: "36061", landAreaRatio: 1 });
    expect(found.counties[0]).toEqual(found.primary);
  });

  it("accepts ZIP+4 and surrounding spaces for that county", () => {
    expect(lookupZipCounties(rows, " 10001-1234 ").status).toBe("found");
  });

  it("returns every county for a split ZIP and picks the larger land-area share", () => {
    const found = lookupZipCounties(rows, "73949");
    expect(found.status).toBe("found");
    if (found.status !== "found") return;
    expect(found.counties.map((county) => [county.countyFips, county.landAreaRatio])).toEqual([
      ["20093", 0.75],
      ["40007", 0.25],
    ]);
    expect(found.primary.countyFips).toBe("20093");
    expect(found.primary.countyName).toBe("Beta County");
  });

  it("breaks equal land-area ratios by the lower county FIPS", () => {
    const found = lookupZipCounties(rows, "50000");
    expect(found.status).toBe("found");
    if (found.status !== "found") return;
    expect(found.counties.map((county) => county.countyFips)).toEqual(["36005", "36061"]);
    expect(found.primary.countyFips).toBe("36005");
  });

  it("returns not_found for an unknown ZIP", () => {
    expect(lookupZipCounties(rows, "00501")).toEqual({
      status: "not_found",
      message: { key: "engine.hazard.not_found" },
    });
    expect(lookupZipCounties(rows, "00000").status).toBe("not_found");
  });

  it("rejects malformed postal input", () => {
    for (const input of ["", "abc", "1234", "123456", "10001-12", "12 345", "100011234"]) {
      expect(lookupZipCounties(rows, input).status, input).toBe("invalid_postal_code");
    }
    expect(lookupZipCounties(rows, null).status).toBe("invalid_postal_code");
    expect(lookupZipCounties(rows, undefined).status).toBe("invalid_postal_code");
    expect(lookupZipCounties(rows, 10001).status).toBe("invalid_postal_code");
  });

  it("resolves the primary county through the postal resolver", async () => {
    const resolver = createUsZipCountyCrosswalkResolver(rows);
    await expect(resolver.resolve("73949")).resolves.toEqual({
      status: "found",
      region: {
        country: "US",
        id: "20093",
        name: "Beta County",
        kind: "county_or_equivalent",
        subdivisionCode: "KS",
        subdivisionName: "Kansas",
      },
    });
  });
});

describe("Census ZCTA relationship parser", () => {
  const header = [
    "AREALAND_PART",
    "GEOID_COUNTY_20",
    "AREALAND_ZCTA5_20",
    "NAMELSAD_COUNTY_20",
    "GEOID_ZCTA5_20",
  ].join("|");

  it("reads a single-county ZCTA and a split ZCTA from named columns", () => {
    const text = [
      header,
      "1000|36061|1000|New York County|10001",
      "2500|40007|10000|Alpha County|73949",
      "7500|20093|10000|Beta County|73949",
      "1|01001|1|Autauga County|",
      "0|36061|0|New York County|00501",
    ].join("\n");
    expect(parseCensusZctaCounty(text)).toEqual([
      ["10001", "36061", 1, "New York County", "NY", "New York"],
      ["73949", "20093", 0.75, "Beta County", "KS", "Kansas"],
      ["73949", "40007", 0.25, "Alpha County", "OK", "Oklahoma"],
    ]);
  });

  it("rejects a county whose state FIPS is not in the table", () => {
    const text = [header, "1000|99001|1000|Mystery County|10001"].join("\n");
    expect(() => parseCensusZctaCounty(text)).toThrow(/Unknown state FIPS: 99/);
  });
});

describe("crosswalk file", () => {
  it("reads tuple rows and skips a malformed row", () => {
    const parsed = parseZipCountyCrosswalkJson(
      JSON.stringify({
        format: 1,
        ratio: "land_area",
        source: "U.S. Census Bureau 2020 ZCTA to County Relationship File",
        rows: [["10001", "36061", 1, "New York County", "ny", "New York"], ["nope"]],
      }),
    );
    expect(parsed?.rows).toEqual([
      {
        zip: "10001",
        countyFips: "36061",
        landAreaRatio: 1,
        countyName: "New York County",
        stateAbbr: "NY",
        stateName: "New York",
      },
    ]);
  });

  it("returns null for malformed JSON, the wrong format, or no usable rows", () => {
    expect(parseZipCountyCrosswalkJson("{")).toBeNull();
    expect(
      parseZipCountyCrosswalkJson(JSON.stringify({ format: 2, ratio: "land_area", rows: [] })),
    ).toBeNull();
    expect(
      parseZipCountyCrosswalkJson(
        JSON.stringify({ format: 1, ratio: "land_area", rows: [["10001"]] }),
      ),
    ).toBeNull();
  });
});
