import { z } from "zod";
import { requirePermission, requireUser, sessionAal, bearerToken } from "@/lib/api/auth";
import { dbError, reason } from "@/lib/api/db";
import { handle, invalidRequest, parseBody } from "@/lib/api/http";

const schema = z.object({
  require_mfa: z.boolean(),
  sso_domain: z.string().trim().toLowerCase().regex(/^[a-z0-9.-]+\.[a-z]{2,}$/, "Use an email domain such as example.com").nullable(),
  reason,
}).strict();

// PLT-01: the organisation's sign-in policy (two-factor requirement, SSO email domain).
export const GET = handle(async (req: Request) => {
  const ctx = await requireUser(req);
  const { data, error } = await ctx.db.from("org_security_settings").select("require_mfa, sso_domain, updated_at").eq("org_id", ctx.orgId).maybeSingle();
  if (error) throw dbError(error);
  return Response.json({ require_mfa: data?.require_mfa ?? false, sso_domain: data?.sso_domain ?? null, session_aal: sessionAal(bearerToken(req)!) });
});

export const PUT = handle(async (req: Request) => {
  const ctx = await requireUser(req);
  requirePermission(ctx, "manage_roles");
  const b = await parseBody(req, schema);
  // Switching the requirement on from a one-factor session would lock the administrator out.
  if (b.require_mfa && sessionAal(bearerToken(req)!) !== "aal2") throw invalidRequest("Set up two-factor sign-in for yourself first, then sign in with it, before requiring it for everyone");
  const { data: existing } = await ctx.db.from("org_security_settings").select("org_id").eq("org_id", ctx.orgId).maybeSingle();
  const row = { require_mfa: b.require_mfa, sso_domain: b.sso_domain, change_reason: b.reason };
  const { error } = existing
    ? await ctx.db.from("org_security_settings").update(row).eq("org_id", ctx.orgId)
    : await ctx.db.from("org_security_settings").insert([{ org_id: ctx.orgId, ...row }]);
  if (error) throw dbError(error);
  return Response.json({ ok: true });
});
