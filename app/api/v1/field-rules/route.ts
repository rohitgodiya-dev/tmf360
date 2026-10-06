import { z } from "zod";
import { requirePermission, requireUser } from "@/lib/api/auth";
import { dbError, insertRow, reason, rowVersion, updateVersioned } from "@/lib/api/db";
import { STANDARD_FIELDS, ruleSchema, type Rule } from "@/lib/api/fields";
import { handle, parseBody } from "@/lib/api/http";

// Required and type-specific fields per TMF artifact for the organisation (Part 22, RM-06).
export const GET = handle(async (req: Request) => {
  const ctx = await requireUser(req);
  const { data, error } = await ctx.db.from("artifact_field_rules").select("*").eq("org_id", ctx.orgId).order("artifact_num");
  if (error) throw dbError(error);
  return Response.json({ data, standard_fields: STANDARD_FIELDS });
});

const putSchema = ruleSchema.and(z.object({ row_version: rowVersion.optional(), change_reason: reason }));

// Creates or replaces the rule for one artifact. Applies to documents filed or submitted from now on.
export const PUT = handle(async (req: Request) => {
  const ctx = await requireUser(req);
  requirePermission(ctx, "invite_users");
  const { row_version, ...body } = await parseBody(req, putSchema);
  const { data: existing, error } = await ctx.db.from("artifact_field_rules").select("id, row_version").eq("org_id", ctx.orgId).eq("artifact_num", body.artifact_num).maybeSingle();
  if (error) throw dbError(error);
  const rule = existing
    ? await updateVersioned<Rule>(ctx, "artifact_field_rules", { id: existing.id }, row_version ?? existing.row_version, body)
    : await insertRow<Rule>(ctx, "artifact_field_rules", body);
  return Response.json(rule, { status: existing ? 200 : 201 });
});
