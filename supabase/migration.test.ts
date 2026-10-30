import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ACTIVITY_LEVELS, PREGNANCY_STATUSES } from "@/lib/facts/calories";
import {
  BUDGET_LEVELS,
  HOME_TYPES,
  PLAN_TIERS,
  STORAGE_SPACES,
  UNIT_SYSTEMS,
} from "@/lib/onboarding/options";

const sql = readFileSync(new URL("./migrations/0001_init.sql", import.meta.url), "utf8");

describe("initial migration", () => {
  it("creates account-scoped tables, onboarding enums, and row level security", () => {
    for (const name of ["profiles", "household_members", "plans", "reminders"]) {
      expect(sql).toContain(`create table public.${name}`);
      expect(sql).toContain(`alter table public.${name} enable row level security`);
    }
    for (const value of [
      ...HOME_TYPES,
      ...BUDGET_LEVELS,
      ...STORAGE_SPACES,
      ...PLAN_TIERS,
      ...UNIT_SYSTEMS,
    ]) {
      expect(sql).toContain(`'${value}'`);
    }
    for (const status of PREGNANCY_STATUSES) expect(sql).toContain(`'${status}'`);
    for (const level of ACTIVITY_LEVELS) expect(sql).toContain(`'${level}'`);
    expect(sql).toContain("activity_level");
    expect(sql).toContain("account_id = auth.uid()");
    expect(sql).toContain("id = auth.uid()");
    expect(sql).toContain("country_code");
    expect(sql).toContain("postal_code");
    expect(sql).not.toContain("budget_path");
    expect(sql).toContain("revoke all on table public.profiles from anon");
  });
});
