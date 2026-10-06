// Study → country → site rollup (Part 15): sites, enrollment, completeness (PLC-06), key milestone dates and
// PI/CRA per level. Runs as the caller, so row-level security decides what is counted.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { StudyRef } from "./db";
import { dbError } from "./db";

type Counts = { final: number; missing: number; total: number };
type CompletenessRow = { study_country_id: string | null; study_site_id: string | null; final_count: number; missing_count: number; total_count: number };
type MilestoneRow = { scope_type: string; scope_id: string; milestone_type: string; planned_date: string | null; actual_date: string | null };
type ContactRow = { scope_type: string; scope_id: string; role_code: string; end_date: string | null; person: { given_name: string; family_name: string; email: string | null } | null };

export type KeyDate = { date: string | null; actual: boolean };
export type HierarchySite = {
  id: string; site_number: string; display_name: string; status: string; row_version: number;
  institution: { id: string; name: string; city: string | null; address: string | null; institution_type: string | null; country_code: string | null } | null;
  target_enrollment: number | null; actual_enrollment: number;
  completeness: number | null; missing: number;
  activated: KeyDate; first_patient_in: KeyDate;
  pi: string | null; cra: string | null;
};
export type HierarchyCountry = {
  id: string; country_code: string; country_name: string; region: string; regulatory_authority: string | null; status: string;
  sites_total: number; sites_active: number; target_enrollment: number; actual_enrollment: number;
  completeness: number | null; missing: number;
  submitted: KeyDate; approved: KeyDate; first_patient_in: KeyDate;
  sites: HierarchySite[];
};
export type Hierarchy = {
  study: StudyRef;
  totals: { countries: number; sites_total: number; sites_active: number; target_enrollment: number; actual_enrollment: number; completeness: number | null; missing: number };
  countries: HierarchyCountry[];
};

const pct = (c: Counts) => (c.total ? Math.round((c.final / c.total) * 1000) / 10 : null);
const add = (rows: CompletenessRow[]): Counts =>
  rows.reduce((a, r) => ({ final: a.final + r.final_count, missing: a.missing + r.missing_count, total: a.total + r.total_count }), { final: 0, missing: 0, total: 0 });

export async function studyHierarchy(db: SupabaseClient, study: StudyRef): Promise<Hierarchy> {
  const today = new Date().toISOString().slice(0, 10);
  const [countries, sites, completeness, milestones, contacts] = await Promise.all([
    db.from("study_country_summary").select("*").eq("study_id", study.id).order("country_name"),
    db.from("study_sites")
      .select("id, study_country_id, site_number, display_name, status, row_version, target_enrollment, actual_enrollment, institution:parties(id, name, city, address, institution_type, country_code)")
      .eq("study_id", study.id).order("site_number"),
    db.from("structure_completeness").select("study_country_id, study_site_id, final_count, missing_count, total_count")
      .eq("org_id", study.org_id).eq("study_code", study.study_id),
    db.from("milestones").select("scope_type, scope_id, milestone_type, planned_date, actual_date").eq("study_id", study.id)
      .in("milestone_type", ["COUNTRY_SUBMISSION", "COUNTRY_APPROVAL", "COUNTRY_FIRST_PATIENT_IN", "SITE_ACTIVATED", "SITE_FIRST_PATIENT_IN"]),
    db.from("contact_roles").select("scope_type, scope_id, role_code, end_date, person:persons(given_name, family_name, email)")
      .eq("study_id", study.id).eq("scope_type", "site").in("role_code", ["PI", "CRA"]),
  ]);
  for (const r of [countries, sites, completeness, milestones, contacts]) if (r.error) throw dbError(r.error);

  const comp = (completeness.data ?? []) as CompletenessRow[];
  const ms = (milestones.data ?? []) as MilestoneRow[];
  const keyDate = (scopeId: string, type: string): KeyDate => {
    const m = ms.find((x) => x.scope_id === scopeId && x.milestone_type === type);
    return { date: m?.actual_date ?? m?.planned_date ?? null, actual: !!m?.actual_date };
  };
  const people = (contacts.data ?? []) as unknown as ContactRow[];
  const contact = (siteId: string, role: string) => {
    const c = people.find((x) => x.scope_id === siteId && x.role_code === role && (!x.end_date || x.end_date >= today));
    return c?.person ? `${c.person.given_name} ${c.person.family_name}` : null;
  };

  type SiteRow = Omit<HierarchySite, "completeness" | "missing" | "activated" | "first_patient_in" | "pi" | "cra"> & { study_country_id: string };
  const siteRows = (sites.data ?? []) as unknown as SiteRow[];
  const out: HierarchyCountry[] = (countries.data ?? []).map((c) => {
    const cc = add(comp.filter((r) => r.study_country_id === c.study_country_id));
    return {
      id: c.study_country_id, country_code: c.country_code, country_name: c.country_name, region: c.region,
      regulatory_authority: c.regulatory_authority, status: c.status,
      sites_total: c.sites_total, sites_active: c.sites_active, target_enrollment: c.target_enrollment, actual_enrollment: c.actual_enrollment,
      completeness: pct(cc), missing: cc.missing,
      submitted: keyDate(c.study_country_id, "COUNTRY_SUBMISSION"), approved: keyDate(c.study_country_id, "COUNTRY_APPROVAL"),
      first_patient_in: keyDate(c.study_country_id, "COUNTRY_FIRST_PATIENT_IN"),
      sites: siteRows.filter((s) => s.study_country_id === c.study_country_id).map((row) => {
        const { study_country_id: _ignored, ...s } = row; void _ignored;
        const sc = add(comp.filter((r) => r.study_site_id === s.id));
        return {
          ...s, completeness: pct(sc), missing: sc.missing,
          activated: keyDate(s.id, "SITE_ACTIVATED"), first_patient_in: keyDate(s.id, "SITE_FIRST_PATIENT_IN"),
          pi: contact(s.id, "PI"), cra: contact(s.id, "CRA"),
        };
      }),
    };
  });
  const all = add(comp);
  return {
    study,
    totals: {
      countries: out.length,
      sites_total: out.reduce((n, c) => n + c.sites_total, 0),
      sites_active: out.reduce((n, c) => n + c.sites_active, 0),
      target_enrollment: out.reduce((n, c) => n + c.target_enrollment, 0),
      actual_enrollment: out.reduce((n, c) => n + c.actual_enrollment, 0),
      completeness: pct(all), missing: all.missing,
    },
    countries: out,
  };
}
