export const HAZARD_PROVIDER_ENV = "HAZARD_PROVIDER";

export const HAZARD_PROVIDER_TIMEOUT_ENV = "HAZARD_PROVIDER_TIMEOUT_MS";

export const DEFAULT_HAZARD_PROVIDER_TIMEOUT_MS = 8_000;

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
