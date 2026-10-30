import { describe, expect, it } from "vitest";
import { getSupabaseEnv } from "@/lib/supabase/env";

describe("getSupabaseEnv", () => {
  it("returns null until both public settings are present", () => {
    expect(getSupabaseEnv({})).toBeNull();
    expect(getSupabaseEnv({ NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co" })).toBeNull();
    expect(
      getSupabaseEnv({
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon",
      }),
    ).toEqual({ url: "https://example.supabase.co", anonKey: "anon" });
  });
});
