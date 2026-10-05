import { z } from "zod";
import { requirePermission, requireUser } from "@/lib/api/auth";
import { dbError, isoDate, loadStudy } from "@/lib/api/db";
import { handle, parseBody } from "@/lib/api/http";
import { policyFields } from "@/lib/api/retention";

const schema = z.object({
  policy: policyFields.nullish(),
  marketing_authorisation_date: isoDate.nullish(),
  reason: z.string().trim().min(3).max(2000),
}).strict();

// Sets the study's own retention policy (RET-01) and/or its marketing authorisation date, which
// starts retention for policies with that trigger. The database audits both changes.
export const PUT = handle(async (req: Request, { params }: { params: Promise<{ studyId: string }> }) => {
  const ctx = await requireUser(req);
  requirePermission(ctx, "invite_users");
  const study = await loadStudy(ctx, (await params).studyId);
  const body = await parseBody(req, schema);

  if (body.policy) {
    const p = body.policy;
    const row = { ...p, start_date: p.start_date ?? null, notes: p.notes ?? null, change_reason: body.reason };
    const { data: existing } = await ctx.db.from("retention_policies").select("id").eq("study_id", study.id).maybeSingle();
    const { error } = existing
      ? await ctx.db.from("retention_policies").update(row).eq("id", existing.id)
      : await ctx.db.from("retention_policies").insert([{ ...row, study_id: study.id, org_id: study.org_id }]);
    if (error) throw dbError(error);
  }
  if (body.marketing_authorisation_date !== undefined) {
    const { data: before } = await ctx.db.from("studies").select("marketing_authorisation_date").eq("id", study.id).single();
    const { error } = await ctx.db.from("studies").update({ marketing_authorisation_date: body.marketing_authorisation_date }).eq("id", study.id);
    if (error) throw dbError(error);
    if ((before?.marketing_authorisation_date ?? null) !== (body.marketing_authorisation_date ?? null)) {
      const { error: aErr } = await ctx.db.from("audit_trail").insert([{
        user_id: ctx.user.id, user_email: ctx.user.email, org_id: study.org_id, action: "Marketing authorisation date set", study_id: study.study_id,
        field_changed: "studies.marketing_authorisation_date", old_value: before?.marketing_authorisation_date ?? null, new_value: body.marketing_authorisation_date ?? null, signature_reason: body.reason,
      }]);
      if (aErr) throw new Error(`Audit write failed: ${aErr.message}`);
    }
  }
  return Response.json({ ok: true });
});
