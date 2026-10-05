import { requirePermission, requireUser } from "@/lib/api/auth";
import { dbError } from "@/lib/api/db";
import { handle, parseBody } from "@/lib/api/http";
import { policySchema } from "@/lib/api/retention";

// The organisation's default retention policy (RET-01), used by every study without its own.
export const PUT = handle(async (req: Request) => {
  const ctx = await requireUser(req);
  requirePermission(ctx, "invite_users");
  const { reason, ...p } = await parseBody(req, policySchema);
  const row = { ...p, start_date: p.start_date ?? null, notes: p.notes ?? null, change_reason: reason };
  const { data: existing } = await ctx.db.from("retention_policies").select("id").eq("org_id", ctx.orgId).is("study_id", null).maybeSingle();
  const { error } = existing
    ? await ctx.db.from("retention_policies").update(row).eq("id", existing.id)
    : await ctx.db.from("retention_policies").insert([{ ...row, org_id: ctx.orgId }]);
  if (error) throw dbError(error);
  return Response.json({ ok: true });
});
