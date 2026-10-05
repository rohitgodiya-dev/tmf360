import { z } from "zod";
import { requirePermission, requireUser } from "@/lib/api/auth";
import { dbError, isoDate, loadStudy } from "@/lib/api/db";
import { handle, invalidRequest, parseBody } from "@/lib/api/http";
import { people } from "@/lib/api/qc";

const schema = z.object({
  title: z.string().trim().min(3).max(300),
  activity_type: z.enum(["tmf_review", "risk_review", "qc_review", "site_review", "vendor_oversight", "other"]),
  rationale: z.string().trim().min(3).max(4000),
  due_date: isoDate.nullish(),
  assignees: z.array(z.string().uuid()).max(20).default([]),
}).strict();

// Oversight activity list (OVS-04): status, reference, title, type, rationale, created, due,
// assignees, and for completed ones the outcome with its signature.
export const GET = handle(async (req: Request, { params }: { params: Promise<{ studyId: string }> }) => {
  const ctx = await requireUser(req);
  requirePermission(ctx, "view_gap_analysis");
  const study = await loadStudy(ctx, (await params).studyId);
  const [rows, sigs] = await Promise.all([
    ctx.db.from("oversight_activities").select("*").eq("study_id", study.id).order("created_at", { ascending: false }),
    ctx.db.from("signature_events").select("id, meaning, signer_name, signed_at").eq("study_id", study.id).eq("action", "oversight_review"),
  ]);
  if (rows.error) throw dbError(rows.error);
  if (sigs.error) throw dbError(sigs.error);
  const who = await people(ctx);
  const sig = new Map((sigs.data ?? []).map((s) => [s.id, s]));
  const today = new Date().toISOString().slice(0, 10);
  return Response.json({
    data: (rows.data ?? []).map((a) => ({
      ...a, assignee_names: (a.assignees as string[]).map((u) => who.get(u)?.name ?? "Former member"),
      created_by_name: who.get(a.created_by)?.name ?? "Former member", completed_by_name: a.completed_by ? who.get(a.completed_by)?.name ?? "Former member" : null,
      overdue: (a.status === "open" || a.status === "in_review") && !!a.due_date && a.due_date < today,
      signature: a.signature_event_id ? sig.get(a.signature_event_id) ?? null : null,
    })),
    people: [...who.values()].map((p) => ({ user_id: p.user_id, name: p.name, role: p.role })),
  });
});

export const POST = handle(async (req: Request, { params }: { params: Promise<{ studyId: string }> }) => {
  const ctx = await requireUser(req);
  requirePermission(ctx, "run_quality_checks");
  const study = await loadStudy(ctx, (await params).studyId);
  const body = await parseBody(req, schema);
  const who = await people(ctx);
  if (body.assignees.some((u) => !who.has(u))) throw invalidRequest("Assignees must be active members of your organisation");
  const { data, error } = await ctx.db.from("oversight_activities").insert([{
    org_id: study.org_id, study_id: study.id, title: body.title, activity_type: body.activity_type, rationale: body.rationale,
    due_date: body.due_date ?? null, assignees: body.assignees,
  }]).select("id, ref").single();
  if (error) throw dbError(error);
  return Response.json(data, { status: 201 });
});
