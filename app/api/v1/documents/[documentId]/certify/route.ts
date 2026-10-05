import { z } from "zod";
import { requirePermission, requireUser } from "@/lib/api/auth";
import { dbError, idParam } from "@/lib/api/db";
import { handle, parseBody } from "@/lib/api/http";
import { password, people, reauthenticate } from "@/lib/api/qc";

const schema = z.object({
  method: z.enum(["paper_scan", "electronic_conversion", "electronic_duplicate"]),
  source_description: z.string().trim().min(3).max(1000),
  source_location: z.string().trim().max(1000).optional(),
  source_hash: z.string().trim().toLowerCase().regex(/^[0-9a-f]{64}$/, "Use the 64-character SHA-256 of the source file").optional(),
  checks: z.object({ page_count: z.boolean(), legible: z.boolean(), complete: z.boolean(), unaltered: z.boolean() }).strict(),
  password,
}).strict();

// Certifications of this document's file versions, with the signature manifestation (CCP).
export const GET = handle(async (req: Request, { params }: { params: Promise<{ documentId: string }> }) => {
  const ctx = await requireUser(req);
  requirePermission(ctx, "view_document");
  const id = idParam((await params).documentId);
  const [certs, current] = await Promise.all([
    ctx.db.from("certified_copies").select("id, file_version_id, file_hash, source_description, source_location, source_hash, method, checks, certified_by, certified_at, signature_event_id, document_file_versions(version_no)")
      .eq("document_id", id).order("certified_at"),
    ctx.db.from("document_file_versions").select("id, version_no").eq("document_id", id).order("version_no", { ascending: false }).limit(1).maybeSingle(),
  ]);
  if (certs.error) throw dbError(certs.error);
  const who = await people(ctx);
  return Response.json({
    current_version: current.data?.version_no ?? null,
    data: (certs.data ?? []).map((c) => ({
      ...c, version_no: (c.document_file_versions as unknown as { version_no: number } | null)?.version_no ?? null, document_file_versions: undefined,
      certified_by_name: who.get(c.certified_by)?.name ?? "Former member", covers_current: c.file_version_id === current.data?.id,
    })),
  });
});

// Certifies the document's current file as a true copy (CCP / REG-06): electronic signature with the
// meaning "Certified as a true copy of the original", bound to the file hash; source, method and
// verification recorded.
export const POST = handle(async (req: Request, { params }: { params: Promise<{ documentId: string }> }) => {
  const ctx = await requireUser(req);
  requirePermission(ctx, "upload_document");
  const id = idParam((await params).documentId);
  const b = await parseBody(req, schema);
  const proof = await reauthenticate(ctx, b.password, "certified_copy", id);
  const { data, error } = await ctx.db.rpc("certify_document", {
    p_document: id, p_method: b.method, p_source_description: b.source_description, p_source_location: b.source_location ?? null,
    p_source_hash: b.source_hash ?? null, p_checks: b.checks, p_reauth: proof,
  });
  if (error) throw dbError(error);
  return Response.json({ id: data }, { status: 201 });
});
