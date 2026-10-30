import type { PostalRegionResolver, PostalResolveResult } from "@/lib/location/types";

/** Outward-plus-inward shape. Not a full Royal Mail validator. */
const UK_POSTCODE = /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i;

/**
 * UK resolver stub. A well-formed postcode is recognized and then refused,
 * because no UK region dataset is loaded for this beta.
 */
export function createGbPostcodeResolver(): PostalRegionResolver {
  return {
    country: "GB",
    async resolve(postalCode: string): Promise<PostalResolveResult> {
      const compact = postalCode.trim();
      if (!UK_POSTCODE.test(compact)) {
        return { status: "invalid_postal_code", message: { key: "engine.hazard.invalid_postal" } };
      }
      return { status: "unavailable", message: { key: "engine.hazard.gb_unavailable" } };
    },
  };
}
