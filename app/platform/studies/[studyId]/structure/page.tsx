"use client";
// Study structure (Part 2d): study → countries → sites, with organisations,
// contacts and milestones. Everything goes through /api/v1, so every read is
// access-checked and every change is permission-checked and audited.
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { ApiClientError, apiFetch } from "@/lib/api/client";
import { COUNTRY_STATUSES, SITE_STATUSES } from "@/lib/api/structure";
import { supabase } from "@/lib/supabase";

// ---------------------------------------------------------------- types

type Me = { email: string; role: string; permissions: string[] };
type Person = { id: string; given_name: string; family_name: string; email: string | null };
type Party = { id: string; name: string; party_type: string; country_code: string | null };
type Option = { code: string; label: string };
type MilestoneType = Option & { applies_to: Scope; completed_by_site_status: string | null };
type Scope = "study" | "country" | "site";
type Versioned = { id: string; row_version: number };
type Milestone = Versioned & {
  milestone_type: string; status: string; source: string;
  planned_date: string | null; actual_date: string | null;
  type: { label: string } | null;
};
type Contact = Versioned & {
  role_code: string; start_date: string; end_date: string | null;
  person: Pick<Person, "given_name" | "family_name" | "email"> | null;
};
type Site = Versioned & {
  site_number: string; display_name: string; status: string;
  site_party: { name: string } | null; contacts: Contact[]; milestones: Milestone[];
};
type Country = Versioned & { country_code: string; status: string; contacts: Contact[]; milestones: Milestone[]; sites: Site[] };
type Structure = {
  study: { id: string; study_id: string };
  parties: { id: string; role: string; party: { name: string; party_type: string } | null }[];
  contacts: Contact[];
  milestones: Milestone[];
  countries: Country[];
};
type Target = { scope: Scope; id: string; label: string };
type Dialog =
  | { kind: "country" }
  | { kind: "site"; country: Country }
  | { kind: "status"; target: "site" | "country"; row: Site | Country; label: string }
  | { kind: "party" }
  | { kind: "contact"; target: Target }
  | { kind: "endContact"; contact: Contact }
  | { kind: "planMilestone"; target: Target }
  | { kind: "recordMilestone"; milestone: Milestone };

// ---------------------------------------------------------------- look

const C = {
  primary: "#F97316", primaryLight: "#FFEDD5", text: "#111827", textSec: "#374151", muted: "#6B7280",
  border: "#E5E7EB", bg: "#FFFFFF", bgSec: "#F9FAFB", danger: "#991B1B", dangerLight: "#FEF2F2",
  success: "#065F46", successLight: "#ECFDF5", warn: "#92400E", warnLight: "#FFFBEB",
};
const STATUS_COLORS: Record<string, [string, string]> = {
  startup: [C.warnLight, C.warn], identified: [C.bgSec, C.textSec], selected: ["#EFF6FF", "#1D4ED8"],
  qualified: ["#EEF2FF", "#4338CA"], ongoing: [C.successLight, C.success], closed: ["#F3F4F6", C.muted],
  deactivated: [C.dangerLight, C.danger], planned: [C.bgSec, C.textSec], achieved: [C.successLight, C.success],
  missed: [C.dangerLight, C.danger], not_applicable: ["#F3F4F6", C.muted],
};
const pretty = (s: string) => s.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
const regionNames = typeof Intl !== "undefined" ? new Intl.DisplayNames(["en"], { type: "region" }) : null;
const countryName = (code: string) => regionNames?.of(code) ?? code;
const today = () => new Date().toISOString().slice(0, 10);

const input: React.CSSProperties = {
  width: "100%", fontSize: 12, padding: "7px 10px", border: `0.5px solid ${C.border}`, borderRadius: 8, boxSizing: "border-box",
};
const smallBtn: React.CSSProperties = {
  fontSize: 10, padding: "2px 8px", border: `0.5px solid ${C.border}`, borderRadius: 6, background: C.bg, color: C.textSec, cursor: "pointer",
};

function Badge({ value }: { value: string }) {
  const [bg, fg] = STATUS_COLORS[value] ?? [C.bgSec, C.textSec];
  return <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 20, background: bg, color: fg }}>{pretty(value)}</span>;
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label style={{ display: "block", marginBottom: 10 }}>
      <span style={{ display: "block", fontSize: 11, color: C.textSec, marginBottom: 3 }}>{label}</span>
      {children}
      {hint && <span style={{ display: "block", fontSize: 10, color: C.muted, marginTop: 3 }}>{hint}</span>}
    </label>
  );
}

function Modal({ title, onClose, onSubmit, submitLabel, busy, error, children }: {
  title: string; onClose: () => void; onSubmit: () => void; submitLabel: string;
  busy: boolean; error: string; children: React.ReactNode;
}) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16 }}>
      <div role="dialog" aria-label={title} style={{ background: C.bg, borderRadius: 14, padding: "1.25rem", width: 420, maxWidth: "100%", border: `0.5px solid ${C.border}` }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 12px", color: C.text }}>{title}</h2>
        {children}
        {error && <div style={{ fontSize: 11, color: C.danger, background: C.dangerLight, borderRadius: 6, padding: "6px 10px", marginBottom: 10 }}>{error}</div>}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button onClick={onClose} style={{ ...smallBtn, fontSize: 12, padding: "7px 14px" }}>Cancel</button>
          <button onClick={onSubmit} disabled={busy} style={{ fontSize: 12, padding: "7px 14px", border: "none", borderRadius: 6, background: busy ? "#FDBA74" : C.primary, color: "#fff", fontWeight: 600, cursor: busy ? "default" : "pointer" }}>
            {busy ? "Saving…" : submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- page

export default function StudyStructurePage() {
  const { studyId } = useParams<{ studyId: string }>();
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [tree, setTree] = useState<Structure | null>(null);
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState("");
  const [parties, setParties] = useState<Party[]>([]);
  const [persons, setPersons] = useState<Person[]>([]);
  const [roleTypes, setRoleTypes] = useState<Option[]>([]);
  const [milestoneTypes, setMilestoneTypes] = useState<MilestoneType[]>([]);
  const [dialog, setDialog] = useState<Dialog | null>(null);

  const canEdit = !!me?.permissions.includes("edit_study");
  const canManageDirectory = !!me?.permissions.includes("manage_directory");
  const roleLabel = useMemo(() => Object.fromEntries(roleTypes.map((r) => [r.code, r.label])), [roleTypes]);

  const loadTree = useCallback(async () => {
    try {
      setTree(await apiFetch<Structure>(`/studies/${studyId}/structure`));
      setLoadError("");
    } catch (e) {
      setLoadError(e instanceof ApiClientError && e.status === 404
        ? "This study doesn't exist or you don't have access to it."
        : (e as Error).message);
    }
  }, [studyId]);

  const loadDirectory = useCallback(async () => {
    const [p, pe] = await Promise.all([
      apiFetch<{ data: Party[] }>("/parties"),
      apiFetch<{ data: Person[] }>("/persons"),
    ]);
    setParties(p.data);
    setPersons(pe.data);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { setSignedIn(false); return; }
      setSignedIn(true);
      try {
        const [meRes, roles, mTypes] = await Promise.all([
          apiFetch<Me>("/me"),
          apiFetch<{ data: Option[] }>("/contact-role-types"),
          apiFetch<{ data: MilestoneType[] }>("/milestone-types"),
        ]);
        setMe(meRes);
        setRoleTypes(roles.data);
        setMilestoneTypes(mTypes.data);
        await Promise.all([loadTree(), loadDirectory()]);
      } catch (e) {
        setLoadError((e as Error).message);
      }
    });
  }, [loadTree, loadDirectory]);

  const done = async (message: string) => {
    setDialog(null);
    setNotice(message);
    setTimeout(() => setNotice(""), 3500);
    await Promise.all([loadTree(), loadDirectory()]);
  };

  if (signedIn === false) {
    return <Shell><p style={{ fontSize: 13 }}>Please <a href="/platform" style={{ color: C.primary }}>sign in</a> first.</p></Shell>;
  }
  if (loadError) return <Shell><p style={{ fontSize: 13, color: C.danger }}>{loadError}</p></Shell>;
  if (!tree || !me) return <Shell><p style={{ fontSize: 13, color: C.muted }}>Loading study structure…</p></Shell>;

  const studyTarget: Target = { scope: "study", id: tree.study.id, label: `Study ${tree.study.study_id}` };

  return (
    <Shell>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        <div>
          <a href="/platform" style={{ fontSize: 11, color: C.muted, textDecoration: "none" }}>← Back to TMF360</a>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: C.text, margin: "4px 0 2px" }}>Study structure — {tree.study.study_id}</h1>
          <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>
            Countries, sites, organisations, contacts and milestones. Changes are audited.
            {!canEdit && " You have read-only access."}
          </p>
        </div>
        {canEdit && (
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setDialog({ kind: "party" })} style={{ ...smallBtn, fontSize: 12, padding: "7px 12px" }}>Link organisation</button>
            <button onClick={() => setDialog({ kind: "country" })} style={{ fontSize: 12, padding: "7px 12px", border: "none", borderRadius: 6, background: C.primary, color: "#fff", fontWeight: 600, cursor: "pointer" }}>+ Add country</button>
          </div>
        )}
      </div>

      {notice && <div style={{ fontSize: 12, color: C.success, background: C.successLight, borderRadius: 8, padding: "8px 12px", marginBottom: 12 }}>{notice}</div>}

      <Card>
        <NodeHeader title={`Study ${tree.study.study_id}`} />
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "6px 0 2px" }}>
          {tree.parties.length === 0 && <span style={{ fontSize: 11, color: C.muted }}>No organisations linked yet.</span>}
          {tree.parties.map((p) => (
            <span key={p.id} style={{ fontSize: 11, padding: "2px 8px", borderRadius: 6, background: C.bgSec, border: `0.5px solid ${C.border}` }}>
              {p.party?.name} · <span style={{ color: C.muted }}>{pretty(p.role)}</span>
            </span>
          ))}
        </div>
        <Details
          contacts={tree.contacts} milestones={tree.milestones} roleLabel={roleLabel} canEdit={canEdit}
          onAddContact={() => setDialog({ kind: "contact", target: studyTarget })}
          onPlanMilestone={() => setDialog({ kind: "planMilestone", target: studyTarget })}
          onEndContact={(contact) => setDialog({ kind: "endContact", contact })}
          onRecordMilestone={(milestone) => setDialog({ kind: "recordMilestone", milestone })}
        />
      </Card>

      {tree.countries.length === 0 && (
        <p style={{ fontSize: 12, color: C.muted, margin: "16px 4px" }}>
          No countries yet.{canEdit ? " Use “Add country” to start building the study." : ""}
        </p>
      )}

      {tree.countries.map((country) => {
        const countryTarget: Target = { scope: "country", id: country.id, label: countryName(country.country_code) };
        return (
          <Card key={country.id} indent={1}>
            <NodeHeader
              title={`${countryName(country.country_code)} (${country.country_code})`}
              status={country.status}
              actions={canEdit && <>
                <button style={smallBtn} onClick={() => setDialog({ kind: "status", target: "country", row: country, label: countryName(country.country_code) })}>Change status</button>
                <button style={smallBtn} onClick={() => setDialog({ kind: "site", country })}>+ Add site</button>
              </>}
            />
            <Details
              contacts={country.contacts} milestones={country.milestones} roleLabel={roleLabel} canEdit={canEdit}
              onAddContact={() => setDialog({ kind: "contact", target: countryTarget })}
              onPlanMilestone={() => setDialog({ kind: "planMilestone", target: countryTarget })}
              onEndContact={(contact) => setDialog({ kind: "endContact", contact })}
              onRecordMilestone={(milestone) => setDialog({ kind: "recordMilestone", milestone })}
            />
            {country.sites.length === 0 && <p style={{ fontSize: 11, color: C.muted, margin: "8px 0 0 16px" }}>No sites in this country yet.</p>}
            {country.sites.map((site) => {
              const siteTarget: Target = { scope: "site", id: site.id, label: `Site ${site.site_number}` };
              return (
                <Card key={site.id} indent={2}>
                  <NodeHeader
                    title={`${site.site_number} — ${site.display_name}`}
                    subtitle={site.site_party?.name}
                    status={site.status}
                    actions={canEdit && (
                      <button style={smallBtn} onClick={() => setDialog({ kind: "status", target: "site", row: site, label: `Site ${site.site_number}` })}>Change status</button>
                    )}
                  />
                  <Details
                    contacts={site.contacts} milestones={site.milestones} roleLabel={roleLabel} canEdit={canEdit}
                    onAddContact={() => setDialog({ kind: "contact", target: siteTarget })}
                    onPlanMilestone={() => setDialog({ kind: "planMilestone", target: siteTarget })}
                    onEndContact={(contact) => setDialog({ kind: "endContact", contact })}
                    onRecordMilestone={(milestone) => setDialog({ kind: "recordMilestone", milestone })}
                  />
                </Card>
              );
            })}
          </Card>
        );
      })}

      {dialog && (
        <DialogView
          dialog={dialog} studyId={tree.study.id} parties={parties} persons={persons}
          roleTypes={roleTypes} milestoneTypes={milestoneTypes} existing={tree}
          canManageDirectory={canManageDirectory}
          onClose={() => setDialog(null)} onDone={done}
          onConflict={async () => { setDialog(null); setNotice("Someone else changed this record. The page has been reloaded — please try again."); await loadTree(); }}
        />
      )}
    </Shell>
  );
}

// ---------------------------------------------------------------- layout pieces

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", background: C.bgSec, fontFamily: "Arial, sans-serif" }}>
      <div style={{ maxWidth: 980, margin: "0 auto", padding: "24px 16px" }}>{children}</div>
    </div>
  );
}

function Card({ children, indent = 0 }: { children: React.ReactNode; indent?: number }) {
  return (
    <div style={{ background: C.bg, border: `0.5px solid ${C.border}`, borderRadius: 12, padding: "12px 14px", marginTop: 10, marginLeft: indent * 18 }}>
      {children}
    </div>
  );
}

function NodeHeader({ title, subtitle, status, actions }: { title: string; subtitle?: string; status?: string; actions?: React.ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{title}</span>
        {subtitle && <span style={{ fontSize: 11, color: C.muted }}>{subtitle}</span>}
        {status && <Badge value={status} />}
      </div>
      {actions && <div style={{ display: "flex", gap: 6 }}>{actions}</div>}
    </div>
  );
}

function Details({ contacts, milestones, roleLabel, canEdit, onAddContact, onPlanMilestone, onEndContact, onRecordMilestone }: {
  contacts: Contact[]; milestones: Milestone[]; roleLabel: Record<string, string>; canEdit: boolean;
  onAddContact: () => void; onPlanMilestone: () => void;
  onEndContact: (c: Contact) => void; onRecordMilestone: (m: Milestone) => void;
}) {
  const sectionTitle: React.CSSProperties = { fontSize: 10, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: ".05em", margin: "10px 0 4px" };
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
      <div>
        <div style={sectionTitle}>Contacts</div>
        {contacts.length === 0 && <div style={{ fontSize: 11, color: C.muted }}>None</div>}
        {contacts.map((c) => (
          <div key={c.id} style={{ fontSize: 12, color: c.end_date ? C.muted : C.textSec, display: "flex", justifyContent: "space-between", gap: 6, padding: "2px 0" }}>
            <span>
              <strong>{roleLabel[c.role_code] ?? c.role_code}</strong>: {c.person ? `${c.person.given_name} ${c.person.family_name}` : "—"}
              {c.end_date && <span> (ended {c.end_date})</span>}
            </span>
            {canEdit && !c.end_date && <button style={smallBtn} onClick={() => onEndContact(c)}>End</button>}
          </div>
        ))}
        {canEdit && <button style={{ ...smallBtn, marginTop: 4 }} onClick={onAddContact}>+ Add contact</button>}
      </div>
      <div>
        <div style={sectionTitle}>Milestones</div>
        {milestones.length === 0 && <div style={{ fontSize: 11, color: C.muted }}>None</div>}
        {milestones.map((m) => (
          <div key={m.id} style={{ fontSize: 12, color: C.textSec, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6, padding: "2px 0" }}>
            <span>
              {m.type?.label ?? m.milestone_type} <Badge value={m.status} />{" "}
              <span style={{ fontSize: 11, color: C.muted }}>
                {m.actual_date ? `on ${m.actual_date}` : m.planned_date ? `planned ${m.planned_date}` : ""}
                {m.source === "site_status" && " · from site status"}
              </span>
            </span>
            {canEdit && m.status !== "achieved" && <button style={smallBtn} onClick={() => onRecordMilestone(m)}>Record</button>}
          </div>
        ))}
        {canEdit && <button style={{ ...smallBtn, marginTop: 4 }} onClick={onPlanMilestone}>+ Plan milestone</button>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- dialogs

function DialogView(props: {
  dialog: Dialog; studyId: string; parties: Party[]; persons: Person[]; roleTypes: Option[];
  milestoneTypes: MilestoneType[]; existing: Structure; canManageDirectory: boolean;
  onClose: () => void; onDone: (message: string) => Promise<void>; onConflict: () => Promise<void>;
}) {
  const { dialog, studyId, onClose, onDone, onConflict } = props;
  const [form, setForm] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));
  const v = (k: string) => form[k] ?? "";
  const base = `/studies/${studyId}`;
  const send = (path: string, method: string, body: unknown) => apiFetch(path, { method, body: JSON.stringify(body) });

  async function run(action: () => Promise<string>) {
    setBusy(true);
    setError("");
    try {
      await onDone(await action());
    } catch (e) {
      if (e instanceof ApiClientError && e.status === 409 && /changed by someone else/i.test(e.message)) {
        await onConflict();
        return;
      }
      const details = e instanceof ApiClientError && Array.isArray(e.details)
        ? " " + (e.details as { message: string }[]).map((d) => d.message).join("; ")
        : "";
      setError((e as Error).message + details);
    }
    setBusy(false);
  }

  const common = { onClose, busy, error };

  switch (dialog.kind) {
    case "country": {
      const used = new Set(props.existing.countries.map((c) => c.country_code));
      return (
        <Modal title="Add country" submitLabel="Add country" {...common} onSubmit={() => run(async () => {
          const code = v("code").trim().toUpperCase();
          if (used.has(code)) throw new Error(`${countryName(code)} is already in this study.`);
          await send(`${base}/countries`, "POST", { country_code: code, status: v("status") || "startup" });
          return `${countryName(code)} added.`;
        })}>
          <Field label="Country code" hint={v("code").length === 2 ? countryName(v("code").toUpperCase()) : "2-letter ISO code, e.g. US, GB, DE"}>
            <input style={input} value={v("code")} onChange={set("code")} maxLength={2} placeholder="US" autoFocus />
          </Field>
          <Field label="Status">
            <select style={input} value={v("status") || "startup"} onChange={set("status")}>
              {COUNTRY_STATUSES.map((s) => <option key={s} value={s}>{pretty(s)}</option>)}
            </select>
          </Field>
        </Modal>
      );
    }

    case "site": {
      const sites = props.parties.filter((p) => p.party_type === "site");
      const creating = v("party") === "__new";
      return (
        <Modal title={`Add site in ${countryName(dialog.country.country_code)}`} submitLabel="Add site" {...common} onSubmit={() => run(async () => {
          let partyId = v("party");
          if (!partyId) throw new Error("Choose the institution.");
          if (creating) {
            const party = await apiFetch<{ id: string }>("/parties", { method: "POST", body: JSON.stringify({ party_type: "site", name: v("newParty"), country_code: dialog.country.country_code }) });
            partyId = party.id;
          }
          await send(`${base}/sites`, "POST", {
            study_country_id: dialog.country.id, site_number: v("number"), site_party_id: partyId,
            display_name: v("name") || (creating ? v("newParty") : sites.find((s) => s.id === partyId)?.name ?? ""),
            status: v("status") || "identified",
          });
          return `Site ${v("number")} added.`;
        })}>
          <Field label="Site number"><input style={input} value={v("number")} onChange={set("number")} placeholder="1121" autoFocus /></Field>
          <Field label="Institution">
            <select style={input} value={v("party")} onChange={set("party")}>
              <option value="">Choose…</option>
              {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              {props.canManageDirectory && <option value="__new">+ New institution…</option>}
            </select>
          </Field>
          {creating && <Field label="New institution name"><input style={input} value={v("newParty")} onChange={set("newParty")} /></Field>}
          <Field label="Display name" hint="Defaults to the institution name"><input style={input} value={v("name")} onChange={set("name")} /></Field>
          <Field label="Status">
            <select style={input} value={v("status") || "identified"} onChange={set("status")}>
              {SITE_STATUSES.map((s) => <option key={s} value={s}>{pretty(s)}</option>)}
            </select>
          </Field>
        </Modal>
      );
    }

    case "status": {
      const options = dialog.target === "site" ? SITE_STATUSES : COUNTRY_STATUSES;
      const completes = dialog.target === "site"
        ? props.milestoneTypes.find((t) => t.completed_by_site_status === v("status"))
        : undefined;
      return (
        <Modal title={`Change status — ${dialog.label}`} submitLabel="Change status" {...common} onSubmit={() => run(async () => {
          if (!v("status") || v("status") === dialog.row.status) throw new Error("Choose a new status.");
          const path = dialog.target === "site" ? `${base}/sites/${dialog.row.id}` : `${base}/countries/${dialog.row.id}`;
          await send(path, "PATCH", { row_version: dialog.row.row_version, status: v("status"), change_reason: v("reason") });
          return `${dialog.label} is now ${pretty(v("status")).toLowerCase()}.`;
        })}>
          <p style={{ fontSize: 12, color: C.muted, margin: "0 0 10px" }}>Current status: <Badge value={dialog.row.status} /></p>
          <Field label="New status">
            <select style={input} value={v("status")} onChange={set("status")}>
              <option value="">Choose…</option>
              {options.filter((s) => s !== dialog.row.status).map((s) => <option key={s} value={s}>{pretty(s)}</option>)}
            </select>
          </Field>
          {completes && <p style={{ fontSize: 11, color: C.success, background: C.successLight, borderRadius: 6, padding: "6px 10px", margin: "0 0 10px" }}>This will also mark “{completes.label}” achieved today.</p>}
          <Field label="Reason for change (recorded in the audit trail)">
            <textarea style={{ ...input, minHeight: 60 }} value={v("reason")} onChange={set("reason")} />
          </Field>
        </Modal>
      );
    }

    case "party": {
      const linkable = props.parties.filter((p) => p.party_type !== "site");
      const creating = v("party") === "__new";
      return (
        <Modal title="Link an organisation to the study" submitLabel="Link" {...common} onSubmit={() => run(async () => {
          let partyId = v("party");
          if (!partyId) throw new Error("Choose an organisation.");
          const role = v("role") || "sponsor";
          if (creating) {
            const party = await apiFetch<{ id: string }>("/parties", { method: "POST", body: JSON.stringify({ party_type: role === "central_lab" ? "vendor" : role === "other" ? "other" : role, name: v("newParty") }) });
            partyId = party.id;
          }
          await send(`${base}/parties`, "POST", { party_id: partyId, role });
          return "Organisation linked.";
        })}>
          <Field label="Role in this study">
            <select style={input} value={v("role") || "sponsor"} onChange={set("role")}>
              {["sponsor", "cro", "vendor", "central_lab", "other"].map((r) => <option key={r} value={r}>{r === "cro" ? "CRO" : pretty(r)}</option>)}
            </select>
          </Field>
          <Field label="Organisation">
            <select style={input} value={v("party")} onChange={set("party")}>
              <option value="">Choose…</option>
              {linkable.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.party_type === "cro" ? "CRO" : pretty(p.party_type)})</option>)}
              {props.canManageDirectory && <option value="__new">+ New organisation…</option>}
            </select>
          </Field>
          {creating && <Field label="New organisation name"><input style={input} value={v("newParty")} onChange={set("newParty")} /></Field>}
        </Modal>
      );
    }

    case "contact": {
      const creating = v("person") === "__new";
      return (
        <Modal title={`Add contact — ${dialog.target.label}`} submitLabel="Add contact" {...common} onSubmit={() => run(async () => {
          let personId = v("person");
          if (!personId) throw new Error("Choose a person.");
          if (!v("role")) throw new Error("Choose a role.");
          if (creating) {
            const person = await apiFetch<{ id: string }>("/persons", { method: "POST", body: JSON.stringify({ given_name: v("given"), family_name: v("family"), email: v("email") || null }) });
            personId = person.id;
          }
          await send(`${base}/contacts`, "POST", { person_id: personId, scope_type: dialog.target.scope, scope_id: dialog.target.id, role_code: v("role"), start_date: v("start") || today() });
          return "Contact added.";
        })}>
          <Field label="Role">
            <select style={input} value={v("role")} onChange={set("role")}>
              <option value="">Choose…</option>
              {props.roleTypes.map((r) => <option key={r.code} value={r.code}>{r.label}</option>)}
            </select>
          </Field>
          <Field label="Person">
            <select style={input} value={v("person")} onChange={set("person")}>
              <option value="">Choose…</option>
              {props.persons.map((p) => <option key={p.id} value={p.id}>{p.family_name}, {p.given_name}{p.email ? ` (${p.email})` : ""}</option>)}
              {props.canManageDirectory && <option value="__new">+ New person…</option>}
            </select>
          </Field>
          {creating && <>
            <Field label="Given name"><input style={input} value={v("given")} onChange={set("given")} /></Field>
            <Field label="Family name"><input style={input} value={v("family")} onChange={set("family")} /></Field>
            <Field label="Email (optional)"><input style={input} type="email" value={v("email")} onChange={set("email")} /></Field>
          </>}
          <Field label="Start date"><input style={input} type="date" value={v("start") || today()} onChange={set("start")} /></Field>
        </Modal>
      );
    }

    case "endContact": {
      const c = dialog.contact;
      return (
        <Modal title="End contact role" submitLabel="End role" {...common} onSubmit={() => run(async () => {
          await send(`${base}/contacts/${c.id}`, "PATCH", { row_version: c.row_version, end_date: v("end") || today(), change_reason: v("reason") });
          return "Contact role ended.";
        })}>
          <p style={{ fontSize: 12, color: C.textSec, margin: "0 0 10px" }}>
            {c.person ? `${c.person.given_name} ${c.person.family_name}` : "This person"} will no longer hold this role after the end date. The history is kept.
          </p>
          <Field label="End date"><input style={input} type="date" value={v("end") || today()} onChange={set("end")} /></Field>
          <Field label="Reason (recorded in the audit trail)"><textarea style={{ ...input, minHeight: 60 }} value={v("reason")} onChange={set("reason")} /></Field>
        </Modal>
      );
    }

    case "planMilestone": {
      const t = dialog.target;
      const existing = new Set(
        (t.scope === "study" ? props.existing.milestones
          : t.scope === "country" ? props.existing.countries.find((c) => c.id === t.id)?.milestones
          : props.existing.countries.flatMap((c) => c.sites).find((s) => s.id === t.id)?.milestones ?? []
        )?.map((m) => m.milestone_type),
      );
      const options = props.milestoneTypes.filter((m) => m.applies_to === t.scope && !existing.has(m.code));
      return (
        <Modal title={`Plan milestone — ${t.label}`} submitLabel="Plan milestone" {...common} onSubmit={() => run(async () => {
          if (!v("type")) throw new Error("Choose a milestone.");
          await send(`${base}/milestones`, "POST", { scope_type: t.scope, scope_id: t.id, milestone_type: v("type"), planned_date: v("planned") || null });
          return "Milestone planned.";
        })}>
          {options.length === 0
            ? <p style={{ fontSize: 12, color: C.muted }}>Every milestone for this level is already planned.</p>
            : <>
              <Field label="Milestone">
                <select style={input} value={v("type")} onChange={set("type")}>
                  <option value="">Choose…</option>
                  {options.map((m) => <option key={m.code} value={m.code}>{m.label}{m.completed_by_site_status ? ` (set automatically when the site becomes ${pretty(m.completed_by_site_status).toLowerCase()})` : ""}</option>)}
                </select>
              </Field>
              <Field label="Planned date (optional)"><input style={input} type="date" value={v("planned")} onChange={set("planned")} /></Field>
            </>}
        </Modal>
      );
    }

    case "recordMilestone": {
      const m = dialog.milestone;
      return (
        <Modal title={`Record — ${m.type?.label ?? m.milestone_type}`} submitLabel="Save" {...common} onSubmit={() => run(async () => {
          const outcome = v("outcome") || "achieved";
          const body = outcome === "achieved"
            ? { row_version: m.row_version, actual_date: v("actual") || today(), change_reason: v("reason") }
            : { row_version: m.row_version, status: outcome, change_reason: v("reason") };
          await send(`${base}/milestones/${m.id}`, "PATCH", body);
          return "Milestone updated.";
        })}>
          <Field label="Outcome">
            <select style={input} value={v("outcome") || "achieved"} onChange={set("outcome")}>
              <option value="achieved">Achieved</option>
              <option value="missed">Missed</option>
              <option value="not_applicable">Not applicable</option>
            </select>
          </Field>
          {(v("outcome") || "achieved") === "achieved" && (
            <Field label="Actual date"><input style={input} type="date" value={v("actual") || today()} onChange={set("actual")} /></Field>
          )}
          <Field label="Reason (recorded in the audit trail)"><textarea style={{ ...input, minHeight: 60 }} value={v("reason")} onChange={set("reason")} /></Field>
        </Modal>
      );
    }
  }
}
