"use client";
// Countries & sites (Part 15): the study's countries with their sites, enrollment, completeness (PLC-06) and key
// dates in one table. Add a country, add a site (pick an existing site institution or create one), update
// enrollment. Status changes, contacts and milestones stay on the Study structure page (they need reasons).
import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiClientError, apiFetch } from "../../lib/api/client";
import { INSTITUTION_LABELS, INSTITUTION_TYPES } from "../../lib/api/structure";

type KeyDate = { date: string | null; actual: boolean };
type Site = {
  id: string; site_number: string; display_name: string; status: string; row_version: number;
  institution: { id: string; name: string; city: string | null; institution_type: string | null } | null;
  target_enrollment: number | null; actual_enrollment: number; completeness: number | null; missing: number;
  activated: KeyDate; first_patient_in: KeyDate; pi: string | null; cra: string | null;
};
type Country = {
  id: string; country_code: string; country_name: string; region: string; regulatory_authority: string | null; status: string;
  sites_total: number; sites_active: number; target_enrollment: number; actual_enrollment: number;
  completeness: number | null; missing: number; submitted: KeyDate; approved: KeyDate; first_patient_in: KeyDate; sites: Site[];
};
type Hierarchy = {
  totals: { countries: number; sites_total: number; sites_active: number; target_enrollment: number; actual_enrollment: number; completeness: number | null; missing: number };
  countries: Country[];
};
type RefCountry = { code: string; name: string; region: string; regulatory_authority: string | null };
type Party = { id: string; name: string; country_code: string | null; city: string | null };

const C = {
  orange: "#F97316", orangeLight: "#FFF7ED", text: "#111827", textSec: "#374151", textMuted: "#6B7280",
  border: "#E5EDF6", bg: "#F8FAFC", bgCard: "#FFFFFF", green: "#10B981", greenDark: "#065F46", greenLight: "#ECFDF5",
  amber: "#F59E0B", amberDark: "#92400E", amberLight: "#FFFBEB", red: "#EF4444", redDark: "#991B1B", redLight: "#FEF2F2",
  blue: "#3B82F6", blueDark: "#1E40AF", blueLight: "#EFF6FF", gray: "#4B5563", grayLight: "#F3F4F6",
};
const card: React.CSSProperties = { background: C.bgCard, border: `0.5px solid ${C.border}`, borderRadius: "12px", padding: "14px 16px" };
const btn = (bg: string, color: string): React.CSSProperties => ({ fontSize: "12px", fontWeight: 600, padding: "6px 12px", background: bg, color, border: `0.5px solid ${C.border}`, borderRadius: "8px", cursor: "pointer" });
const input: React.CSSProperties = { width: "100%", fontSize: "13px", padding: "8px 10px", border: `0.5px solid ${C.border}`, borderRadius: "8px", fontFamily: "inherit", boxSizing: "border-box", background: C.bgCard };
const th: React.CSSProperties = { textAlign: "left", padding: "8px 10px", fontSize: "11px", fontWeight: 600, color: C.textSec, whiteSpace: "nowrap" };
const td: React.CSSProperties = { padding: "8px 10px", fontSize: "12px", color: C.text, borderTop: `0.5px solid ${C.border}`, verticalAlign: "top" };

const flag = (code: string) => String.fromCodePoint(...[...code.toUpperCase()].map((c) => 0x1f1a5 + c.charCodeAt(0)));
const pct = (n: number | null) => (n == null ? "—" : `${Math.round(n)}%`);
const fmtDate = (d: KeyDate) => (d.date ? `${d.date}${d.actual ? "" : " (planned)"}` : "—");
const STATUS: Record<string, { label: string; fg: string; bg: string }> = {
  identified: { label: "Identified", fg: C.gray, bg: C.grayLight }, selected: { label: "Selected", fg: C.blueDark, bg: C.blueLight },
  qualified: { label: "Qualified", fg: C.blueDark, bg: C.blueLight }, ongoing: { label: "Active", fg: C.greenDark, bg: C.greenLight },
  closed: { label: "Closed", fg: C.gray, bg: C.grayLight }, deactivated: { label: "Deactivated", fg: C.amberDark, bg: C.amberLight },
  startup: { label: "Start-up", fg: C.blueDark, bg: C.blueLight },
};
const badge = (s: string) => {
  const b = STATUS[s] ?? { label: s, fg: C.gray, bg: C.grayLight };
  return <span style={{ fontSize: "10px", fontWeight: 600, padding: "3px 9px", borderRadius: "20px", color: b.fg, background: b.bg, whiteSpace: "nowrap" }}>{b.label}</span>;
};
const compColor = (n: number | null) => (n == null ? C.textMuted : n >= 80 ? C.greenDark : n >= 60 ? C.amberDark : C.redDark);
const errText = (e: unknown) => (e instanceof ApiClientError ? e.message : "Something went wrong. Try again.");

function Modal({ title, onClose, onSave, saving, canSave, next, children }: {
  title: string; onClose: () => void; onSave: () => void; saving: boolean; canSave: boolean; next: string; children: React.ReactNode;
}) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
      <div role="dialog" aria-label={title} style={{ background: C.bgCard, borderRadius: "14px", padding: "24px", width: "100%", maxWidth: "520px", maxHeight: "85vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px" }}>
          <div style={{ fontSize: "15px", fontWeight: 600, color: C.text }}>{title}</div>
          <button onClick={onClose} aria-label="Close" style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: C.textMuted }}>×</button>
        </div>
        {children}
        <div style={{ fontSize: "11px", color: C.textMuted, background: C.bg, borderRadius: "8px", padding: "8px 10px", marginTop: "6px" }}>What happens next: {next}</div>
        <div style={{ display: "flex", gap: "8px", marginTop: "16px" }}>
          <button onClick={onClose} style={{ flex: 1, padding: "10px", border: `0.5px solid ${C.border}`, borderRadius: "8px", background: C.bgCard, cursor: "pointer", fontSize: "13px" }}>Cancel</button>
          <button onClick={onSave} disabled={saving || !canSave} style={{ flex: 2, padding: "10px", background: C.orange, color: "#fff", border: "none", borderRadius: "8px", cursor: saving || !canSave ? "default" : "pointer", fontSize: "13px", fontWeight: 600, opacity: saving || !canSave ? 0.6 : 1 }}>{saving ? "Saving..." : "Save"}</button>
        </div>
      </div>
    </div>
  );
}
const Field = ({ label, error, children }: { label: string; error?: string | null; children: React.ReactNode }) => (
  <div style={{ marginBottom: "12px" }}>
    <label style={{ fontSize: "11px", fontWeight: 600, color: C.textSec, display: "block", marginBottom: "5px" }}>{label}</label>
    {children}
    {error && <div style={{ fontSize: "11px", color: C.redDark, marginTop: "4px" }}>{error}</div>}
  </div>
);

export default function CountriesSites({ study, canEdit, canManageDirectory }: {
  study: { id: string; study_id: string }; canEdit: boolean; canManageDirectory: boolean;
}) {
  const [data, setData] = useState<Hierarchy | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [refCountries, setRefCountries] = useState<RefCountry[]>([]);
  const [modal, setModal] = useState<null | { kind: "country" } | { kind: "site"; countryId?: string } | { kind: "enrollment"; site: Site }>(null);

  const [reloads, setReloads] = useState(0);
  const load = useCallback(() => setReloads((n) => n + 1), []);
  useEffect(() => {
    let cancelled = false;
    apiFetch<Hierarchy>(`/studies/${study.id}/hierarchy`)
      .then((h) => { if (!cancelled) { setData(h); setError(null); } })
      .catch((e) => { if (!cancelled) setError(errText(e)); });
    return () => { cancelled = true; };
  }, [study.id, reloads]);
  useEffect(() => {
    let cancelled = false;
    apiFetch<{ data: RefCountry[] }>("/countries").then((r) => { if (!cancelled) setRefCountries(r.data); }).catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  const totals = data?.totals;
  return (
    <div style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "14px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "16px", fontWeight: 600, color: C.text }}>Countries & sites</div>
          <div style={{ fontSize: "12px", color: C.textMuted }}>Study {study.study_id}: where it runs, how each site is enrolling and how complete its TMF is.</div>
        </div>
        {canEdit && <button style={btn(C.bgCard, C.textSec)} onClick={() => setModal({ kind: "country" })}><i className="ti ti-world-plus" /> Add country</button>}
        {canEdit && <button style={btn(C.orange, "#fff")} disabled={!data?.countries.length} onClick={() => setModal({ kind: "site" })}><i className="ti ti-building-hospital" /> Add site</button>}
        <a href={`/platform/studies/${study.id}/structure`} style={{ ...btn(C.bgCard, C.textSec), textDecoration: "none" }}>Study structure</a>
      </div>

      {error && <div role="alert" style={{ ...card, background: C.redLight, color: C.redDark, fontSize: "12px" }}>{error}</div>}
      {!data && !error && <div style={{ fontSize: "12px", color: C.textMuted }}>Loading countries and sites…</div>}

      {totals && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "10px" }}>
          {[
            ["Countries", String(totals.countries)],
            ["Active sites", `${totals.sites_active} of ${totals.sites_total}`],
            ["Enrolled", `${totals.actual_enrollment}${totals.target_enrollment ? ` / ${totals.target_enrollment}` : ""}`],
            ["Completeness", pct(totals.completeness)],
            ["Missing documents", String(totals.missing)],
          ].map(([k, v]) => (
            <div key={k} style={card}>
              <div style={{ fontSize: "11px", color: C.textMuted }}>{k}</div>
              <div style={{ fontSize: "20px", fontWeight: 600, color: k === "Completeness" ? compColor(totals.completeness) : C.text }}>{v}</div>
            </div>
          ))}
        </div>
      )}

      {data && data.countries.length === 0 && (
        <div style={{ ...card, textAlign: "center", padding: "2.5rem 1rem" }}>
          <i className="ti ti-world" style={{ fontSize: "32px", color: C.textMuted }} />
          <div style={{ fontSize: "13px", fontWeight: 600, color: C.text, marginTop: "8px" }}>No countries added to this study yet.</div>
          <div style={{ fontSize: "12px", color: C.textMuted }}>{canEdit ? "Add your first country, then add its sites." : "A study manager adds countries and sites."}</div>
        </div>
      )}

      {data && data.countries.length > 0 && (
        <div style={{ ...card, padding: 0, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr style={{ background: C.bg }}>
              {["", "Country", "Status", "Sites active", "Enrolled / target", "Completeness", "Missing", "Approval", "First patient in"].map((h) => <th key={h} style={th}>{h}</th>)}
            </tr></thead>
            <tbody>
              {data.countries.map((c) => (
                <CountryRows key={c.id} c={c} open={!!open[c.id]} toggle={() => setOpen((o) => ({ ...o, [c.id]: !o[c.id] }))}
                  canEdit={canEdit} onAddSite={() => setModal({ kind: "site", countryId: c.id })}
                  onEnrollment={(site) => setModal({ kind: "enrollment", site })} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal?.kind === "country" && (
        <AddCountry studyId={study.id} refCountries={refCountries} existing={new Set(data?.countries.map((c) => c.country_code))}
          onClose={() => setModal(null)} onDone={() => { setModal(null); load(); }} />
      )}
      {modal?.kind === "site" && data && (
        <AddSite studyId={study.id} countries={data.countries} initialCountry={modal.countryId} canManageDirectory={canManageDirectory}
          onClose={() => setModal(null)} onDone={() => { setModal(null); load(); }} />
      )}
      {modal?.kind === "enrollment" && (
        <EditEnrollment studyId={study.id} site={modal.site} onClose={() => setModal(null)} onDone={() => { setModal(null); load(); }} />
      )}
    </div>
  );
}

function CountryRows({ c, open, toggle, canEdit, onAddSite, onEnrollment }: {
  c: Country; open: boolean; toggle: () => void; canEdit: boolean; onAddSite: () => void; onEnrollment: (s: Site) => void;
}) {
  return (
    <>
      <tr style={{ cursor: "pointer" }} onClick={toggle}>
        <td style={td}><i className={`ti ti-chevron-${open ? "down" : "right"}`} aria-label={open ? "Collapse" : "Expand"} /></td>
        <td style={td}>
          <span style={{ marginRight: "6px" }}>{flag(c.country_code)}</span><b>{c.country_name}</b>
          <div style={{ fontSize: "11px", color: C.textMuted }}>{c.region}{c.regulatory_authority ? ` · ${c.regulatory_authority}` : ""}</div>
        </td>
        <td style={td}>{badge(c.status)}</td>
        <td style={td}>{c.sites_active} / {c.sites_total}</td>
        <td style={td}>{c.actual_enrollment}{c.target_enrollment ? ` / ${c.target_enrollment}` : ""}</td>
        <td style={{ ...td, fontWeight: 600, color: compColor(c.completeness) }}>{pct(c.completeness)}</td>
        <td style={td}>{c.missing}</td>
        <td style={td}>{fmtDate(c.approved)}</td>
        <td style={td}>{fmtDate(c.first_patient_in)}</td>
      </tr>
      {open && (
        <tr><td style={{ ...td, background: C.bg, padding: "10px 14px" }} colSpan={9}>
          {c.sites.length === 0 ? (
            <div style={{ fontSize: "12px", color: C.textMuted }}>No sites added to this country yet.{canEdit && <> <button style={{ ...btn(C.bgCard, C.orange), marginLeft: "6px" }} onClick={onAddSite}>Add site</button></>}</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", background: C.bgCard, borderRadius: "8px" }}>
              <thead><tr>{["Site", "Institution", "Status", "PI", "CRA", "Enrolled / target", "Completeness", "Activated", ""].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
              <tbody>
                {c.sites.map((s) => (
                  <tr key={s.id}>
                    <td style={td}><b>{s.site_number}</b> — {s.display_name}</td>
                    <td style={td}>{s.institution?.name ?? "—"}<div style={{ fontSize: "11px", color: C.textMuted }}>{[s.institution?.city, s.institution?.institution_type ? INSTITUTION_LABELS[s.institution.institution_type as keyof typeof INSTITUTION_LABELS] : null].filter(Boolean).join(" · ")}</div></td>
                    <td style={td}>{badge(s.status)}</td>
                    <td style={td}>{s.pi ?? "—"}</td>
                    <td style={td}>{s.cra ?? "—"}</td>
                    <td style={td}>{s.actual_enrollment}{s.target_enrollment != null ? ` / ${s.target_enrollment}` : ""}</td>
                    <td style={{ ...td, fontWeight: 600, color: compColor(s.completeness) }}>{pct(s.completeness)}{s.missing > 0 && <span style={{ fontWeight: 400, color: C.redDark }}> · {s.missing} missing</span>}</td>
                    <td style={td}>{fmtDate(s.activated)}</td>
                    <td style={td}>{canEdit && <button style={btn(C.bgCard, C.textSec)} onClick={() => onEnrollment(s)}>Enrollment</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </td></tr>
      )}
    </>
  );
}

function AddCountry({ studyId, refCountries, existing, onClose, onDone }: {
  studyId: string; refCountries: RefCountry[]; existing: Set<string>; onClose: () => void; onDone: () => void;
}) {
  const [code, setCode] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const options = refCountries.filter((c) => !existing.has(c.code));
  const chosen = refCountries.find((c) => c.code === code);
  async function save() {
    setSaving(true); setErr(null);
    try { await apiFetch(`/studies/${studyId}/countries`, { method: "POST", body: JSON.stringify({ country_code: code }) }); onDone(); }
    catch (e) { setErr(errText(e)); } finally { setSaving(false); }
  }
  return (
    <Modal title="Add country" onClose={onClose} onSave={save} saving={saving} canSave={!!code}
      next="the country is added in Start-up status and recorded in the audit trail. Plan its submission, approval and first-patient-in dates on the Study structure page.">
      <Field label="Country" error={err}>
        <select value={code} onChange={(e) => setCode(e.target.value)} style={input}>
          <option value="">Choose a country…</option>
          {options.map((c) => <option key={c.code} value={c.code}>{c.name} ({c.code})</option>)}
        </select>
      </Field>
      {chosen && <div style={{ fontSize: "12px", color: C.textSec, marginBottom: "8px" }}>Region: {chosen.region} · Regulator: {chosen.regulatory_authority ?? "not on file"}</div>}
    </Modal>
  );
}

function AddSite({ studyId, countries, initialCountry, canManageDirectory, onClose, onDone }: {
  studyId: string; countries: Country[]; initialCountry?: string; canManageDirectory: boolean; onClose: () => void; onDone: () => void;
}) {
  const [countryId, setCountryId] = useState(initialCountry ?? countries[0]?.id ?? "");
  const [parties, setParties] = useState<Party[]>([]);
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [search, setSearch] = useState("");
  const [partyId, setPartyId] = useState("");
  const [inst, setInst] = useState({ name: "", city: "", address: "", institution_type: "" });
  const [siteNumber, setSiteNumber] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [target, setTarget] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const country = countries.find((c) => c.id === countryId);

  useEffect(() => {
    let cancelled = false;
    apiFetch<{ data: Party[] }>("/parties?type=site").then((r) => { if (!cancelled) setParties(r.data); }).catch(() => undefined);
    return () => { cancelled = true; };
  }, []);
  const matches = useMemo(() => parties
    .filter((p) => !search.trim() || `${p.name} ${p.city ?? ""}`.toLowerCase().includes(search.trim().toLowerCase()))
    .sort((a, b) => Number(b.country_code === country?.country_code) - Number(a.country_code === country?.country_code))
    .slice(0, 50), [parties, search, country?.country_code]);

  // Site numbers are unique across the study.
  const dup = countries.some((c) => c.sites.some((s) => s.site_number.trim().toLowerCase() === siteNumber.trim().toLowerCase()));
  const targetOk = target === "" || /^\d+$/.test(target);
  const instOk = mode === "existing" ? !!partyId : inst.name.trim().length > 0;
  const canSave = !!countryId && !!siteNumber.trim() && !dup && targetOk && instOk;

  async function save() {
    setSaving(true); setErr(null);
    try {
      let site_party_id = partyId;
      if (mode === "new") {
        const p = await apiFetch<{ id: string }>("/parties", { method: "POST", body: JSON.stringify({
          party_type: "site", name: inst.name.trim(), country_code: country?.country_code,
          city: inst.city.trim() || null, address: inst.address.trim() || null, institution_type: inst.institution_type || null,
        }) });
        site_party_id = p.id;
      }
      const name = displayName.trim() || (mode === "new" ? inst.name.trim() : parties.find((p) => p.id === partyId)?.name ?? "");
      await apiFetch(`/studies/${studyId}/sites`, { method: "POST", body: JSON.stringify({
        study_country_id: countryId, site_number: siteNumber.trim(), site_party_id, display_name: name.slice(0, 300),
        target_enrollment: target === "" ? null : Number(target),
      }) });
      onDone();
    } catch (e) { setErr(errText(e)); } finally { setSaving(false); }
  }

  return (
    <Modal title="Add site" onClose={onClose} onSave={save} saving={saving} canSave={canSave}
      next="the site is added to this study in Identified status and recorded in the audit trail. Its status moves forward as you record site milestones on the Study structure page.">
      <Field label="Country">
        <select value={countryId} onChange={(e) => setCountryId(e.target.value)} style={input}>
          {countries.map((c) => <option key={c.id} value={c.id}>{c.country_name}</option>)}
        </select>
      </Field>
      <div style={{ display: "flex", gap: "6px", marginBottom: "10px" }}>
        <button style={btn(mode === "existing" ? C.orangeLight : C.bgCard, mode === "existing" ? C.orange : C.textSec)} onClick={() => setMode("existing")}>Existing institution</button>
        {canManageDirectory && <button style={btn(mode === "new" ? C.orangeLight : C.bgCard, mode === "new" ? C.orange : C.textSec)} onClick={() => setMode("new")}>New institution</button>}
      </div>
      {mode === "existing" ? (
        <Field label="Institution" error={parties.length === 0 ? "No site institutions in your directory yet — create a new one." : null}>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or city" style={{ ...input, marginBottom: "6px" }} />
          <select value={partyId} onChange={(e) => setPartyId(e.target.value)} style={input} size={Math.min(6, Math.max(2, matches.length))}>
            {matches.map((p) => <option key={p.id} value={p.id}>{p.name}{p.city ? ` — ${p.city}` : ""}{p.country_code ? ` (${p.country_code})` : ""}</option>)}
          </select>
        </Field>
      ) : (
        <>
          <Field label="Institution name"><input value={inst.name} onChange={(e) => setInst({ ...inst, name: e.target.value })} maxLength={300} style={input} placeholder="e.g. Mayo Clinic Rochester" /></Field>
          <div style={{ display: "flex", gap: "8px" }}>
            <div style={{ flex: 1 }}><Field label="City"><input value={inst.city} onChange={(e) => setInst({ ...inst, city: e.target.value })} maxLength={200} style={input} /></Field></div>
            <div style={{ flex: 1 }}><Field label="Institution type">
              <select value={inst.institution_type} onChange={(e) => setInst({ ...inst, institution_type: e.target.value })} style={input}>
                <option value="">Not specified</option>
                {INSTITUTION_TYPES.map((t) => <option key={t} value={t}>{INSTITUTION_LABELS[t]}</option>)}
              </select>
            </Field></div>
          </div>
          <Field label="Address"><input value={inst.address} onChange={(e) => setInst({ ...inst, address: e.target.value })} maxLength={1000} style={input} /></Field>
        </>
      )}
      <div style={{ display: "flex", gap: "8px" }}>
        <div style={{ flex: 1 }}><Field label="Site number" error={dup ? "This site number is already used in the study" : null}>
          <input value={siteNumber} onChange={(e) => setSiteNumber(e.target.value)} maxLength={50} style={input} placeholder="e.g. 101" />
        </Field></div>
        <div style={{ flex: 1 }}><Field label="Target enrollment" error={targetOk ? null : "Use a whole number"}>
          <input value={target} onChange={(e) => setTarget(e.target.value)} inputMode="numeric" style={input} placeholder="optional" />
        </Field></div>
      </div>
      <Field label="Display name (optional)" error={err}>
        <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={300} style={input} placeholder="Defaults to the institution name" />
      </Field>
    </Modal>
  );
}

function EditEnrollment({ studyId, site, onClose, onDone }: { studyId: string; site: Site; onClose: () => void; onDone: () => void }) {
  const [target, setTarget] = useState(site.target_enrollment == null ? "" : String(site.target_enrollment));
  const [actual, setActual] = useState(String(site.actual_enrollment));
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const ok = (target === "" || /^\d+$/.test(target)) && /^\d+$/.test(actual);
  async function save() {
    setSaving(true); setErr(null);
    try {
      await apiFetch(`/studies/${studyId}/sites/${site.id}`, { method: "PATCH", body: JSON.stringify({
        row_version: site.row_version, target_enrollment: target === "" ? null : Number(target), actual_enrollment: Number(actual),
      }) });
      onDone();
    } catch (e) { setErr(errText(e)); } finally { setSaving(false); }
  }
  return (
    <Modal title={`Enrollment — site ${site.site_number}`} onClose={onClose} onSave={save} saving={saving} canSave={ok}
      next="the new figures replace the old ones; both are kept in the audit trail.">
      <div style={{ display: "flex", gap: "8px" }}>
        <div style={{ flex: 1 }}><Field label="Target"><input value={target} onChange={(e) => setTarget(e.target.value)} inputMode="numeric" style={input} /></Field></div>
        <div style={{ flex: 1 }}><Field label="Enrolled to date" error={/^\d+$/.test(actual) ? null : "Use a whole number"}><input value={actual} onChange={(e) => setActual(e.target.value)} inputMode="numeric" style={input} /></Field></div>
      </div>
      {err && <div role="alert" style={{ fontSize: "12px", color: C.redDark }}>{err}</div>}
    </Modal>
  );
}
