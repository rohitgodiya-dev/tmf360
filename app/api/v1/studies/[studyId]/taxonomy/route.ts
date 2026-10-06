import { z } from "zod";
import { requirePermission, requireUser } from "@/lib/api/auth";
import { dbError, loadStudy } from "@/lib/api/db";
import { handle, parseBody } from "@/lib/api/http";

const schema = z.object({ to_version_id: z.string().uuid() }).strict();

// RM-04/05: the study's taxonomy version, versions it can migrate to (with a published mapping), and its
// migrations with their impact reports.
export const GET = handle(async (req: Request, { params }: { params: Promise<{ studyId: string }> }) => {
  const ctx = await requireUser(req);
  requirePermission(ctx, "view_study");
  const ref = await loadStudy(ctx, (await params).studyId);
  const { data: study, error } = await ctx.db.from("studies").select("taxonomy_version_id").eq("id", ref.id).single();
  if (error) throw dbError(error);
  const [versions, maps, migrations] = await Promise.all([
    ctx.db.from("taxonomy_versions").select("id, model, version, status, released_on"),
    study.taxonomy_version_id ? ctx.db.from("taxonomy_version_mappings").select("to_version_id").eq("from_version_id", study.taxonomy_version_id) : Promise.resolve({ data: [], error: null }),
    ctx.db.from("study_taxonomy_migrations").select("id, from_version_id, to_version_id, status, impact, executed_at, cancel_reason, created_at").eq("study_id", ref.id).order("created_at", { ascending: false }),
  ]);
  for (const r of [versions, maps, migrations]) if (r.error) throw dbError(r.error);
  const v = new Map((versions.data ?? []).map((x) => [x.id, x]));
  const label = (id: string | null) => (id && v.get(id) ? `${v.get(id)!.model} ${v.get(id)!.version}` : null);
  const targets = [...new Set((maps.data ?? []).map((m) => m.to_version_id))].map((id) => ({ id, label: label(id) }));
  return Response.json({
    current: { id: study.taxonomy_version_id, label: label(study.taxonomy_version_id) },
    targets,
    migrations: (migrations.data ?? []).map((m) => ({ ...m, from_label: label(m.from_version_id), to_label: label(m.to_version_id) })),
  });
});

// Plans a migration and returns its impact report (nothing changes until it is executed with a signature).
export const POST = handle(async (req: Request, { params }: { params: Promise<{ studyId: string }> }) => {
  const ctx = await requireUser(req);
  requirePermission(ctx, "invite_users");
  const study = await loadStudy(ctx, (await params).studyId);
  const { to_version_id } = await parseBody(req, schema);
  const { data: id, error } = await ctx.db.rpc("plan_taxonomy_migration", { p_study: study.id, p_to: to_version_id });
  if (error) throw dbError(error);
  const { data, error: gErr } = await ctx.db.from("study_taxonomy_migrations").select("*").eq("id", id).single();
  if (gErr) throw dbError(gErr);
  return Response.json(data, { status: 201 });
});
