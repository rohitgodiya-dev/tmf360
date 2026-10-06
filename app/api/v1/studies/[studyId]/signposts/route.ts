import { createHash } from "node:crypto";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { z } from "zod";
import { requirePermission, requireUser } from "@/lib/api/auth";
import { dbError, insertRow, isoDate, loadStudy } from "@/lib/api/db";
import { handle, invalidRequest, parseBody } from "@/lib/api/http";
import { serviceClient } from "@/lib/api/service";

const schema = z.object({
  artifact_num: z.string().regex(/^\d\d\.\d\d\.\d\d$/),
  title: z.string().trim().min(2).max(300),
  reference: z.string().trim().min(3, "Give a URL or where the original is held").max(1000),
  study_country_id: z.string().uuid().nullish(),
  study_site_id: z.string().uuid().nullish(),
  version_label: z.string().trim().max(100).optional(),
  effective_date: isoDate.optional(),
}).strict();

const winAnsi = (s: string) => s.replace(/[^\x20-\x7E\xA0-\xFF]/g, "?");

/** The generated placeholder PDF saying where the original is held (SGN-01). */
async function placeholderPdf(study: string, b: z.infer<typeof schema>, by: string) {
  const pdf = await PDFDocument.create();
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const page = pdf.addPage([595, 842]);
  let y = 770;
  const line = (t: string, f = font, size = 11) => {
    for (const chunk of winAnsi(t).match(/.{1,85}(\s|$)/g) ?? [""]) { page.drawText(chunk.trim(), { x: 50, y, size, font: f, color: rgb(0.1, 0.1, 0.1) }); y -= size + 6; }
  };
  line("SIGNPOST - ORIGINAL HELD ELSEWHERE", bold, 16); y -= 10;
  line(`Study: ${study}`); line(`Document: ${b.title}`); line(`TMF artifact: ${b.artifact_num}`);
  if (b.version_label) line(`Version: ${b.version_label}`);
  if (b.effective_date) line(`Effective date: ${b.effective_date}`);
  y -= 10; line("The original of this record is held at:", bold); line(b.reference); y -= 10;
  line(`Signpost created by ${by} on ${new Date().toISOString().replace("T", " ").slice(0, 19)} UTC.`, font, 9);
  line("This page stands in for the original in the TMF. It is counted in completeness like any other record.", font, 9);
  return pdf.save();
}

// SGN-01/02: creates a signpost — a record for a document held elsewhere, filed like any artifact with a
// generated placeholder PDF, then marked as a signpost (irreversible) with its reference.
export const POST = handle(async (req: Request, { params }: { params: Promise<{ studyId: string }> }) => {
  const ctx = await requireUser(req);
  requirePermission(ctx, "upload_document");
  const study = await loadStudy(ctx, (await params).studyId);
  const b = await parseBody(req, schema);
  const bytes = await placeholderPdf(study.study_id, b, ctx.user.email ?? ctx.user.id);
  const hash = createHash("sha256").update(bytes).digest("hex");
  const path = `${study.org_id}/${study.study_id}/${hash}.pdf`;
  const up = await serviceClient().storage.from("Documents").upload(path, bytes, { contentType: "application/pdf", upsert: false });
  if (up.error && !/exists/i.test(up.error.message)) throw new Error(`Could not store the signpost page: ${up.error.message}`);

  const item = await insertRow<{ id: string }>(ctx, "intake_items", {
    study_id: study.id, file_path: path, file_name: `Signpost - ${b.title}.pdf`.slice(0, 300), file_type: "application/pdf", file_size_bytes: bytes.length, file_hash: hash,
  });
  const { error: vErr } = await serviceClient().from("intake_items").update({ verification_status: "verified", signpost_reference: b.reference, source: "signpost" }).eq("id", item.id);
  if (vErr) throw dbError(vErr);
  const { data: fresh } = await ctx.db.from("intake_items").select("row_version").eq("id", item.id).single();
  const { error: pErr } = await ctx.db.from("intake_items").update({
    artifact_num: b.artifact_num, title: b.title, version_label: b.version_label ?? null, effective_date: b.effective_date ?? null,
    study_country_id: b.study_country_id ?? null, study_site_id: b.study_site_id ?? null, status: "indexed",
  }).eq("id", item.id).eq("row_version", fresh!.row_version);
  if (pErr) throw dbError(pErr);
  const { data: documentId, error: fErr } = await ctx.db.rpc("file_signpost", { p_item: item.id });
  if (fErr) throw dbError(fErr);
  if (!documentId) throw invalidRequest("The signpost could not be filed");
  return Response.json({ document_id: documentId }, { status: 201 });
});
