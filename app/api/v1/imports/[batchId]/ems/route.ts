import { z } from "zod";
import { writeAudit } from "@/lib/api/audit";
import { requirePermission, requireUser } from "@/lib/api/auth";
import { importEmsPackage } from "@/lib/api/ems";
import { handle, invalidRequest, parseBody } from "@/lib/api/http";
import { loadBatch, stagingPrefix } from "@/lib/api/imports";

// Unpacking and hashing every file of a package can take a while.
export const maxDuration = 300;

const schema = z.object({ file_path: z.string().min(1).max(1000) }).strict();

// MIG-09: loads a TMF Reference Model Exchange Mechanism package (a ZIP the browser staged in the batch
// folder) into this isolated batch. exchange.xml is validated and every file's INTEGRITY checked; the usual
// verify, dry run, reconciliation and signed acceptance then apply.
export const POST = handle(async (req: Request, { params }: { params: Promise<{ batchId: string }> }) => {
  const ctx = await requireUser(req);
  requirePermission(ctx, "invite_users");
  const b = await loadBatch(ctx, (await params).batchId);
  if (!["draft", "dry_run"].includes(b.status)) throw invalidRequest("Packages can only be loaded into a batch that is not reconciled, filed or cancelled");
  const { file_path } = await parseBody(req, schema);
  if (!file_path.startsWith(stagingPrefix(b)) || file_path.includes("..")) throw invalidRequest(`The package must be staged under ${stagingPrefix(b)}`);
  let result;
  try { result = await importEmsPackage(ctx, b, file_path); }
  catch (e) { throw invalidRequest((e as Error).message); }
  const { data: study } = await ctx.db.from("studies").select("study_id").eq("id", b.study_id).single();
  await writeAudit(ctx, { action: "TMF exchange package loaded", studyId: study?.study_id ?? null, field: `import_batch:${b.id}`,
    newValue: `${result.transfer_source_id} / ${result.transfer_id} (TMF RM ${result.tmfrm_version}): ${result.added} items, ${result.skipped.length} skipped` });
  return Response.json(result, { status: 201 });
});
