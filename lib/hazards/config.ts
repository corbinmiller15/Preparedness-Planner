export const HAZARD_PROVIDER_ENV = "HAZARD_PROVIDER";

export const HAZARD_PROVIDER_TIMEOUT_ENV = "HAZARD_PROVIDER_TIMEOUT_MS";

export const DEFAULT_HAZARD_PROVIDER_TIMEOUT_MS = 8_000;

/** Successful National Risk Index responses are reused for a day. The index itself is updated about yearly. */
export const DEFAULT_NRI_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export const HAZARD_PROVIDER_CACHE_TTL_ENV = "HAZARD_PROVIDER_CACHE_TTL_MS";

export type HazardProviderMode = "fixture" | "fema_nri";

/** `fema_nri` selects the live county layer. Any other value, including unset, stays on the fixture. */
export function hazardProviderMode(
  env: Record<string, string | undefined> = process.env,
): HazardProviderMode {
  const value = env[HAZARD_PROVIDER_ENV]?.trim().toLowerCase();
  return value === "fema_nri" ? "fema_nri" : "fixture";
}

export function hazardProviderTimeoutMs(
  env: Record<string, string | undefined> = process.env,
  fallback = DEFAULT_HAZARD_PROVIDER_TIMEOUT_MS,
): number {
  const raw = env[HAZARD_PROVIDER_TIMEOUT_ENV]?.trim();
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) return fallback;
  return value;
}

/** `0` turns the in-memory National Risk Index cache off. */
export function hazardProviderCacheTtlMs(
  env: Record<string, string | undefined> = process.env,
  fallback = DEFAULT_NRI_CACHE_TTL_MS,
): number {
  const raw = env[HAZARD_PROVIDER_CACHE_TTL_ENV]?.trim();
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) return fallback;
  return value;
}
