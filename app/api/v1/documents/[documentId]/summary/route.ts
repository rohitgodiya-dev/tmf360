import { summarise } from "@/lib/api/ai";
import { requirePermission, requireUser } from "@/lib/api/auth";
import { idParam } from "@/lib/api/db";
import { handle } from "@/lib/api/http";

export const maxDuration = 120;

// AI-05: a short summary of the document for the viewer, stored as a recommendation with its
// evidence; reused for the same file version.
export const POST = handle(async (req: Request, { params }: { params: Promise<{ documentId: string }> }) => {
  const ctx = await requireUser(req);
  requirePermission(ctx, "view_document");
  return Response.json(await summarise(ctx, idParam((await params).documentId)));
});
