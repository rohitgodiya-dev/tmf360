import { z } from "zod";
import { writeAudit } from "@/lib/api/audit";
import { requirePermission, requireUser } from "@/lib/api/auth";
import { endOfDay } from "@/lib/api/cro";
import { dbError, idParam, isoDate, reason } from "@/lib/api/db";
import { handle, invalidRequest, notFound, parseBody } from "@/lib/api/http";

// Revoke a study membership, or change its end date (Part 17). Memberships are never deleted.
const schema = z.object({
  action: z.enum(["revoke", "set_expiry"]),
  expires_on: isoDate.nullish(),
  reason,
});

export const PATCH = handle(async (req: Request, { params }: { params: Promise<{ memberId: string }> }) => {
  const ctx = await requireUser(req);
  requirePermission(ctx, "invite_users");
  const id = idParam((await params).memberId);
  const body = await parseBody(req, schema);
  const { data: m, error } = await ctx.db.from("study_members").select("id, study_id, email, is_active, expires_at").eq("id", id).maybeSingle();
  if (error) throw dbError(error);
  if (!m) throw notFound();
  const { data: allowed } = await ctx.db.rpc("can_access_study", { p_user_id: ctx.user.id, p_study_id: m.study_id, p_org_id: ctx.orgId });
  if (!allowed) throw notFound();

  let patch: Record<string, unknown>;
  let summary: string;
  if (body.action === "revoke") {
    if (m.is_active === false) throw invalidRequest("This access is already revoked");
    patch = { is_active: false, deactivation_reason: body.reason };
    summary = `${m.email}: access revoked`;
  } else {
    const expiresAt = body.expires_on ? endOfDay(body.expires_on) : null;
    if (expiresAt && expiresAt <= new Date().toISOString()) throw invalidRequest("The access end date must be in the future");
    patch = { expires_at: expiresAt, is_active: true };
    summary = `${m.email}: access ${body.expires_on ? `until ${body.expires_on}` : "without end date"}`;
  }
  const { data: updated, error: uErr } = await ctx.db.from("study_members").update(patch).eq("id", id).select().single();
  if (uErr) throw dbError(uErr);
  await writeAudit(ctx, { action: body.action === "revoke" ? "Study access revoked" : "Study access end date changed",
    studyId: m.study_id, field: "study_members", oldValue: m.expires_at, newValue: summary, reason: body.reason });
  return Response.json(updated);
});
