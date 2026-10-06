import { z } from "zod";
import { requirePermission, requireUser } from "@/lib/api/auth";
import { dbError, idParam, reason } from "@/lib/api/db";
import { handle, notFound, parseBody } from "@/lib/api/http";

const schema = z.object({ reason }).strict();

// LNK-01: removes a link (kept as history with the reason; audited).
export const POST = handle(async (req: Request, { params }: { params: Promise<{ linkId: string }> }) => {
  const ctx = await requireUser(req);
  requirePermission(ctx, "upload_document");
  const id = idParam((await params).linkId);
  const { reason: why } = await parseBody(req, schema);
  const { data, error } = await ctx.db.from("document_links").update({ removed_at: new Date().toISOString(), remove_reason: why }).eq("id", id).is("removed_at", null).select("id").maybeSingle();
  if (error) throw dbError(error);
  if (!data) throw notFound();
  return Response.json({ ok: true });
});
