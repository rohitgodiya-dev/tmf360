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
  private studyIds: string[] = [];
  private memberUserIds: string[] = [];

  private emails: string[] = [];

  /** Registers an email whose auth account (created by code under test) is removed in cleanup(). */
  trackEmail(email: string) {
    this.emails.push(email.toLowerCase());
  }

  /** Registers an organisation created by code under test for removal in cleanup(). */
  trackOrg(id: string) {
    this.orgIds.push(id);
  }

  /** Registers a storage file for removal in cleanup(). */
  trackFile(bucket: string, path: string) {
    this.files.push({ bucket, path });
  }

  /** Creates an organisation; pass type "Site" for a Site360 site organisation. */
  async org(label: string, type?: string): Promise<string> {
    const { data, error } = await admin()
      .from("organizations")
      .insert([{ name: `test-${this.runId}-${label}`, ...(type ? { type } : {}) }])
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

  /** Creates a study and returns its row id (studies.id) and code (studies.study_id). */
  async study(orgId: string, label: string): Promise<{ id: string; code: string }> {
    const code = `S-${this.runId}-${label}`;
    const { data, error } = await admin().from("studies").insert([{ org_id: orgId, study_id: code, status: "Startup" }])
      .select("id").single();
    if (error) throw error;
    this.studyIds.push(data.id);
    return { id: data.id, code };
  }

  /** Gives a user access to a study through study membership (as User Management does). */
  async member(orgId: string, studyCode: string, user: TestUser, role: string) {
    const { error } = await admin().from("study_members").insert([{
      org_id: orgId, study_id: studyCode, user_id: user.id, email: user.email, role, is_active: true,
    }]);
    if (error) throw error;
    this.memberUserIds.push(user.id);
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
    // Study structure and directory rows (children first).
    if (this.orgIds.length) {
      for (const t of ["tmf_config", "milestones", "contact_roles", "study_sites", "study_countries", "study_parties", "persons", "parties"]) {
        await a.from(t).delete().in("org_id", this.orgIds);
      }
    }
    if (this.memberUserIds.length) await a.from("study_members").delete().in("user_id", this.memberUserIds);
    if (this.studyIds.length) await a.from("studies").delete().in("id", this.studyIds);
    if (this.documentIds.length) await a.from("documents").delete().in("id", this.documentIds);
    if (this.orgIds.length) await a.from("user_invitations").delete().in("org_id", this.orgIds);
    if (this.emails.length) {
      const { data } = await a.auth.admin.listUsers({ perPage: 1000 });
      for (const u of data?.users ?? []) {
        if (u.email && this.emails.includes(u.email.toLowerCase())) this.userIds.push(u.id);
      }
    }
    if (this.orgIds.length) await a.from("user_roles").delete().in("org_id", this.orgIds);
    if (this.userIds.length) await a.from("user_roles").delete().in("user_id", this.userIds);
    for (const id of this.userIds) await a.auth.admin.deleteUser(id);
    if (this.orgIds.length) await a.from("organizations").delete().in("id", this.orgIds);
  }
}

type Handler<P> = (req: Request, ctx: { params: Promise<P> }) => Promise<Response>;

/** Calls a route handler the way Next.js would, returning status and parsed JSON. */
export async function call<P extends Record<string, string>>(
  handler: Handler<P>,
  opts: { token?: string; method?: string; body?: unknown; params?: P },
): Promise<{ status: number; body: any }> { // eslint-disable-line @typescript-eslint/no-explicit-any
  const req = apiRequest("/api/v1/test", {
    method: opts.method ?? "GET",
    token: opts.token,
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    headers: opts.body === undefined ? undefined : { "Content-Type": "application/json" },
  });
  const res = await handler(req, { params: Promise.resolve((opts.params ?? {}) as P) });
  return { status: res.status, body: await res.json() };
}

/** Builds a Request like the browser would send to an API route. */
export function apiRequest(path: string, init: RequestInit & { token?: string } = {}): Request {
  const headers = new Headers(init.headers);
  if (init.token) headers.set("Authorization", `Bearer ${init.token}`);
  return new Request(`http://localhost${path}`, { ...init, headers });
}
