import { createHash } from "node:crypto";
import { writeAudit } from "@/lib/api/audit";
import { requireUser } from "@/lib/api/auth";
import { dbError } from "@/lib/api/db";
import { handle, notFound } from "@/lib/api/http";
import { serviceClient } from "@/lib/api/service";

type Status = "verified" | "mismatch" | "missing" | "baselined";

// Checks the stored bytes of a document's current file against its SHA-256.
// The hash recorded at upload (and used as the file's name) is computed by the browser;
// this recomputes it on the server from what is actually in storage.
//   verified  — stored bytes match the recorded hash
//   mismatch  — they don't (wrong or altered file)
//   missing   — the file isn't in storage
//   baselined — older file with no recorded hash; the server's hash is now the reference
export const POST = handle(async (req: Request, { params }: { params: Promise<{ documentId: string }> }) => {
  const ctx = await requireUser(req);
  const { documentId } = await params;

  // Row-level security decides whether the caller may see this document.
  const { data: doc, error } = await ctx.db.from("documents").select("id, study_id, file_path").eq("id", documentId).maybeSingle();
  if (error) throw dbError(error);
  if (!doc) throw notFound();

  // Authorised above. Versions and storage are read and updated by the server.
  const svc = serviceClient();
  const { data: version, error: vErr } = await svc.from("document_file_versions").select("*")
    .eq("document_id", doc.id).order("version_no", { ascending: false }).limit(1).maybeSingle();
  if (vErr) throw dbError(vErr);
  if (!version) throw notFound("This document has no file");

  let status: Status;
  let hash: string | null = null;
  const { data: blob } = await svc.storage.from("Documents").download(version.file_path);
  if (!blob) {
    status = "missing";
  } else {
    hash = createHash("sha256").update(Buffer.from(await blob.arrayBuffer())).digest("hex");
    // New uploads are named <sha256>.<ext>; the name is a second statement of the hash.
    const named = /(?:^|\/)([0-9a-f]{64})\.[^/]*$/i.exec(version.file_path)?.[1]?.toLowerCase() ?? null;
    const expected = version.file_hash?.toLowerCase() ?? named;
    if (!expected) status = "baselined";
    else status = hash === expected && (!named || named === expected) ? "verified" : "mismatch";
  }

  const { error: uErr } = await svc.from("document_file_versions")
    .update({ verification_status: status, verified_hash: hash, verified_at: new Date().toISOString() })
    .eq("id", version.id);
  if (uErr) throw dbError(uErr);

  await writeAudit(ctx, {
    action: status === "mismatch" || status === "missing" ? "File integrity check failed" : "File integrity checked",
    studyId: doc.study_id, documentId: doc.id,
    field: "file", oldValue: version.file_hash ?? null, newValue: `v${version.version_no} ${status}${hash ? ` ${hash}` : ""}`,
  });

  return Response.json({ version_no: version.version_no, status, hash });
});
