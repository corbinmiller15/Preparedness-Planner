import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/supabase/database";
import { requireSupabaseEnv } from "@/lib/supabase/env";

export function createSupabaseBrowserClient() {
  const env = requireSupabaseEnv();
  return createBrowserClient<Database>(env.url, env.anonKey);
}
