// Part 12b — migration and import (M18). Shared helpers for the import routes.
import { z } from "zod";
import type { RequestContext } from "./auth";
import { dbError, idParam } from "./db";
import { hashInPath, hashStoredFile } from "./files";
import { notFound } from "./http";
import { serviceClient } from "./service";

export type Batch = { id: string; org_id: string; study_id: string; name: string; source_system: string; status: string; dry_run_report: Record<string, unknown> | null;
  reconciliation: Record<string, unknown> | null; signature_event_id: string | null; filed_count: number | null; accepted_by: string | null; accepted_at: string | null;
  created_at: string; created_by: string; cancel_reason: string | null; description: string | null; dry_run_at: string | null; reconciled_at: string | null };

/** The batch, if the caller may see it (RLS: leads with study access); otherwise 404. */
export async function loadBatch(ctx: RequestContext, batchId: string): Promise<Batch> {
  const { data, error } = await ctx.db.from("import_batches").select("*").eq("id", idParam(batchId)).maybeSingle();
  if (error) throw dbError(error);
  if (!data) throw notFound();
  return data as Batch;
}

/** Staged files live under <org>/import/<batch>/ in the Documents bucket (isolated from the live TMF). */
export const stagingPrefix = (b: Pick<Batch, "org_id" | "id">) => `${b.org_id}/import/${b.id}/`;

/** Standard manifest columns; spreadsheet headers are matched to these case-insensitively. */
export const RAW_FIELDS = ["document_type", "status", "site", "country", "title", "version", "effective_date", "owner", "created_date", "source_id"] as const;

export const itemSchema = z.object({
  source_path: z.string().trim().min(1).max(1000),
  source_id: z.string().trim().max(300).optional(),
  file_path: z.string().max(1000).nullish(),
  file_name: z.string().max(500).nullish(),
  file_type: z.string().max(200).nullish(),
  file_size_bytes: z.number().int().min(0).nullish(),
  declared_hash: z.string().regex(/^[0-9a-f]{64}$/).nullish(),
  raw: z.record(z.string(), z.string().max(2000)).default({}),
}).strict();

/**
 * Server re-hash of staged files (MIG-05 needs hashes computed by the server, not the browser):
 * verified when the stored bytes hash to the declared hash and to the hash in the file name.
 * Uses the service role only to read bytes and record the result, after the caller passed RLS.
 */
export async function verifyItems(b: Batch, limit = 100) {
  const svc = serviceClient();
  const { data: items, error } = await svc.from("import_items").select("id, file_path, declared_hash").eq("batch_id", b.id).eq("verification", "pending").limit(limit);
  if (error) throw new Error(error.message);
  let verified = 0, failed = 0;
  for (const it of items ?? []) {
    let verification: "verified" | "mismatch" | "missing" = "missing";
    let hash: string | null = null;
    if (it.file_path && it.file_path.startsWith(stagingPrefix(b))) {
      hash = await hashStoredFile(it.file_path);
      if (hash) {
        const named = hashInPath(it.file_path);
        verification = (!it.declared_hash || it.declared_hash === hash) && (!named || named === hash) ? "verified" : "mismatch";
      }
    }
    const { error: uErr } = await svc.from("import_items").update({ server_hash: hash, verification }).eq("id", it.id);
    if (uErr) throw new Error(uErr.message);
    if (verification === "verified") verified++; else failed++;
  }
  const { count } = await svc.from("import_items").select("id", { count: "exact", head: true }).eq("batch_id", b.id).eq("verification", "pending");
  return { verified, failed, remaining: count ?? 0 };
}
