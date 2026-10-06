import { z } from "zod";
import { requireUser } from "@/lib/api/auth";
import { dbError, idParam } from "@/lib/api/db";
import { handle, parseBody } from "@/lib/api/http";

// Resolve a reviewer annotation (Part 22, VWR-03), optionally with a note. The author or any reviewer may resolve.
const schema = z.object({ note: z.string().trim().max(2000).optional() }).strict();

export const POST = handle(async (req: Request, { params }: { params: Promise<{ annotationId: string }> }) => {
  const ctx = await requireUser(req);
  const id = idParam((await params).annotationId);
  const b = await parseBody(req, schema);
  const { error } = await ctx.db.rpc("resolve_annotation", { p_annotation: id, p_note: b.note ?? null });
  if (error) throw dbError(error);
  return Response.json({ resolved: true });
});
