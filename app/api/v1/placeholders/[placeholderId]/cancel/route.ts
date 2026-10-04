import { z } from "zod";
import { requirePermission, requireUser } from "@/lib/api/auth";
import { dbError, idParam, reason } from "@/lib/api/db";
import { handle, notFound, parseBody } from "@/lib/api/http";

const schema = z.object({ reason }).strict();

// Cancel an open placeholder that is not needed, with a reason. It stops counting towards
// completeness; the record and its audit history stay.
export const POST = handle(async (req: Request, { params }: { params: Promise<{ placeholderId: string }> }) => {
  const ctx = await requireUser(req);
  requirePermission(ctx, "edit_study");
  const id = idParam((await params).placeholderId);
  const body = await parseBody(req, schema);
  const { data, error } = await ctx.db.from("placeholders")
    .update({ status: "cancelled", cancel_reason: body.reason, change_reason: body.reason })
    .eq("id", id).eq("status", "open").select("id, status").maybeSingle();
  if (error) throw dbError(error);
  if (!data) throw notFound();
  return Response.json(data);
});
