// Service-role Supabase client: bypasses row-level security. Server-only.
//
// Use ONLY for operations a user's own session cannot perform (creating auth
// accounts, writing invitations), and only AFTER the caller has been
// authenticated and authorised in the route handler. Never query user data
// through it on a user's behalf; use RequestContext.db for that.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

export function serviceClient(): SupabaseClient {
  if (typeof window !== "undefined") throw new Error("serviceClient() must not run in the browser");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase service configuration");
  client ??= createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}
