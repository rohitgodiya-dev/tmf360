import { z } from "zod";
import { requirePermission, requireUser } from "@/lib/api/auth";
import { dbError, loadStudy } from "@/lib/api/db";
import { handle, invalidRequest, parseBody } from "@/lib/api/http";
import { newSecrets } from "@/lib/api/inspect";
import { people } from "@/lib/api/qc";

const node = z.string().regex(/^\d\d(\.\d\d){0,2}$/, "Use a zone (01), section (01.01) or artifact (01.01.01) number");
const schema = z.object({
  inspector_name: z.string().trim().min(2).max(200),
  inspector_email: z.string().trim().email().max(320).optional().or(z.literal("")),
  inspector_org: z.string().trim().min(2).max(200),
  purpose: z.string().trim().min(3).max(2000),
  starts_at: z.string().datetime({ offset: true }).optional(),
  ends_at: z.string().datetime({ offset: true }),
  scope_countries: z.array(z.string().uuid()).max(200).default([]),
  scope_sites: z.array(z.string().uuid()).max(500).default([]),
  scope_nodes: z.array(node).max(200).default([]),
  scope_statuses: z.array(z.enum(["Approved", "Under Review", "Draft", "Rejected"])).min(1).max(4).default(["Approved"]),
  include_versions: z.boolean().default(false),
  include_audit: z.boolean().default(false),
  download_mode: z.enum(["view_only", "watermark", "original"]).default("view_only"),
}).strict();

type SessionTimes = { revoked_at: string | null; locked_at: string | null; starts_at: string; ends_at: string };
const state = (s: SessionTimes) =>
  s.revoked_at ? "ended" : s.locked_at ? "locked" : Date.parse(s.ends_at) <= Date.now() ? "expired" : Date.parse(s.starts_at) > Date.now() ? "scheduled" : "active";

// Inspection sessions of a study (INS-01), newest first, with open-request counts.
export const GET = handle(async (req: Request, { params }: { params: Promise<{ studyId: string }> }) => {
  const ctx = await requireUser(req);
  requirePermission(ctx, "view_audit_trail");
  const study = await loadStudy(ctx, (await params).studyId);
  const [sessions, open] = await Promise.all([
    ctx.db.from("inspection_sessions").select("*").eq("study_id", study.id).order("created_at", { ascending: false }).limit(200),
    ctx.db.from("inspection_requests").select("session_id").eq("study_id", study.id).eq("status", "open"),
  ]);
  if (sessions.error) throw dbError(sessions.error);
  if (open.error) throw dbError(open.error);
  const openBy = new Map<string, number>();
  for (const r of open.data ?? []) openBy.set(r.session_id, (openBy.get(r.session_id) ?? 0) + 1);
  const who = await people(ctx);
  return Response.json({
    data: (sessions.data ?? []).map((s) => ({ ...s, state: state(s), open_requests: openBy.get(s.id) ?? 0, created_by_name: who.get(s.created_by)?.name ?? "Former member" })),
  });
});

// Creates a session and returns its secret link and access code ONCE: only their hashes are kept.
// Send the link and the code to the inspector by different channels.
export const POST = handle(async (req: Request, { params }: { params: Promise<{ studyId: string }> }) => {
  const ctx = await requireUser(req);
  requirePermission(ctx, "invite_users");
  const study = await loadStudy(ctx, (await params).studyId);
  const body = await parseBody(req, schema);
  const starts = body.starts_at ? Date.parse(body.starts_at) : Date.now();
  if (Date.parse(body.ends_at) <= Math.max(starts, Date.now())) throw invalidRequest("The end must be after the start and in the future");
  if (Date.parse(body.ends_at) - starts > 90 * 86400000) throw invalidRequest("A session can last at most 90 days");

  const secrets = newSecrets();
  const { data: id, error } = await ctx.db.rpc("create_inspection_session", {
    p: { ...body, study_id: study.id, inspector_email: body.inspector_email || null },
    p_token_hash: secrets.tokenHash, p_code_hash: secrets.codeHash,
  });
  if (error) throw dbError(error);
  const origin = new URL(req.url).origin;
  // The token travels in the URL fragment, which browsers never send to servers or write to logs.
  return Response.json({ id, link: `${origin}/inspect#t=${secrets.token}`, access_code: secrets.code }, { status: 201 });
});
