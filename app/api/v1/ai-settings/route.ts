import { z } from "zod";
import { AI_MODEL, FEATURES, aiSettings } from "@/lib/api/ai";
import { requirePermission, requireUser } from "@/lib/api/auth";
import { dbError, reason } from "@/lib/api/db";
import { handle, parseBody } from "@/lib/api/http";

const schema = z.object({
  feature: z.enum(Object.keys(FEATURES) as [keyof typeof FEATURES, ...(keyof typeof FEATURES)[]]),
  enabled: z.boolean(),
  reason,
}).strict();

// AI-07: each capability's switch for the organisation, and the model in use.
export const GET = handle(async (req: Request) => {
  const ctx = await requireUser(req);
  return Response.json({ model: AI_MODEL, features: await aiSettings(ctx, ctx.orgId) });
});

export const PUT = handle(async (req: Request) => {
  const ctx = await requireUser(req);
  requirePermission(ctx, "manage_roles");
  const b = await parseBody(req, schema);
  const { data: existing } = await ctx.db.from("ai_settings").select("id").eq("org_id", ctx.orgId).eq("feature", b.feature).maybeSingle();
  const { error } = existing
    ? await ctx.db.from("ai_settings").update({ enabled: b.enabled, change_reason: b.reason }).eq("id", existing.id)
    : await ctx.db.from("ai_settings").insert([{ org_id: ctx.orgId, feature: b.feature, enabled: b.enabled, change_reason: b.reason }]);
  if (error) throw dbError(error);
  return Response.json({ model: AI_MODEL, features: await aiSettings(ctx, ctx.orgId) });
});
