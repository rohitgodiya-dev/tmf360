import { requirePermission, requireUser } from "@/lib/api/auth";
import { dbError } from "@/lib/api/db";
import { handle } from "@/lib/api/http";
import { loadBatch, stagingPrefix } from "@/lib/api/imports";
import { people } from "@/lib/api/qc";

// One batch with its items (the exception queue is the items in state "exception"), the staging
// folder for uploads, and the signature if it was accepted.
export const GET = handle(async (req: Request, { params }: { params: Promise<{ batchId: string }> }) => {
  const ctx = await requireUser(req);
  requirePermission(ctx, "invite_users");
  const b = await loadBatch(ctx, (await params).batchId);
  const [items, sig] = await Promise.all([
    ctx.db.from("import_items").select("*").eq("batch_id", b.id).order("created_at").limit(10000),
    b.signature_event_id ? ctx.db.from("signature_events").select("meaning, signer_name, signed_at").eq("id", b.signature_event_id).maybeSingle() : Promise.resolve({ data: null, error: null }),
  ]);
  if (items.error) throw dbError(items.error);
  const who = await people(ctx);
  return Response.json({
    batch: { ...b, created_by_name: who.get(b.created_by)?.name ?? "Former member" },
    staging_prefix: stagingPrefix(b),
    items: items.data ?? [],
    signature: sig.data,
  });
});
