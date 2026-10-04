import { requirePermission, requireUser } from "@/lib/api/auth";
import { dbError, loadStudy } from "@/lib/api/db";
import { handle } from "@/lib/api/http";

// The Navigator's two trees (NAV-01). Nodes are generic — label, the chip they add
// (field = value) and children — so the UI hard-codes no hierarchy levels:
//   my_trial  Study → Country → Site, from the study structure (Part 2b)
//   taxonomy  the hierarchy of the study's enabled artifacts in the active taxonomy version
export type TreeNode = { id: string; label: string; field: string | null; value: string | null; children: TreeNode[] };

const node = (id: string, label: string, field: string | null, value: string | null, children: TreeNode[] = []): TreeNode =>
  ({ id, label, field, value, children });

export const GET = handle(async (req: Request, { params }: { params: Promise<{ studyId: string }> }) => {
  const ctx = await requireUser(req);
  requirePermission(ctx, "view_document");
  const study = await loadStudy(ctx, (await params).studyId);

  const [countries, sites, config, version] = await Promise.all([
    ctx.db.from("study_countries").select("id, country_code, status").eq("study_id", study.id).order("country_code"),
    ctx.db.from("study_sites").select("id, study_country_id, site_number, display_name, status").eq("study_id", study.id).order("site_number"),
    ctx.db.from("tmf_config").select("artifact_num, artifact_name, taxonomy_artifact_id")
      .eq("org_id", study.org_id).eq("study_id", study.study_id).eq("type", "artifact").eq("is_enabled", true),
    ctx.db.from("taxonomy_versions").select("id, model, version").eq("status", "active").eq("model", "TMF Reference Model").maybeSingle(),
  ]);
  for (const r of [countries, sites, config, version]) if (r.error) throw dbError(r.error);

  const myTrial = node("study", study.study_id, null, null, (countries.data ?? []).map((c) =>
    node(`c:${c.id}`, c.country_code, "country", c.id, (sites.data ?? [])
      .filter((s) => s.study_country_id === c.id)
      .map((s) => node(`s:${s.id}`, `${s.site_number} — ${s.display_name}`, "site", s.id)))));

  // Zone and section names come from the taxonomy version; artifacts from the study's config.
  const [zones, sections] = version.data
    ? await Promise.all([
        ctx.db.from("taxonomy_zones").select("zone_num, name").eq("version_id", version.data.id),
        ctx.db.from("taxonomy_sections").select("section_num, zone_num, name").eq("version_id", version.data.id),
      ])
    : [{ data: [], error: null }, { data: [], error: null }];
  for (const r of [zones, sections]) if (r.error) throw dbError(r.error);

  const zoneName = new Map((zones.data ?? []).map((z) => [z.zone_num, z.name]));
  const sectionName = new Map((sections.data ?? []).map((s) => [s.section_num, s.name]));
  const byZone = new Map<string, Map<string, TreeNode[]>>();
  const artifacts = (config.data ?? []).filter((a) => /^\d\d\.\d\d\.\d\d$/.test(a.artifact_num ?? ""))
    .sort((a, b) => a.artifact_num.localeCompare(b.artifact_num));
  for (const a of artifacts) {
    const [z, s] = a.artifact_num.split(".");
    const section = `${z}.${s}`;
    if (!byZone.has(z)) byZone.set(z, new Map());
    const secs = byZone.get(z)!;
    if (!secs.has(section)) secs.set(section, []);
    secs.get(section)!.push(node(`a:${a.artifact_num}`, `${a.artifact_num} ${a.artifact_name}`, "artifact", a.artifact_num));
  }
  const taxonomy = [...byZone.entries()].map(([z, secs]) =>
    node(`z:${z}`, `${z} ${zoneName.get(z) ?? ""}`.trim(), "zone", z, [...secs.entries()].map(([s, arts]) =>
      node(`sec:${s}`, `${s} ${sectionName.get(s) ?? ""}`.trim(), "section", s, arts))));

  return Response.json({
    my_trial: myTrial,
    taxonomy: { label: version.data ? `${version.data.model} ${version.data.version}` : "Taxonomy", nodes: taxonomy },
  });
});
