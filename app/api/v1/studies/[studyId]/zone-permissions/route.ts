import { z } from "zod";
import { requirePermission, requireUser } from "@/lib/api/auth";
import { hasPermission } from "@/lib/permissions";
import { dbError, loadStudy, reason } from "@/lib/api/db";
import { handle, parseBody } from "@/lib/api/http";

const schema = z.object({
  user_id: z.string().uuid(),
  zone_num: z.string().regex(/^[0-9]{2}$/, "Zone must be a two-digit zone number"),
  level: z.enum(["none", "read", "contribute", "unblinded_contribute"]),
  reason,
}).strict();

// USR-05/06: the study's per-zone access grants and the caller's own levels. With no active grants the study
// keeps open access (everyone with study access reads and contributes; blinded documents stay hidden).
export const GET = handle(async (req: Request, { params }: { params: Promise<{ studyId: string }> }) => {
  const ctx = await requireUser(req);
  requirePermission(ctx, "view_study");
  const study = await loadStudy(ctx, (await params).studyId);
  const [grants, users] = await Promise.all([
    ctx.db.from("study_zone_permissions").select("id, user_id, zone_num, level, status, reason, created_by, created_at, approved_by, approved_at, decision_reason")
      .eq("study_id", study.id).in("status", ["pending", "active"]).order("zone_num"),
    ctx.db.from("user_roles").select("user_id, email, role").eq("org_id", ctx.orgId).eq("is_active", true),
  ]);
  if (grants.error) throw dbError(grants.error);
  if (users.error) throw dbError(users.error);
  const email = new Map((users.data ?? []).map((u) => [u.user_id, u.email]));
  return Response.json({
    restricted: (grants.data ?? []).some((g) => g.status === "active"),
    grants: (grants.data ?? []).map((g) => ({ ...g, email: email.get(g.user_id) ?? null, created_by_email: email.get(g.created_by) ?? null })),
    users: hasPermission(ctx.role, "manage_roles") ? users.data : [],
  });
});

// Grants a level on a zone. Unblinded Contribute is created pending until a second person approves it.
export const POST = handle(async (req: Request, { params }: { params: Promise<{ studyId: string }> }) => {
  const ctx = await requireUser(req);
  requirePermission(ctx, "manage_roles");
  const study = await loadStudy(ctx, (await params).studyId);
  const b = await parseBody(req, schema);
  const { data, error } = await ctx.db.rpc("grant_zone_permission", { p_study: study.id, p_user: b.user_id, p_zone: b.zone_num, p_level: b.level, p_reason: b.reason });
  if (error) throw dbError(error);
  return Response.json({ id: data, status: b.level === "unblinded_contribute" ? "pending" : "active" }, { status: 201 });
});
