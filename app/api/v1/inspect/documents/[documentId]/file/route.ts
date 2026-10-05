import { randomUUID } from "node:crypto";
import { z } from "zod";
import { idParam } from "@/lib/api/db";
import { forbidden, handle, notFound, parseBody } from "@/lib/api/http";
import { logActivity, requireInspector, scopedDocument, watermarkPdf } from "@/lib/api/inspect";
import { serviceClient } from "@/lib/api/service";

const LINK_SECONDS = 60;
const schema = z.object({ purpose: z.enum(["view", "download", "print"]), version_no: z.number().int().positive().optional() }).strict();

// Short-lived link to an in-scope document's file (INS-06). Viewing is always allowed; download and
// print follow the session's download mode: view_only refuses, watermark serves a stamped copy of a
// PDF (other file types can't be downloaded), original serves the stored file. Every download and
// print is logged. Earlier file versions only when the session includes version history.
export const POST = handle(async (req: Request, { params }: { params: Promise<{ documentId: string }> }) => {
  const s = await requireInspector(req);
  const d = await scopedDocument(s, idParam((await params).documentId));
  const { purpose, version_no } = await parseBody(req, schema);
  const db = serviceClient();

  let file = { path: d.file_path, name: d.file_name, type: d.file_type };
  if (version_no) {
    if (!s.include_versions) throw notFound();
    const { data: v } = await db.from("document_file_versions").select("file_path, file_name, file_type")
      .eq("document_id", d.id).eq("version_no", version_no).maybeSingle();
    if (!v) throw notFound("That version does not exist");
    file = { path: v.file_path, name: v.file_name, type: v.file_type };
  }
  if (!file.path) throw notFound("This document has no file in the TMF");

  if (purpose !== "view") {
    if (s.download_mode === "view_only") throw forbidden("Downloads and printing are not enabled for this inspection session");
    const label = (d.custom_file_name || file.name || d.artifact_name || "document").trim();
    if (s.download_mode === "watermark") {
      const isPdf = /pdf/i.test(file.type ?? "") || /\.pdf$/i.test(file.name ?? "");
      if (!isPdf) throw forbidden("Only PDF documents can be downloaded in this session (with a watermark)");
      const { data: blob } = await db.storage.from("Documents").download(file.path);
      if (!blob) throw notFound("The file could not be found in storage");
      const stamped = await watermarkPdf(new Uint8Array(await blob.arrayBuffer()), s, new Date());
      if (!stamped) throw forbidden("This PDF can't be watermarked, so it can't be downloaded in this session");
      const tmp = `inspection/${s.id}/${randomUUID()}.pdf`;
      const up = await db.storage.from("exports").upload(tmp, stamped, { contentType: "application/pdf" });
      if (up.error) throw new Error(`Watermarked copy could not be stored: ${up.error.message}`);
      const name = label.toLowerCase().endsWith(".pdf") ? label : `${label}.pdf`;
      const { data: signed } = await db.storage.from("exports").createSignedUrl(tmp, LINK_SECONDS, purpose === "download" ? { download: name.replace(/\.pdf$/i, " (inspection copy).pdf") } : undefined);
      if (!signed) throw new Error("Could not sign the watermarked copy");
      await logActivity(s, purpose, d.id, { version_no: version_no ?? null, watermarked: true });
      return Response.json({ url: signed.signedUrl, expires_in: LINK_SECONDS, watermarked: true });
    }
    const ext = file.name?.match(/\.[^.]+$/)?.[0] ?? "";
    const name = label.toLowerCase().endsWith(ext.toLowerCase()) ? label : label + ext;
    const { data: signed } = await db.storage.from("Documents").createSignedUrl(file.path, LINK_SECONDS, purpose === "download" ? { download: name } : undefined);
    if (!signed) throw notFound("The file could not be found in storage");
    await logActivity(s, purpose, d.id, { version_no: version_no ?? null, watermarked: false });
    return Response.json({ url: signed.signedUrl, expires_in: LINK_SECONDS, watermarked: false });
  }

  const { data: signed } = await db.storage.from("Documents").createSignedUrl(file.path, LINK_SECONDS);
  if (!signed) throw notFound("The file could not be found in storage");
  return Response.json({ url: signed.signedUrl, expires_in: LINK_SECONDS, file_type: file.type, file_name: file.name });
});
