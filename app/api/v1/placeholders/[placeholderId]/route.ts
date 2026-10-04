import { z } from "zod";
import { requirePermission, requireUser } from "@/lib/api/auth";
import { dbError, idParam, isoDate, reason, rowVersion, updateVersioned } from "@/lib/api/db";
import { handle, notFound, parseBody } from "@/lib/api/http";

const COLUMNS = "id, study_id, artifact_num, artifact_name, level, study_country_id, study_site_id, title, instructions, responsible_org, responsible_dept, due_date, status, document_id, source, cancel_reason, created_at, row_version";

// One placeholder (Manage Expected Artifact, PLC-05) with the documents it could be linked to:
// live documents of the same study and artifact.
export const GET = handle(async (req: Request, { params }: { params: Promise<{ placeholderId: string }> }) => {
  const ctx = await requireUser(req);
  const id = idParam((await params).placeholderId);
  const { data: p, error } = await ctx.db.from("placeholders").select(COLUMNS).eq("id", id).maybeSingle();
  if (error) throw dbError(error);
  if (!p) throw notFound();
  const { data: study } = await ctx.db.from("studies").select("study_id").eq("id", p.study_id).single();
  const { data: docs, error: dErr } = await ctx.db.from("documents")
    .select("id, custom_file_name, file_name, artifact_name, status, study_country_id, study_site_id, created_at")
    .eq("study_id", study!.study_id).eq("artifact_num", p.artifact_num).is("deleted_at", null).order("created_at", { ascending: false }).limit(50);
  if (dErr) throw dbError(dErr);
  return Response.json({ ...p, candidates: (docs ?? []).map((d) => ({ id: d.id, title: (d.custom_file_name || "").trim() || d.file_name || d.artifact_name, status: d.status, study_country_id: d.study_country_id, study_site_id: d.study_site_id })) });
});

const text = (max: number) => z.string().trim().max(max).nullable().optional();
const patchSchema = z.object({
  title: text(300), instructions: text(4000), responsible_org: text(200), responsible_dept: text(200),
  due_date: isoDate.nullable().optional(),
  row_version: rowVersion, reason,
}).strict();

// Edit the descriptive fields of an open placeholder (the database refuses anything else).
export const PATCH = handle(async (req: Request, { params }: { params: Promise<{ placeholderId: string }> }) => {
  const ctx = await requireUser(req);
  requirePermission(ctx, "edit_study");
  const id = idParam((await params).placeholderId);
  const { row_version, reason: why, ...patch } = await parseBody(req, patchSchema);
  const clean = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined).map(([k, v]) => [k, typeof v === "string" ? v || null : v]));
  return Response.json(await updateVersioned(ctx, "placeholders", { id }, row_version, { ...clean, change_reason: why }));
});
