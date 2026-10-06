import { z } from "zod";
import { requirePermission, requireUser } from "@/lib/api/auth";
import { dbError, loadStudy, reason } from "@/lib/api/db";
import { studyHealth } from "@/lib/api/health";
import { conflict, handle, invalidRequest, parseBody } from "@/lib/api/http";
import { LIFECYCLE, SIGNED, TRANSITIONS, WHAT_HAPPENS, closeoutChecks, type LifecycleStatus } from "@/lib/api/lifecycle";
import { password, reauthenticate } from "@/lib/api/qc";
import { serviceClient } from "@/lib/api/service";

type Params = { params: Promise<{ studyId: string }> };

// Current lifecycle status, the allowed next steps (with what each does), close-out checks and history.
export const GET = handle(async (req: Request, { params }: Params) => {
  const ctx = await requireUser(req);
  const study = await loadStudy(ctx, (await params).studyId);
  const [row, history] = await Promise.all([
    ctx.db.from("studies").select("lifecycle_status, closed_at, archived_at").eq("id", study.id).single(),
    ctx.db.from("study_lifecycle_events").select("id, from_status, to_status, reason, details, performed_by_email, performed_at, signature_event_id")
      .eq("study_id", study.id).order("performed_at", { ascending: false }),
  ]);
  for (const r of [row, history]) if (r.error) throw dbError(r.error);
  const status = row.data!.lifecycle_status as LifecycleStatus;
  const checks = ["Active", "Closeout"].includes(status) ? await closeoutChecks(ctx, study) : null;
  return Response.json({
    status, stages: LIFECYCLE, closed_at: row.data!.closed_at, archived_at: row.data!.archived_at,
    next: TRANSITIONS[status].map((to) => ({ to, signed: !!SIGNED[to], meaning: SIGNED[to]?.meaning ?? null, what_happens: WHAT_HAPPENS[to],
      direction: LIFECYCLE.indexOf(to) > LIFECYCLE.indexOf(status) ? "forward" : "back" })),
    checks, history: history.data,
  });
});

const schema = z.object({
  to: z.enum(LIFECYCLE),
  reason,
  password: password.optional(),
  acknowledge_warnings: z.boolean().default(false),
}).strict();

// Moves the study one step. Closing and archiving are electronically signed; moving into close-out or closing
// with warnings needs them acknowledged, and what was acknowledged is kept with the history entry.
export const POST = handle(async (req: Request, { params }: Params) => {
  const ctx = await requireUser(req);
  requirePermission(ctx, "invite_users");
  const study = await loadStudy(ctx, (await params).studyId);
  const body = await parseBody(req, schema);
  const { data: row, error } = await ctx.db.from("studies").select("lifecycle_status").eq("id", study.id).single();
  if (error) throw dbError(error);
  const from = row.lifecycle_status as LifecycleStatus;
  if (!TRANSITIONS[from].includes(body.to)) throw conflict(`A study cannot move from ${from} to ${body.to}`);

  let details: Record<string, unknown> = {};
  if (body.to === "Closeout" || body.to === "Closed") {
    const checks = await closeoutChecks(ctx, study);
    if (checks.warnings.length && !body.acknowledge_warnings) {
      throw invalidRequest("Review and acknowledge the close-out warnings first", { warnings: checks.warnings });
    }
    details = { checks };
  }
  const signed = SIGNED[body.to];
  let proof: string | null = null;
  if (signed) {
    if (!body.password) throw invalidRequest("Enter your password to sign");
    proof = await reauthenticate(ctx, body.password, signed.purpose, null);
  }
  const { error: tErr } = await ctx.db.rpc("transition_study", { p_study: study.id, p_to: body.to, p_reason: body.reason, p_reauth: proof, p_details: details });
  if (tErr) throw dbError(tErr);

  if (body.to === "Closed") {
    // Final health snapshot for the record, as the Part 11c close-out does.
    const svc = serviceClient();
    await svc.rpc("evaluate_study", { p_study: study.id });
    const health = await studyHealth(svc, study);
    await svc.from("health_snapshots").upsert([{ org_id: study.org_id, study_id: study.id, taken_on: new Date().toISOString().slice(0, 10), indicators: health.values }],
      { onConflict: "study_id,taken_on" });
  }
  return Response.json({ status: body.to });
});
