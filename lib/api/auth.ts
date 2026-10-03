// Request authentication for /api/v1.
//
// The browser keeps its Supabase session locally and sends the access token as
// "Authorization: Bearer <token>". Every database call is then made with a client
// acting AS that user, so row-level security stays the final gatekeeper; the
// API adds its own checks on top, never instead.
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { hasPermission, type Permission, type Role } from "../permissions";
import { forbidden, unauthenticated } from "./http";

export type RequestContext = {
  user: User;
  orgId: string;
  role: Role;
  /** Supabase client that runs every query as this user (RLS applies). */
  db: SupabaseClient;
};

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable ${name}`);
  return value;
}

export function bearerToken(req: Request): string | null {
  const header = req.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header);
  return match ? match[1].trim() : null;
}

export async function requireUser(req: Request): Promise<RequestContext> {
  const token = bearerToken(req);
  if (!token) throw unauthenticated();

  const db = createClient(env("NEXT_PUBLIC_SUPABASE_URL"), env("NEXT_PUBLIC_SUPABASE_ANON_KEY"), {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Validates the token with Supabase Auth (signature, expiry, revoked sessions).
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) throw unauthenticated("Session is invalid or expired");

  const { data: roleRow } = await db
    .from("user_roles")
    .select("org_id, role")
    .eq("user_id", data.user.id)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();
  if (!roleRow?.org_id) throw forbidden("No active role in any organisation");

  return { user: data.user, orgId: roleRow.org_id, role: roleRow.role as Role, db };
}

export function requirePermission(ctx: RequestContext, permission: Permission) {
  if (!hasPermission(ctx.role, permission)) throw forbidden();
}
