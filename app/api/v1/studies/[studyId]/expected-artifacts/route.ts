import { requirePermission, requireUser } from "@/lib/api/auth";
import { dbError, loadStudy } from "@/lib/api/db";
import { handle } from "@/lib/api/http";
import { TILES, completeness } from "@/lib/api/navigator";

type Counts = Record<(typeof TILES)[number], number>;
const empty = (): Counts => Object.fromEntries(TILES.map((t) => [t, 0])) as Counts;

// Expected Artifacts (PLC-07): counts by status for every artifact, grouped by the study's
// taxonomy (zone → section → artifact), with completeness at each level. Drill-down happens
// in the Navigator with the matching chip. Only rows the caller may read are counted.
export const GET = handle(async (req: Request, { params }: { params: Promise<{ studyId: string }> }) => {
  const ctx = await requireUser(req);
  requirePermission(ctx, "view_document");
  const study = await loadStudy(ctx, (await params).studyId);

  const rows: { zone_num: string | null; section_num: string | null; artifact_num: string | null; document_type: string | null; nav_status: string }[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await ctx.db.from("navigator_items").select("zone_num, section_num, artifact_num, document_type, nav_status")
      .eq("org_id", study.org_id).eq("study_code", study.study_id).eq("is_historical", false).range(from, from + 999);
    if (error) throw dbError(error);
    rows.push(...(data ?? []));
    if (!data || data.length < 1000 || from > 50000) break;
  }

  const version = await ctx.db.from("taxonomy_versions").select("id").eq("status", "active").eq("model", "TMF Reference Model").maybeSingle();
  const [zones, sections] = version.data
    ? await Promise.all([
        ctx.db.from("taxonomy_zones").select("zone_num, name").eq("version_id", version.data.id),
        ctx.db.from("taxonomy_sections").select("section_num, name").eq("version_id", version.data.id),
      ])
    : [{ data: [] }, { data: [] }];
  const zoneName = new Map((zones.data ?? []).map((z) => [z.zone_num, z.name]));
  const sectionName = new Map((sections.data ?? []).map((s) => [s.section_num, s.name]));

  type Node = { key: string; label: string; counts: Counts; completeness: number | null; children?: Node[] };
  const zoneMap = new Map<string, { counts: Counts; sections: Map<string, { counts: Counts; artifacts: Map<string, { label: string; counts: Counts }> }> }>();
  const total = empty();
  for (const r of rows) {
    if (!r.artifact_num || !r.zone_num || !r.section_num) continue;
    const s = r.nav_status as keyof Counts;
    if (!(s in total)) continue;
    total[s]++;
    if (!zoneMap.has(r.zone_num)) zoneMap.set(r.zone_num, { counts: empty(), sections: new Map() });
    const z = zoneMap.get(r.zone_num)!; z.counts[s]++;
    if (!z.sections.has(r.section_num)) z.sections.set(r.section_num, { counts: empty(), artifacts: new Map() });
    const sec = z.sections.get(r.section_num)!; sec.counts[s]++;
    if (!sec.artifacts.has(r.artifact_num)) sec.artifacts.set(r.artifact_num, { label: `${r.artifact_num} ${r.document_type ?? ""}`.trim(), counts: empty() });
    sec.artifacts.get(r.artifact_num)!.counts[s]++;
  }
  const sorted = <T,>(m: Map<string, T>) => [...m.entries()].sort(([a], [b]) => a.localeCompare(b));
  const zonesOut: Node[] = sorted(zoneMap).map(([zn, z]) => ({
    key: zn, label: `${zn} ${zoneName.get(zn) ?? ""}`.trim(), counts: z.counts, completeness: completeness(z.counts),
    children: sorted(z.sections).map(([sn, s]) => ({
      key: sn, label: `${sn} ${sectionName.get(sn) ?? ""}`.trim(), counts: s.counts, completeness: completeness(s.counts),
      children: sorted(s.artifacts).map(([an, a]) => ({ key: an, label: a.label, counts: a.counts, completeness: completeness(a.counts) })),
    })),
  }));
  return Response.json({ counts: total, completeness: completeness(total), zones: zonesOut });
});
