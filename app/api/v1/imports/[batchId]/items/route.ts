import { z } from "zod";
import { requirePermission, requireUser } from "@/lib/api/auth";
import { dbError } from "@/lib/api/db";
import { handle, invalidRequest, parseBody } from "@/lib/api/http";
import { itemSchema, loadBatch, stagingPrefix } from "@/lib/api/imports";

const schema = z.object({ items: z.array(itemSchema).min(1).max(500) }).strict();

// Registers source documents in the batch (MIG-01): the staged file (uploaded by the browser under the
// batch's staging folder) and its manifest row. The server re-hashes every file before the dry run.
export const POST = handle(async (req: Request, { params }: { params: Promise<{ batchId: string }> }) => {
  const ctx = await requireUser(req);
  requirePermission(ctx, "invite_users");
  const b = await loadBatch(ctx, (await params).batchId);
  const { items } = await parseBody(req, schema);
  const prefix = stagingPrefix(b);
  const bad = items.find((i) => i.file_path && !i.file_path.startsWith(prefix));
  if (bad) throw invalidRequest(`Files must be staged under ${prefix} (${bad.source_path})`);
  const { data, error } = await ctx.db.from("import_items").insert(items.map((i) => ({
    org_id: b.org_id, batch_id: b.id, study_id: b.study_id, source_path: i.source_path, source_id: i.source_id ?? i.raw.source_id ?? null,
    file_path: i.file_path ?? null, file_name: i.file_name ?? null, file_type: i.file_type ?? null, file_size_bytes: i.file_size_bytes ?? null,
    declared_hash: i.declared_hash ?? null, raw: i.raw,
  }))).select("id");
  if (error) throw dbError(error);
  return Response.json({ added: data?.length ?? 0 }, { status: 201 });
});
