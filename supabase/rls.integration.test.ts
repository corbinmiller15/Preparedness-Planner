import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { describe, expect, it } from "vitest";

const PARENT = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";

const migrationSql = ["0001_init.sql", "0002_birth_date.sql"]
  .map((name) => readFileSync(new URL(`./migrations/${name}`, import.meta.url), "utf8"))
  .join("\n");

async function database(): Promise<PGlite> {
  const db = new PGlite({ extensions: { pgcrypto } });
  await db.exec(`
    create schema if not exists auth;
    create table auth.users (id uuid primary key);
    create table auth.session_uid (
      id int primary key default 1 check (id = 1),
      uid uuid
    );
    insert into auth.session_uid (uid) values (null);
    create function auth.uid()
    returns uuid
    language sql
    stable
    security definer
    set search_path = auth, public
    as $$
      select uid from auth.session_uid where id = 1
    $$;
    create role anon nologin;
    create role authenticated nologin;
    grant anon to current_user;
    grant authenticated to current_user;
  `);
  await db.exec(migrationSql);
  return db;
}

async function actAs(db: PGlite, userId: string): Promise<void> {
  await db.exec("reset role");
  await db.query("update auth.session_uid set uid = $1", [userId]);
  await db.exec("set role authenticated");
}

describe("household member row level security", () => {
  it("keeps a child row inside the parent account", async () => {
    const db = await database();
    try {
      await db.query("insert into auth.users (id) values ($1), ($2)", [PARENT, OTHER]);
      await db.query(
        `insert into public.household_members (account_id, label, birth_year, birth_month, birth_day, is_child)
         values ($1, 'Kid', 2024, 12, 15, true)`,
        [PARENT],
      );

      await actAs(db, OTHER);
      const hidden = await db.query<{ id: string }>("select id from public.household_members");
      expect(hidden.rows).toEqual([]);

      let denied: { code?: string; message?: string } | undefined;
      try {
        await db.query(
          `insert into public.household_members (account_id, label, age, is_child)
           values ($1, 'Sneak', 4, true)`,
          [PARENT],
        );
      } catch (error) {
        denied = error as { code?: string; message?: string };
      }
      expect(denied?.code).toBe("42501");
      expect(denied?.message).toContain("row-level security");

      await actAs(db, PARENT);
      const visible = await db.query<{
        label: string;
        is_child: boolean;
        account_id: string;
      }>("select label, is_child, account_id from public.household_members");
      expect(visible.rows).toEqual([{ label: "Kid", is_child: true, account_id: PARENT }]);

      await db.exec("reset role");
      const identities = await db.query<{ child_logins: number; child_profiles: number }>(`
        select
          (select count(*)::int from public.household_members m
            where m.is_child and exists (select 1 from auth.users u where u.id = m.id)) as child_logins,
          (select count(*)::int from public.household_members m
            where m.is_child and exists (select 1 from public.profiles p where p.id = m.id)) as child_profiles
      `);
      expect(identities.rows[0]).toEqual({ child_logins: 0, child_profiles: 0 });

      let impossible: unknown;
      try {
        await db.query(
          `insert into public.household_members (account_id, label, birth_year, birth_month, birth_day, is_child)
           values ($1, 'Impossible', 2026, 2, 31, true)`,
          [PARENT],
        );
      } catch (error) {
        impossible = error;
      }
      expect(impossible).toBeTruthy();
    } finally {
      await db.close();
    }
  }, 30_000);
});
