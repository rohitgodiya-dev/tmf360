import { z } from "zod";
import { requirePermission, requireUser } from "@/lib/api/auth";
import { dbError, idParam } from "@/lib/api/db";
import { handle, notFound, parseBody } from "@/lib/api/http";
import { LINK_TYPES, type LinkType } from "@/lib/api/links";


const schema = z.object({
  targets: z.array(z.object({ document_id: z.string().uuid(), link_type: z.enum(Object.keys(LINK_TYPES) as [LinkType, ...LinkType[]]) }).strict()).min(1).max(50),
  note: z.string().trim().max(1000).optional(),
}).strict();

type Doc = { id: string; org_id: string; study_id: string; artifact_num: string; artifact_name: string; custom_file_name: string | null; status: string };
const title = (d: Doc) => `${(d.custom_file_name || "").trim() || d.artifact_name} (${d.artifact_num})`;

async function loadDoc(db: import("@supabase/supabase-js").SupabaseClient, id: string) {
  const { data, error } = await db.from("documents").select("id, org_id, study_id, artifact_num, artifact_name, custom_file_name, status").eq("id", id).is("deleted_at", null).maybeSingle();
  if (error) throw dbError(error);
  return data as Doc | null;
}

// LNK-01/02: the document's links in both directions, each with how it reads from this document.
export const GET = handle(async (req: Request, { params }: { params: Promise<{ documentId: string }> }) => {
  const ctx = await requireUser(req);
  requirePermission(ctx, "view_document");
  const id = idParam((await params).documentId);
  if (!(await loadDoc(ctx.db, id))) throw notFound();
  const { data, error } = await ctx.db.from("document_links").select("id, from_document_id, to_document_id, link_type, note, created_at")
    .or(`from_document_id.eq.${id},to_document_id.eq.${id}`).is("removed_at", null).order("created_at");
  if (error) throw dbError(error);
  const others = [...new Set((data ?? []).map((l) => (l.from_document_id === id ? l.to_document_id : l.from_document_id)))];
  const { data: docs } = others.length ? await ctx.db.from("documents").select("id, artifact_num, artifact_name, custom_file_name, status").in("id", others) : { data: [] };
  const byId = new Map((docs ?? []).map((d) => [d.id, d as Doc]));
  return Response.json({
    data: (data ?? []).filter((l) => byId.has(l.from_document_id === id ? l.to_document_id : l.from_document_id)).map((l) => {
      const outgoing = l.from_document_id === id;
      const other = byId.get(outgoing ? l.to_document_id : l.from_document_id)!;
      return { id: l.id, link_type: l.link_type, label: LINK_TYPES[l.link_type as LinkType][outgoing ? 0 : 1], direction: outgoing ? "outgoing" : "incoming",
        document_id: other.id, title: title(other), status: other.status === "Approved" ? "Final" : other.status, note: l.note, created_at: l.created_at };
    }),
  });
});

// LNK-01/03: adds several links at once; each target succeeds or fails on its own, with the reason.
export const POST = handle(async (req: Request, { params }: { params: Promise<{ documentId: string }> }) => {
  const ctx = await requireUser(req);
  requirePermission(ctx, "upload_document");
  const id = idParam((await params).documentId);
  const from = await loadDoc(ctx.db, id);
  if (!from) throw notFound();
  const { data: study } = await ctx.db.from("studies").select("id").eq("org_id", from.org_id).eq("study_id", from.study_id).order("created_at").limit(1).maybeSingle();
  if (!study) throw notFound();
  const { targets, note } = await parseBody(req, schema);
  const results: { document_id: string; link_type: string; ok: boolean; reason?: string }[] = [];
  for (const t of targets) {
    if (t.document_id === id) { results.push({ ...t, ok: false, reason: "A document cannot link to itself" }); continue; }
    const { error } = await ctx.db.from("document_links").insert([{ org_id: from.org_id, study_id: study.id, from_document_id: id, to_document_id: t.document_id, link_type: t.link_type, note: note ?? null }]);
    if (!error) results.push({ ...t, ok: true });
    else results.push({ ...t, ok: false, reason: error.code === "23505" ? "This link already exists" : error.code === "42501" || /row-level/.test(error.message) ? "Document not found or not accessible" : error.code === "P0001" ? error.message : "Could not add this link" });
  }
  const added = results.filter((r) => r.ok).length;
  return Response.json({ added, failed: results.length - added, results }, { status: added ? 201 : 400 });
});
