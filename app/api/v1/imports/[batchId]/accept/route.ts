import { z } from "zod";
import { requirePermission, requireUser } from "@/lib/api/auth";
import { dbError } from "@/lib/api/db";
import { handle, parseBody } from "@/lib/api/http";
import { loadBatch } from "@/lib/api/imports";
import { password, reauthenticate } from "@/lib/api/qc";
import { serviceClient } from "@/lib/api/service";

export const maxDuration = 300;
const schema = z.object({ password }).strict();

// MIG-06/07: electronic signature "Import reconciled and accepted", then every ready item is filed into
// the live TMF with its provenance. Files were re-hashed by the server during reconciliation, so their
// first file version is recorded as verified.
export const POST = handle(async (req: Request, { params }: { params: Promise<{ batchId: string }> }) => {
  const ctx = await requireUser(req);
  requirePermission(ctx, "invite_users");
  const b = await loadBatch(ctx, (await params).batchId);
  const { password: pw } = await parseBody(req, schema);
  const proof = await reauthenticate(ctx, pw, "import_acceptance", null);
  const { data: filed, error } = await ctx.db.rpc("accept_import", { p_batch: b.id, p_reauth: proof });
  if (error) throw dbError(error);

  const svc = serviceClient();
  const { data: items } = await svc.from("import_items").select("document_id, server_hash").eq("batch_id", b.id).eq("state", "imported");
  for (const it of items ?? []) {
    await svc.from("document_file_versions").update({ verification_status: "verified", verified_hash: it.server_hash, verified_at: new Date().toISOString() })
      .eq("document_id", it.document_id).eq("version_no", 1);
  }
  return Response.json({ filed });
});
