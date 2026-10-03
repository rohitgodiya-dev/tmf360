import { requireUser } from "@/lib/api/auth";
import { dbError, loadStudy } from "@/lib/api/db";
import { handle } from "@/lib/api/http";

type Row = Record<string, unknown> & { id: string };
type Contact = Row & { scope_type: string; scope_id: string };

// The study as a tree: organisations, then countries → sites, with contacts and milestones at each level.
export const GET = handle(async (req: Request, { params }: { params: Promise<{ studyId: string }> }) => {
  const ctx = await requireUser(req);
  const study = await loadStudy(ctx, (await params).studyId);

  const [parties, countries, sites, contacts, milestones] = await Promise.all([
    ctx.db.from("study_parties").select("*, party:parties(id, name, party_type)").eq("study_id", study.id),
    ctx.db.from("study_countries").select("*").eq("study_id", study.id).order("country_code"),
    ctx.db.from("study_sites").select("*, site_party:parties(id, name)").eq("study_id", study.id).order("site_number"),
    ctx.db.from("contact_roles")
      .select("*, person:persons(id, given_name, family_name, email)")
      .eq("study_id", study.id)
      .order("start_date"),
    ctx.db.from("milestones").select("*, type:milestone_types(label, sort_order)").eq("study_id", study.id),
  ]);
  for (const r of [parties, countries, sites, contacts, milestones]) if (r.error) throw dbError(r.error);

  const allContacts = (contacts.data ?? []) as Contact[];
  const contactsFor = (scopeType: string, scopeId: string) =>
    allContacts.filter((c) => c.scope_type === scopeType && c.scope_id === scopeId);
  type Milestone = Contact & { type: { sort_order: number } | null };
  const allMilestones = (milestones.data ?? []) as Milestone[];
  const milestonesFor = (scopeType: string, scopeId: string) =>
    allMilestones
      .filter((m) => m.scope_type === scopeType && m.scope_id === scopeId)
      .sort((a, b) => (a.type?.sort_order ?? 0) - (b.type?.sort_order ?? 0));

  return Response.json({
    study,
    parties: parties.data,
    contacts: contactsFor("study", study.id),
    milestones: milestonesFor("study", study.id),
    countries: ((countries.data ?? []) as Row[]).map((country) => ({
      ...country,
      contacts: contactsFor("country", country.id),
      milestones: milestonesFor("country", country.id),
      sites: ((sites.data ?? []) as (Row & { study_country_id: string })[])
        .filter((s) => s.study_country_id === country.id)
        .map((site) => ({ ...site, contacts: contactsFor("site", site.id), milestones: milestonesFor("site", site.id) })),
    })),
  });
});
