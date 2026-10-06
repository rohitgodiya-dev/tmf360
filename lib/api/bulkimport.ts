// Bulk import of studies and sites (Part 20): templates, row-by-row validation (the dry run), and the all-or-nothing
// import through import_studies()/import_sites(). Validation runs as the caller, so it sees what they can see.
import type { RequestContext } from "./auth";
import { dbError } from "./db";
import { csvLine } from "../csv";

export type Kind = "studies" | "sites";
export type RowError = { line: number; field: string; message: string };
export type Validation = { rows: Record<string, string>[]; errors: RowError[]; warnings: string[]; summary: string[] };

export const TEMPLATES: Record<Kind, { columns: string[]; required: string[]; example: string[] }> = {
  studies: {
    columns: ["study_id", "protocol", "phase", "sponsor", "status", "therapeutic_area"],
    required: ["study_id", "protocol", "phase"],
    example: ["AZ-001", "A Phase III Study of Drug X in Adults with Condition Y", "Phase III", "AstraZeneca", "Startup", "Oncology"],
  },
  sites: {
    columns: ["site_name", "site_code", "country_code", "city", "pi_name", "pi_email", "study_id"],
    required: ["site_name", "site_code", "country_code", "study_id"],
    example: ["Mayo Clinic Rochester", "MAY-001", "US", "Rochester", "Dr. Jane Smith", "jsmith@mayo.edu", "AZ-001"],
  },
};
export function templateCsv(kind: Kind): string {
  const t = TEMPLATES[kind];
  return `${csvLine(t.columns)}\r\n${csvLine(t.example)}\r\n`;
}

const PHASES: Record<string, string> = {
  "i": "Phase I", "phase i": "Phase I", "1": "Phase I", "ii": "Phase II", "phase ii": "Phase II", "2": "Phase II",
  "iii": "Phase III", "phase iii": "Phase III", "3": "Phase III", "iv": "Phase IV", "phase iv": "Phase IV", "4": "Phase IV",
  "obs": "Observational", "observational": "Observational", "feasibility": "Feasibility",
};
const STATUSES: Record<string, string> = { planning: "Planning", startup: "Startup", "start-up": "Startup", active: "Active" };
const CODE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,49}$/;
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function base(kind: Kind, records: Record<string, string>[]) {
  const t = TEMPLATES[kind];
  const errors: RowError[] = [];
  const warnings: string[] = [];
  const present = new Set(Object.keys(records[0] ?? {}));
  for (const c of t.required) if (!present.has(c)) errors.push({ line: 1, field: c, message: `The column "${c}" is missing` });
  const extra = [...present].filter((c) => !t.columns.includes(c));
  if (extra.length) warnings.push(`These columns are ignored: ${extra.join(", ")}`);
  const rows = records.map((r) => Object.fromEntries(t.columns.map((c) => [c, (r[c] ?? "").trim()])));
  rows.forEach((r, i) => {
    for (const c of t.required) if (present.has(c) && !r[c]) errors.push({ line: i + 2, field: c, message: "Required" });
  });
  return { rows, errors, warnings };
}

export async function validateStudies(ctx: RequestContext, records: Record<string, string>[]): Promise<Validation> {
  const { rows, errors, warnings } = base("studies", records);
  const { data: existing, error } = await ctx.db.from("studies").select("study_id").eq("org_id", ctx.orgId);
  if (error) throw dbError(error);
  const taken = new Set((existing ?? []).map((s) => s.study_id.toLowerCase()));
  const seen = new Map<string, number>();
  rows.forEach((r, i) => {
    const line = i + 2;
    if (r.study_id) {
      if (!CODE.test(r.study_id)) errors.push({ line, field: "study_id", message: "Use letters, digits, dot, dash or underscore (max 50)" });
      const k = r.study_id.toLowerCase();
      if (taken.has(k)) errors.push({ line, field: "study_id", message: `Study ${r.study_id} already exists` });
      if (seen.has(k)) errors.push({ line, field: "study_id", message: `Duplicate of line ${seen.get(k)}` });
      else seen.set(k, line);
    }
    if (r.protocol.length > 1000) errors.push({ line, field: "protocol", message: "At most 1000 characters" });
    if (r.phase) {
      const p = PHASES[r.phase.toLowerCase()];
      if (!p) errors.push({ line, field: "phase", message: "Use I, II, III, IV, Obs (or Phase I … Phase IV, Observational, Feasibility)" });
      else r.phase = p;
    }
    if (r.status) {
      const s = STATUSES[r.status.toLowerCase()];
      if (!s) errors.push({ line, field: "status", message: "Use Planning, Startup or Active" });
      else r.status = s;
    }
    if (r.sponsor.length > 200) errors.push({ line, field: "sponsor", message: "At most 200 characters" });
    if (r.therapeutic_area.length > 200) errors.push({ line, field: "therapeutic_area", message: "At most 200 characters" });
  });
  if (rows.length > 500) errors.push({ line: 1, field: "file", message: "Import at most 500 studies at a time" });
  return { rows, errors, warnings, summary: [`${rows.length} studies`] };
}

export async function validateSites(ctx: RequestContext, records: Record<string, string>[]): Promise<Validation> {
  const { rows, errors, warnings } = base("sites", records);
  const [studies, countries, parties] = await Promise.all([
    ctx.db.from("studies").select("id, study_id, closed_at").eq("org_id", ctx.orgId),
    ctx.db.from("countries").select("code"),
    ctx.db.from("parties").select("name").eq("party_type", "site"),
  ]);
  for (const r of [studies, countries, parties]) if (r.error) throw dbError(r.error);
  const studyByCode = new Map((studies.data ?? []).map((s) => [s.study_id.toLowerCase(), s]));
  const codes = new Set((countries.data ?? []).map((c) => c.code));
  const knownParties = new Set((parties.data ?? []).map((p) => p.name.toLowerCase()));
  const ids = [...new Set(rows.map((r) => studyByCode.get(r.study_id.toLowerCase())?.id).filter((x): x is string => !!x))];
  const { data: sites, error } = ids.length
    ? await ctx.db.from("study_sites").select("study_id, site_number").in("study_id", ids)
    : { data: [] as { study_id: string; site_number: string }[], error: null };
  if (error) throw dbError(error);
  const taken = new Set((sites ?? []).map((s) => `${s.study_id}|${s.site_number.toLowerCase()}`));
  const seen = new Map<string, number>();
  const newParties = new Set<string>();
  rows.forEach((r, i) => {
    const line = i + 2;
    const study = r.study_id ? studyByCode.get(r.study_id.toLowerCase()) : undefined;
    if (r.study_id && !study) errors.push({ line, field: "study_id", message: `Study ${r.study_id} not found` });
    if (study?.closed_at) errors.push({ line, field: "study_id", message: `Study ${r.study_id} is closed and read-only` });
    if (study) r.study_id = study.study_id;
    r.country_code = r.country_code.toUpperCase();
    if (r.country_code && !codes.has(r.country_code)) errors.push({ line, field: "country_code", message: "Use a 2-letter ISO country code, e.g. US" });
    if (r.site_name.length > 300) errors.push({ line, field: "site_name", message: "At most 300 characters" });
    if (r.site_code.length > 50) errors.push({ line, field: "site_code", message: "At most 50 characters" });
    if (study && r.site_code) {
      const k = `${study.id}|${r.site_code.toLowerCase()}`;
      if (taken.has(k)) errors.push({ line, field: "site_code", message: `Site ${r.site_code} already exists in ${study.study_id}` });
      if (seen.has(k)) errors.push({ line, field: "site_code", message: `Duplicate of line ${seen.get(k)}` });
      else seen.set(k, line);
    }
    if (r.city.length > 200) errors.push({ line, field: "city", message: "At most 200 characters" });
    if (r.pi_email && !EMAIL.test(r.pi_email)) errors.push({ line, field: "pi_email", message: "Not a valid email address" });
    if (r.pi_email && !r.pi_name) errors.push({ line, field: "pi_name", message: "Give the PI's name with their email" });
    if (r.pi_name.length > 200) errors.push({ line, field: "pi_name", message: "At most 200 characters" });
    if (r.site_name && !knownParties.has(r.site_name.toLowerCase())) newParties.add(r.site_name.toLowerCase());
  });
  if (rows.length > 1000) errors.push({ line: 1, field: "file", message: "Import at most 1000 sites at a time" });
  return { rows, errors, warnings, summary: [
    `${rows.length} sites`,
    `${newParties.size} new institution(s) added to the directory; others reuse an existing one with the same name`,
    `${rows.filter((r) => r.pi_name).length} principal investigator(s) recorded`,
  ] };
}

export async function commitImport(ctx: RequestContext, kind: Kind, rows: Record<string, string>[]): Promise<number> {
  const { data, error } = await ctx.db.rpc(kind === "studies" ? "import_studies" : "import_sites", { p_rows: rows });
  if (error) throw dbError(error);
  return data as number;
}
