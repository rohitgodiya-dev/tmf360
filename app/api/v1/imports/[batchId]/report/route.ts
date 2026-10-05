import { writeAudit } from "@/lib/api/audit";
import { requirePermission, requireUser } from "@/lib/api/auth";
import { dbError } from "@/lib/api/db";
import { handle } from "@/lib/api/http";
import { loadBatch } from "@/lib/api/imports";
import { people } from "@/lib/api/qc";
import { buildXlsx, xlsxResponse, type Cell } from "@/lib/xlsx";

// Import audit report (M18): scope, mappings used, every item with its exceptions and resolution,
// reconciliation results and the approver's signature. Generated as the caller and audited.
export const GET = handle(async (req: Request, { params }: { params: Promise<{ batchId: string }> }) => {
  const ctx = await requireUser(req);
  requirePermission(ctx, "invite_users");
  const b = await loadBatch(ctx, (await params).batchId);
  const [items, mappings, study, sig] = await Promise.all([
    ctx.db.from("import_items").select("*").eq("batch_id", b.id).order("created_at").limit(20000),
    ctx.db.from("import_mappings").select("kind, source_value, target_value").eq("org_id", b.org_id),
    ctx.db.from("studies").select("study_id").eq("id", b.study_id).single(),
    b.signature_event_id ? ctx.db.from("signature_events").select("meaning, signer_name, signer_email, signed_at").eq("id", b.signature_event_id).maybeSingle() : Promise.resolve({ data: null, error: null }),
  ]);
  if (items.error) throw dbError(items.error);
  const rows = items.data ?? [];
  // Mappings that this batch's source values actually used.
  const used = new Set(rows.flatMap((i) => (["document_type", "status", "site", "country"] as const).map((k) => `${k}|${String(i.raw?.[k] ?? "").trim().toLowerCase()}`)));
  const who = await people(ctx);
  const recon = (b.reconciliation ?? {}) as Record<string, unknown>;
  const dry = (b.dry_run_report ?? {}) as Record<string, unknown>;
  const val = (v: unknown): Cell => (v == null ? "" : typeof v === "object" ? JSON.stringify(v) : (v as Cell));

  const bytes = await buildXlsx([
    { name: "Scope", columns: ["Item", "Value"], rows: [
      ["Study", study.data?.study_id ?? ""], ["Batch", b.name], ["Batch ID", b.id], ["Source system", b.source_system], ["Description", b.description],
      ["Status", b.status], ["Opened by", who.get(b.created_by)?.name ?? "Former member"], ["Opened (UTC)", new Date(b.created_at)],
      ["Dry run (UTC)", b.dry_run_at ? new Date(b.dry_run_at) : ""], ["Reconciled (UTC)", b.reconciled_at ? new Date(b.reconciled_at) : ""],
      ["Approver", sig.data ? `${sig.data.signer_name} <${sig.data.signer_email}>` : ""], ["Signature meaning", sig.data?.meaning ?? ""],
      ["Signed (UTC)", sig.data ? new Date(sig.data.signed_at) : ""], ["Documents filed", b.filed_count ?? ""],
      ...(b.cancel_reason ? [["Cancelled", b.cancel_reason] as Cell[]] : []),
    ] },
    { name: "Dry run", columns: ["Measure", "Value"], rows: Object.entries(dry).map(([k, v]) => [k, val(v)]) },
    { name: "Reconciliation", columns: ["Measure", "Value"], rows: Object.entries(recon).map(([k, v]) => [k, val(v)]) },
    { name: "Mappings used", columns: ["Kind", "Source value", "Target value"],
      rows: (mappings.data ?? []).filter((m) => used.has(`${m.kind}|${m.source_value.trim().toLowerCase()}`)).map((m) => [m.kind, m.source_value, m.target_value]) },
    { name: "Items", columns: ["Source path", "Source ID", "State", "Exceptions", "Resolution", "Artifact", "Target status", "Title", "Version", "Effective date",
      "Declared SHA-256", "Server SHA-256", "Verification", "Document ID", "Original type", "Original status", "Original created"],
      rows: rows.map((i) => [i.source_path, i.source_id, i.state, (i.exceptions as string[]).join("; "), i.state === "excluded" ? `Excluded: ${i.exclusion_reason}` : i.state === "imported" ? "Filed" : "",
        i.artifact_num, i.target_status, i.title, i.version_label, i.effective_date, i.declared_hash, i.server_hash, i.verification, i.document_id,
        i.raw?.document_type ?? "", i.raw?.status ?? "", i.raw?.created_date ?? ""]) },
  ]);
  await writeAudit(ctx, { action: "Import audit report exported", studyId: study.data?.study_id ?? null, field: `import_batch:${b.id}`, newValue: `${rows.length} items` });
  return xlsxResponse(bytes, `import-report-${study.data?.study_id ?? "study"}-${b.id.slice(0, 8)}.xlsx`);
});
