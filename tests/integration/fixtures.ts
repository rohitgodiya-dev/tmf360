// Test fixtures in the DEV project: throwaway organisations and users, removed after each file.
// Audit rows written during tests stay behind by design (the audit trail is append-only).
import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = () => process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = () => process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

let adminClient: SupabaseClient | null = null;
/** Service-role client for setting up and tearing down fixtures. Bypasses RLS. */
export function admin(): SupabaseClient {
  adminClient ??= createClient(url(), process.env.DEV_SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return adminClient;
}

/** A client with no session, i.e. an anonymous visitor. */
export function anonClient(): SupabaseClient {
  return createClient(url(), anonKey(), { auth: { persistSession: false, autoRefreshToken: false } });
}

export type TestUser = { id: string; email: string; token: string; orgId: string | null; db: SupabaseClient };

export class Fixtures {
  readonly runId = randomUUID().slice(0, 8);
  private userIds: string[] = [];
  private orgIds: string[] = [];
  private documentIds: string[] = [];
  private files: { bucket: string; path: string }[] = [];

  /** Registers a storage file for removal in cleanup(). */
  trackFile(bucket: string, path: string) {
    this.files.push({ bucket, path });
  }

  async org(label: string): Promise<string> {
    const { data, error } = await admin()
      .from("organizations")
      .insert([{ name: `test-${this.runId}-${label}` }])
      .select("id")
      .single();
    if (error) throw error;
    this.orgIds.push(data.id);
    return data.id;
  }

  /** Creates a confirmed auth user, optionally with an active role in an org, and signs them in. */
  async user(label: string, opts: { orgId?: string; role?: string } = {}): Promise<TestUser> {
    const email = `test-${this.runId}-${label}@example.test`;
    const password = `Pw-${randomUUID()}`;
    const { data, error } = await admin().auth.admin.createUser({ email, password, email_confirm: true });
    if (error || !data.user) throw error ?? new Error("createUser failed");
    this.userIds.push(data.user.id);

    if (opts.orgId) {
      const { error: roleErr } = await admin().from("user_roles").insert([{
        user_id: data.user.id, org_id: opts.orgId, role: opts.role ?? "System Administrator",
        email, is_active: true,
      }]);
      if (roleErr) throw roleErr;
    }

    const db = anonClient();
    const { data: session, error: signInErr } = await db.auth.signInWithPassword({ email, password });
    if (signInErr || !session.session) throw signInErr ?? new Error("sign-in failed");
    return { id: data.user.id, email, token: session.session.access_token, orgId: opts.orgId ?? null, db };
  }

  async document(fields: { orgId: string; userId: string; studyId: string; title?: string }): Promise<string> {
    const { data, error } = await admin().from("documents").insert([{
      org_id: fields.orgId, user_id: fields.userId, study_id: fields.studyId,
      artifact_name: fields.title ?? "Test document", status: "Draft",
    }]).select("id").single();
    if (error) throw error;
    this.documentIds.push(data.id);
    return data.id;
  }

  async cleanup() {
    const a = admin();
    for (const f of this.files) await a.storage.from(f.bucket).remove([f.path]);
    if (this.documentIds.length) await a.from("documents").delete().in("id", this.documentIds);
    if (this.userIds.length) await a.from("user_roles").delete().in("user_id", this.userIds);
    for (const id of this.userIds) await a.auth.admin.deleteUser(id);
    if (this.orgIds.length) await a.from("organizations").delete().in("id", this.orgIds);
  }
}

/** Builds a Request like the browser would send to an API route. */
export function apiRequest(path: string, init: RequestInit & { token?: string } = {}): Request {
  const headers = new Headers(init.headers);
  if (init.token) headers.set("Authorization", `Bearer ${init.token}`);
  return new Request(`http://localhost${path}`, { ...init, headers });
}
