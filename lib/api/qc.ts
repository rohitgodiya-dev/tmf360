// Part 7: QC workflow helpers — re-authentication for signatures/attestations and task lists.
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { hasPermission } from "../permissions";
import { writeAudit } from "./audit";
import type { RequestContext } from "./auth";
import { invalidRequest } from "./http";
import { serviceClient } from "./service";

/**
 * Re-authenticates the signed-in user with their password (21 CFR 11.200: each signing needs
 * both components when not in one continuous session of controlled access) and returns a
 * single-use proof that the database requires before it records the decision.
 * Failed attempts are audited (11.300(d)).
 */
export type ReauthPurpose = "qc_decision" | "deletion_approval" | "reclassify" | "revision" | "study_closeout" | "study_reopen" | "archive_approval" | "oversight_review" | "import_acceptance" | "certified_copy" | "taxonomy_migration";

export async function reauthenticate(ctx: RequestContext, password: string, purpose: ReauthPurpose, documentId: string | null): Promise<string> {
  const email = ctx.user.email;
  if (!email) throw invalidRequest("Your account has no email address to confirm with");

  const check = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await check.auth.signInWithPassword({ email, password });
  if (error || data.user?.id !== ctx.user.id) {
    await writeAudit(ctx, { action: "Signature re-authentication failed", documentId, field: purpose });
    throw invalidRequest("That password is not correct");
  }
  // Only the check was needed: end the extra session it created.
  await check.auth.signOut({ scope: "local" });

  // A user's own session cannot write proofs; the service role does, after the check above.
  const { data: proof, error: pErr } = await serviceClient().from("reauth_proofs")
    .insert([{ user_id: ctx.user.id, purpose }]).select("id").single();
  if (pErr || !proof) throw new Error(`Could not record re-authentication: ${pErr?.message}`);
  return proof.id as string;
}

export const password = z.string().min(1, "Enter your password").max(200);

export type TaskRow = {
  id: string; document_id: string; study_id: string; task_type: string; position: number; cycle: number;
  assignee_role: string | null; assignee_user: string | null; due_at: string; status: string; outcome: string | null;
  completed_by: string | null; completed_at: string | null; cancel_reason: string | null; created_at: string; created_by: string | null;
};

/** Mirrors can_work_task() in the database, for "My tasks" and for showing the decision buttons. */
export function canWork(ctx: RequestContext, t: Pick<TaskRow, "assignee_role" | "assignee_user" | "status">): boolean {
  return t.status === "open"
    && hasPermission(ctx.role, "approve_document")
    && (t.assignee_user == null || t.assignee_user === ctx.user.id)
    && (t.assignee_role == null || t.assignee_role === ctx.role);
}

export const TASK_LABEL: Record<string, string> = { inbound_qc: "Inbound QC", post_approval_qc: "Post-Approval QC" };

export type Person = { user_id: string; name: string; email: string; role: string };

/** Active members of the caller's organisation, by user id (for assignee and signer names). */
export async function people(ctx: RequestContext): Promise<Map<string, Person>> {
  const { data, error } = await ctx.db.from("user_roles").select("user_id, email, full_name, role")
    .eq("org_id", ctx.orgId).eq("is_active", true);
  if (error) throw error;
  return new Map((data ?? []).map((p) => [p.user_id, { user_id: p.user_id, email: p.email ?? "", role: p.role, name: (p.full_name || "").trim() || p.email || "Unknown user" }]));
}

export function assigneeLabel(t: Pick<TaskRow, "assignee_role" | "assignee_user">, who: Map<string, Person>): string {
  if (t.assignee_user) return who.get(t.assignee_user)?.name ?? "Former member";
  return t.assignee_role ?? "Any approver";
}

/**
 * A document's timeline (WFL-03/04): when it was filed, then each QC task with its assignee,
 * due date and status, and for closed tasks the decision with its signature manifestation
 * (signer name, server time, meaning — SIG-02). Only rows the caller may read are used.
 */
export async function timeline(ctx: RequestContext, documentId: string, who: Map<string, Person>) {
  const [tasks, decisions, signatures, reasons] = await Promise.all([
    ctx.db.from("document_tasks").select("id, task_type, position, cycle, assignee_role, assignee_user, due_at, status, outcome, completed_by, completed_at, cancel_reason, created_at, created_by")
      .eq("document_id", documentId).order("created_at"),
    ctx.db.from("qc_decisions").select("task_id, outcome, reason_codes, comment, signature_event_id").eq("document_id", documentId),
    ctx.db.from("signature_events").select("id, kind, meaning, signer_name, signer_email, signed_at, file_hash").eq("document_id", documentId),
    ctx.db.from("qc_reasons").select("code, label").eq("org_id", ctx.orgId),
  ]);
  for (const r of [tasks, decisions, signatures, reasons]) if (r.error) throw r.error;
  const label = new Map((reasons.data ?? []).map((r) => [r.code, r.label]));
  const sigById = new Map((signatures.data ?? []).map((s) => [s.id, s]));
  const decisionByTask = new Map((decisions.data ?? []).map((d) => [d.task_id, d]));
  const now = Date.now();
  return (tasks.data ?? []).map((t) => {
    const d = decisionByTask.get(t.id);
    const s = d ? sigById.get(d.signature_event_id) : undefined;
    return {
      id: t.id, step: TASK_LABEL[t.task_type] ?? t.task_type, cycle: t.cycle, status: t.status,
      assignee: assigneeLabel(t, who), created_at: t.created_at, due_at: t.due_at,
      overdue: t.status === "open" && Date.parse(t.due_at) < now,
      completed_at: t.completed_at, completed_by: t.completed_by ? who.get(t.completed_by)?.name ?? "Former member" : null,
      cancel_reason: t.cancel_reason,
      decision: d ? { outcome: d.outcome, reasons: (d.reason_codes as string[]).map((c) => label.get(c) ?? c), comment: d.comment } : null,
      signature: s ? { kind: s.kind, meaning: s.meaning, signer: s.signer_name, email: s.signer_email, signed_at: s.signed_at, file_hash: s.file_hash } : null,
    };
  });
}

export const docTitle = (d: { custom_file_name?: string | null; artifact_name?: string | null }) =>
  (d.custom_file_name || "").trim() || d.artifact_name || "Untitled document";
