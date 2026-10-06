// Part 14a — text index for full-text search (NAV-09, D49). Extracts the text of a document's current
// file on the server and stores it in document_text (service role; the table is readable only
// together with its document). PDFs via pdf.js, Word .docx via its XML, plain text as is. Scans with no
// text layer are recorded as "no_text" (no OCR).
import JSZip from "jszip";
import { pdfPagesText } from "./pdftext";
import { serviceClient } from "./service";

const MAX_BYTES = 30 * 1024 * 1024;
const MAX_CHARS = 1_000_000;

type Doc = { id: string; org_id: string; file_path: string | null; file_name: string | null; file_type: string | null; file_hash: string | null };

export async function extractText(bytes: Uint8Array, name: string, type: string | null): Promise<{ status: "indexed" | "no_text" | "unsupported"; content: string; pages: number | null }> {
  const lower = name.toLowerCase();
  if (/pdf/i.test(type ?? "") || lower.endsWith(".pdf")) {
    const pages = await pdfPagesText(bytes);
    const content = pages.join("\n").replace(/\s+/g, " ").trim();
    return { status: content.length >= 3 ? "indexed" : "no_text", content: content.slice(0, MAX_CHARS), pages: pages.length };
  }
  if (lower.endsWith(".docx")) {
    const zip = await JSZip.loadAsync(bytes);
    const xml = await zip.file("word/document.xml")?.async("string");
    if (!xml) return { status: "no_text", content: "", pages: null };
    const content = xml.replace(/<\/w:p>/g, "\n").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/\s+/g, " ").trim();
    return { status: content.length >= 3 ? "indexed" : "no_text", content: content.slice(0, MAX_CHARS), pages: null };
  }
  if (/^text\//i.test(type ?? "") || /\.(txt|csv|md)$/.test(lower)) {
    const content = new TextDecoder().decode(bytes).replace(/\s+/g, " ").trim();
    return { status: content ? "indexed" : "no_text", content: content.slice(0, MAX_CHARS), pages: null };
  }
  return { status: "unsupported", content: "", pages: null };
}

/** (Re)indexes one document's current file; a no-op when the stored text is for the same file hash. */
export async function indexDocument(doc: Doc, force = false): Promise<string> {
  const svc = serviceClient();
  if (!doc.file_path) return "no_file";
  if (!force) {
    const { data: existing } = await svc.from("document_text").select("file_hash, status").eq("document_id", doc.id).maybeSingle();
    if (existing && existing.file_hash === doc.file_hash && existing.status !== "failed") return "current";
  }
  let row: { status: string; content: string; pages: number | null };
  try {
    const { data: blob } = await svc.storage.from("Documents").download(doc.file_path);
    if (!blob) row = { status: "failed", content: "", pages: null };
    else if (blob.size > MAX_BYTES) row = { status: "unsupported", content: "", pages: null };
    else row = await extractText(new Uint8Array(await blob.arrayBuffer()), doc.file_name ?? doc.file_path, doc.file_type);
  } catch {
    row = { status: "failed", content: "", pages: null };
  }
  const { error } = await svc.from("document_text").upsert([{ document_id: doc.id, org_id: doc.org_id, file_hash: doc.file_hash, ...row, extracted_at: new Date().toISOString() }], { onConflict: "document_id" });
  if (error) throw new Error(`Text index write failed: ${error.message}`);
  return row.status;
}

export const DOC_FIELDS = "id, org_id, file_path, file_name, file_type, file_hash";

/** Indexes the given documents by id (used after filing, new files and imports). Never throws. */
export async function indexDocuments(ids: string[]) {
  if (!ids.length) return;
  try {
    const { data } = await serviceClient().from("documents").select(DOC_FIELDS).in("id", ids);
    for (const d of (data ?? []) as Doc[]) await indexDocument(d).catch(() => undefined);
  } catch { /* the nightly backfill catches up */ }
}

/** Backfill for the daily job: documents with a file but no (or stale) text. */
export async function backfillTextIndex(limit = 200) {
  const svc = serviceClient();
  const { data } = await svc.from("documents").select(`${DOC_FIELDS}, document_text(file_hash, status)`)
    .is("deleted_at", null).not("file_path", "is", null).order("created_at", { ascending: false }).limit(5000);
  type Row = Doc & { document_text: { file_hash: string | null; status: string } | null };
  const todo = ((data ?? []) as unknown as Row[]).filter((d) => !d.document_text || d.document_text.file_hash !== d.file_hash || d.document_text.status === "failed").slice(0, limit);
  let done = 0;
  for (const d of todo) { await indexDocument(d, true).catch(() => undefined); done++; }
  return done;
}
