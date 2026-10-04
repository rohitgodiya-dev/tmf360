import { requireUser } from "@/lib/api/auth";
import { dbError, idParam } from "@/lib/api/db";
import { handle, notFound } from "@/lib/api/http";
import { people, timeline } from "@/lib/api/qc";

// A document's workflow timeline (WFL-03/04) with QC decisions and their signature manifestations.
export const GET = handle(async (req: Request, { params }: { params: Promise<{ documentId: string }> }) => {
  const ctx = await requireUser(req);
  const id = idParam((await params).documentId);
  const { data: doc, error } = await ctx.db.from("documents")
    .select("id, status, created_at, user_id, rejection_reason").eq("id", id).maybeSingle();
  if (error) throw dbError(error);
  if (!doc) throw notFound();
  const who = await people(ctx);
  return Response.json({
    id, status: doc.status,
    filed: { at: doc.created_at, by: doc.user_id ? who.get(doc.user_id)?.name ?? "Former member" : null },
    steps: await timeline(ctx, id, who),
  });
});
