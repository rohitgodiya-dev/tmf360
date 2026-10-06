import { z } from "zod";
import { requireUser } from "@/lib/api/auth";
import { dbError, idParam } from "@/lib/api/db";
import { handle, notFound, parseBody } from "@/lib/api/http";
import { hasPermission } from "@/lib/permissions";

type Params = { params: Promise<{ documentId: string }> };

// Reviewer annotations on a document (Part 22, VWR-03): notes pinned to a page position, never deleted, only resolved.
export const GET = handle(async (req: Request, { params }: Params) => {
  const ctx = await requireUser(req);
  const id = idParam((await params).documentId);
  const { data: doc } = await ctx.db.from("documents").select("id").eq("id", id).maybeSingle();
  if (!doc) throw notFound();
  const { data, error } = await ctx.db.from("document_annotations")
    .select("id, page, x, y, body, status, created_by, created_by_email, created_at, resolved_by_email, resolved_at, resolution_note, file_version_id")
    .eq("document_id", id).order("created_at");
  if (error) throw dbError(error);
  return Response.json({ data, can_annotate: hasPermission(ctx.role, "review_document"), me: ctx.user.id });
});

const schema = z.object({
  page: z.number().int().min(1).max(100000),
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  body: z.string().trim().min(1, "Write the note").max(2000),
}).strict();

export const POST = handle(async (req: Request, { params }: Params) => {
  const ctx = await requireUser(req);
  const id = idParam((await params).documentId);
  const b = await parseBody(req, schema);
  const { data, error } = await ctx.db.rpc("add_annotation", { p_document: id, p_page: b.page, p_x: b.x, p_y: b.y, p_body: b.body });
  if (error) throw dbError(error);
  return Response.json({ id: data }, { status: 201 });
});
