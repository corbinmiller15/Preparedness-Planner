import type { LocalMessage } from "@/lib/i18n";
import type { RegionRef } from "@/lib/location/types";

export type HazardRatingLabel =
  | "very_high"
  | "relatively_high"
  | "relatively_moderate"
  | "relatively_low"
  | "very_low"
  | "insufficient_data"
  | "not_applicable"
  | "no_rating"
  | "unrecognized";

export type HazardRating = {
  key: string;
  name: string;
  rating: HazardRatingLabel;
  /** Present only when the provider sent a number. Never derived from the label. */
  score: number | null;
  raw: string | null;
};

export type HazardRatingsOk = {
  status: "ok";
  provenance: "fixture" | "live";
  providerId: string;
  composite: { rating: HazardRatingLabel; score: number | null; raw: string | null } | null;
  hazards: HazardRating[];
  disclaimer: LocalMessage | null;
};

export type HazardRatingsResult =
  HazardRatingsOk | { status: "unavailable"; message: LocalMessage } | { status: "not_found" };

export interface HazardProvider {
  readonly country: string;
  readonly id: string;
  ratingsForRegion(region: RegionRef): Promise<HazardRatingsResult>;
}

export type NriAttributes = Record<string, string | number | null | undefined>;
