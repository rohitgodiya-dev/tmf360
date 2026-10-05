import { z } from "zod";
import { requirePermission, requireUser } from "@/lib/api/auth";
import { dbError, idParam, isoDate } from "@/lib/api/db";
import { handle, notFound, parseBody } from "@/lib/api/http";

const schema = z.object({
  artifact_num: z.string().regex(/^\d\d\.\d\d\.\d\d$/).nullish(),
  target_status: z.enum(["Final", "Draft"]).nullish(),
  study_site_id: z.string().uuid().nullish(),
  study_country_id: z.string().uuid().nullish(),
  title: z.string().trim().max(500).nullish(),
  version_label: z.string().trim().max(100).nullish(),
  effective_date: isoDate.nullish(),
  owner: z.string().trim().max(200).nullish(),
  exclude: z.string().trim().min(3, "Give a justification of at least 3 characters").max(2000).optional(),
  include: z.literal(true).optional(),
}).strict();

// The exception queue (MIG-04): re-map an item's values, exclude it with a justification, or put an
// excluded item back. Any change sends the batch back to draft so the dry run runs again. Audited.
export const PATCH = handle(async (req: Request, { params }: { params: Promise<{ itemId: string }> }) => {
  const ctx = await requireUser(req);
  requirePermission(ctx, "invite_users");
  const id = idParam((await params).itemId);
  const { exclude, include, ...fields } = await parseBody(req, schema);
  const patch: Record<string, unknown> = { ...fields };
  if (exclude) Object.assign(patch, { state: "excluded", exclusion_reason: exclude, change_reason: `Excluded: ${exclude}` });
  else if (include) Object.assign(patch, { state: "pending", exclusion_reason: null, change_reason: "Included again" });
  else Object.assign(patch, { state: "pending", change_reason: "Re-mapped" });
  const { data, error } = await ctx.db.from("import_items").update(patch).eq("id", id).select("*").maybeSingle();
  if (error) throw dbError(error);
  if (!data) throw notFound();
  return Response.json(data);
});
