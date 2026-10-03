import { requireUser } from "@/lib/api/auth";
import { dbError } from "@/lib/api/db";
import { handle, notFound } from "@/lib/api/http";

// The active TMF Reference Model: zones, sections, artifacts (with sub-artifacts) and
// milestone events. Optional filter: ?for=investigator (ISF view) or ?for=sponsor,
// and &device=true to use the device-trial applicability columns.
export const GET = handle(async (req: Request) => {
  const ctx = await requireUser(req);
  const params = new URL(req.url).searchParams;
  const audience = params.get("for");
  const device = params.get("device") === "true";

  const { data: version, error: vErr } = await ctx.db.from("taxonomy_versions")
    .select("id, model, version, released_on").eq("model", "TMF Reference Model").eq("status", "active").maybeSingle();
  if (vErr) throw dbError(vErr);
  if (!version) throw notFound("No active taxonomy");

  let artifacts = ctx.db.from("taxonomy_artifacts")
    .select("id, unique_id, artifact_num, zone_num, section_num, name, classification, definition, sponsor_doc, investigator_doc, device_sponsor_doc, device_investigator_doc, iis_requirement, dating_convention, site_milestone, iso_ref, subartifacts:taxonomy_subartifacts(name, sort_order)")
    .eq("version_id", version.id).order("sort_order");
  if (audience === "investigator") artifacts = artifacts.eq(device ? "device_investigator_doc" : "investigator_doc", true);
  if (audience === "sponsor") artifacts = artifacts.eq(device ? "device_sponsor_doc" : "sponsor_doc", true);

  const [zones, sections, arts, events] = await Promise.all([
    ctx.db.from("taxonomy_zones").select("zone_num, name").eq("version_id", version.id).order("zone_num"),
    ctx.db.from("taxonomy_sections").select("section_num, zone_num, name").eq("version_id", version.id).order("section_num"),
    artifacts,
    ctx.db.from("tmf_milestone_events").select("code, name, phase").order("code"),
  ]);
  for (const r of [zones, sections, arts, events]) if (r.error) throw dbError(r.error);

  const data = (arts.data ?? []).map((a) => ({
    ...a,
    subartifacts: [...(a.subartifacts ?? [])].sort((x, y) => x.sort_order - y.sort_order).map((s) => s.name),
  }));
  return Response.json({ version, zones: zones.data, sections: sections.data, artifacts: data, milestone_events: events.data });
});
