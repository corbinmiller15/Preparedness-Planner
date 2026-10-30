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

    const members = sql.slice(
      sql.indexOf("create table public.household_members"),
      sql.indexOf("create index household_members_account_id_idx"),
    );
    expect(members).toMatch(/account_id uuid not null references public\.profiles \(id\)/);
    expect(members).toContain("is_child boolean not null default false");
    expect(members).not.toContain("auth.users");
    expect(sql.match(/references auth\.users/g)).toEqual(["references auth.users"]);
    expect(sql).toContain("create policy household_members_own on public.household_members");
    expect(sql).toMatch(
      /create policy household_members_own on public\.household_members[\s\S]*?for all to authenticated[\s\S]*?using \(account_id = auth\.uid\(\)\)[\s\S]*?with check \(account_id = auth\.uid\(\)\)/,
    );
  });

  it("stores a real birth month and day beside the parent account", () => {
    const birth = readFileSync(
      new URL("./migrations/0002_birth_date.sql", import.meta.url),
      "utf8",
    );
    expect(birth).toContain("add column birth_month integer");
    expect(birth).toContain("add column birth_day integer");
    expect(birth).toContain("household_members_birth_day_calendar_check");
    expect(birth).toContain("birth_year % 400 = 0");
    expect(birth).not.toContain("auth.users");
  });
});
