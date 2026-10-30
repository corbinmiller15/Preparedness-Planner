import type { PostalRegionResolver, PostalResolveResult } from "@/lib/location/types";
import { US_ZIP_COUNTY_FIXTURE, type UsZipCountyRow } from "@/lib/location/us/fixture";

export function normalizeUsPostalCode(postalCode: string): string | null {
  const compact = postalCode.trim();
  const match = /^(\d{5})(?:-\d{4})?$/.exec(compact);
  return match ? match[1] : null;
}

export function createUsZipCountyResolver(
  rows: readonly UsZipCountyRow[] = US_ZIP_COUNTY_FIXTURE,
): PostalRegionResolver {
  const byZip = new Map(rows.map((row) => [row.zip, row]));
  return {
    country: "US",
    async resolve(postalCode: string): Promise<PostalResolveResult> {
      const zip = normalizeUsPostalCode(postalCode);
      if (!zip) {
        return { status: "invalid_postal_code", message: { key: "engine.hazard.invalid_postal" } };
      }
      const row = byZip.get(zip);
      if (!row) {
        return { status: "not_found", message: { key: "engine.hazard.not_found" } };
      }
      return {
        status: "found",
        region: {
          country: "US",
          id: row.countyFips,
          name: row.countyName,
          kind: "county_or_equivalent",
          subdivisionCode: row.stateAbbr,
          subdivisionName: row.stateName,
        },
      };
    },
  };
}
