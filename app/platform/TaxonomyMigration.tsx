"use client";
// Taxonomy version (Part 14f, RM-04/05): the study is pinned to one TMF Reference Model version. Moving it to
// a newer version is planned (impact report), split record types are decided per document, and the move is
// executed with the electronic signature "Mapping approved". Filed records are never changed.
import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api/client";

type Option = { artifact_id: string; artifact_num: string; name: string };
type Impact = {
  documents: number; mapped: number; needs_choice: number; retired: number; unmapped: number;
  choices: { document_id: string; artifact_num: string; options: Option[] }[];
  unmapped_documents?: { document_id: string; artifact_num: string }[];
};
type Migration = { id: string; status: "planned" | "executed" | "cancelled"; impact: Impact; executed_at: string | null; cancel_reason: string | null; created_at: string; from_label: string | null; to_label: string | null };
type State = { current: { id: string | null; label: string | null }; targets: { id: string; label: string | null }[]; migrations: Migration[] };

const C = {
  text: "#111827", textSec: "#374151", textMuted: "#6B7280", border: "#E5EDF6", bgCard: "#FFFFFF", bg: "#F8FAFC",
  orange: "#F97316", green: "#065F46", greenLight: "#ECFDF5", red: "#991B1B", redLight: "#FEF2F2", amber: "#92400E", amberLight: "#FFFBEB",
};
const card: React.CSSProperties = { background: C.bgCard, border: `0.5px solid ${C.border}`, borderRadius: "12px", padding: "16px 18px" };
const btn = (bg: string, color: string): React.CSSProperties => ({ fontSize: "12px", fontWeight: 600, padding: "6px 12px", background: bg, color, border: `0.5px solid ${C.border}`, borderRadius: "8px", cursor: "pointer" });
const inputStyle: React.CSSProperties = { fontSize: "12px", padding: "6px 8px", border: `0.5px solid ${C.border}`, borderRadius: "8px", fontFamily: "inherit", boxSizing: "border-box", background: C.bgCard };

export default function TaxonomyMigration({ study }: { study: { id: string; study_id: string } }) {
  const [st, setSt] = useState<State | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [reloads, setReloads] = useState(0);
  const [target, setTarget] = useState("");
  const [busy, setBusy] = useState(false);
  const [decisions, setDecisions] = useState<Record<string, string>>({});
  const [password, setPassword] = useState("");
  const [why, setWhy] = useState("");

  useEffect(() => {
    apiFetch<State>(`/studies/${study.id}/taxonomy`).then(setSt).catch((e) => setError((e as Error).message));
  }, [study.id, reloads]);

  if (!st) return <div style={{ fontSize: "12px", color: error ? C.red : C.textMuted }}>{error || "Loading taxonomy version…"}</div>;

  const planned = st.migrations.find((m) => m.status === "planned") ?? null;
  async function run(label: string, fn: () => Promise<unknown>) {
    setBusy(true); setError(""); setNotice("");
    try { await fn(); setNotice(label); setPassword(""); setWhy(""); setDecisions({}); setReloads((n) => n + 1); }
    catch (e) { setError((e as Error).message); }
    setBusy(false);
  }
  const plan = () => run("Migration planned. Review the impact below.", () =>
    apiFetch(`/studies/${study.id}/taxonomy`, { method: "POST", body: JSON.stringify({ to_version_id: target }) }));
  const execute = (m: Migration) => run(`Study ${study.study_id} now uses ${m.to_label}.`, () =>
    apiFetch(`/taxonomy-migrations/${m.id}/execute`, { method: "POST", body: JSON.stringify({ decisions, password }) }));
  const cancel = (m: Migration) => run("Migration cancelled.", () =>
    apiFetch(`/taxonomy-migrations/${m.id}/cancel`, { method: "POST", body: JSON.stringify({ reason: why.trim() }) }));

  const stat = (label: string, n: number, tone?: "warn" | "bad") => (
    <div style={{ padding: "8px 12px", borderRadius: "8px", background: tone === "bad" && n ? C.redLight : tone === "warn" && n ? C.amberLight : C.bg, minWidth: "90px" }}>
      <div style={{ fontSize: "18px", fontWeight: 700, color: tone === "bad" && n ? C.red : tone === "warn" && n ? C.amber : C.text }}>{n}</div>
      <div style={{ fontSize: "11px", color: C.textMuted }}>{label}</div>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <div>
        <h2 style={{ fontSize: "16px", fontWeight: 700, color: C.text }}>Taxonomy version</h2>
        <p style={{ fontSize: "12px", color: C.textMuted, marginTop: "2px" }}>
          Study {study.study_id} uses <strong style={{ color: C.textSec }}>{st.current.label ?? "no pinned version"}</strong>. Moving to a newer version maps each filed
          document to its record type in that version; the documents themselves are not changed.
        </p>
      </div>
      {notice && <div role="status" style={{ fontSize: "12px", padding: "8px 12px", borderRadius: "8px", background: C.greenLight, color: C.green }}>{notice}</div>}
      {error && <div role="alert" style={{ fontSize: "12px", padding: "8px 12px", borderRadius: "8px", background: C.redLight, color: C.red }}>{error}</div>}

      {!planned && (
        <div style={{ ...card, display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
          {st.targets.length === 0 ? (
            <span style={{ fontSize: "12px", color: C.textMuted }}>No newer version with a published mapping is available.</span>
          ) : (
            <>
              <select aria-label="Target version" value={target} onChange={(e) => setTarget(e.target.value)} style={inputStyle}>
                <option value="">Choose a version…</option>
                {st.targets.map((t) => <option key={t.id} value={t.id}>{t.label ?? t.id}</option>)}
              </select>
              <button disabled={!target || busy} onClick={plan} style={btn(C.orange, "#fff")}>Plan migration</button>
            </>
          )}
        </div>
      )}

      {planned && (
        <div style={{ ...card, display: "flex", flexDirection: "column", gap: "10px" }}>
          <div style={{ fontSize: "13px", fontWeight: 600, color: C.text }}>Planned: {planned.from_label} → {planned.to_label}</div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {stat("documents", planned.impact.documents)}
            {stat("map directly", planned.impact.mapped)}
            {stat("need a choice", planned.impact.needs_choice, "warn")}
            {stat("retired types", planned.impact.retired, "warn")}
            {stat("no mapping", planned.impact.unmapped, "bad")}
          </div>
          {planned.impact.unmapped > 0 && (
            <div style={{ fontSize: "12px", color: C.red }}>
              Record types {[...new Set((planned.impact.unmapped_documents ?? []).map((u) => u.artifact_num))].join(", ")} have no mapping to the new version, so the migration can&apos;t run yet.
            </div>
          )}
          {planned.impact.choices.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <div style={{ fontSize: "12px", fontWeight: 600, color: C.textSec }}>These record types were split. Choose the new type for each document:</div>
              {planned.impact.choices.map((c) => (
                <label key={c.document_id} style={{ display: "flex", gap: "8px", alignItems: "center", fontSize: "12px", color: C.textSec }}>
                  <span style={{ minWidth: "160px" }}>{c.artifact_num} · {c.document_id.slice(0, 8)}</span>
                  <select aria-label={`New type for ${c.document_id}`} value={decisions[c.document_id] ?? ""} onChange={(e) => setDecisions({ ...decisions, [c.document_id]: e.target.value })} style={inputStyle}>
                    <option value="">Choose…</option>
                    {c.options.map((o) => <option key={o.artifact_id} value={o.artifact_id}>{o.artifact_num} {o.name}</option>)}
                  </select>
                </label>
              ))}
            </div>
          )}
          <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap", borderTop: `0.5px solid ${C.border}`, paddingTop: "10px" }}>
            <input type="password" aria-label="Password" placeholder="Password to sign" value={password} onChange={(e) => setPassword(e.target.value)} style={inputStyle} />
            <button disabled={busy || !password || planned.impact.unmapped > 0} onClick={() => execute(planned)} style={btn(C.orange, "#fff")}>Sign “Mapping approved” and migrate</button>
            <span style={{ flex: 1 }} />
            <input aria-label="Cancel reason" placeholder="Reason to cancel" value={why} onChange={(e) => setWhy(e.target.value)} style={inputStyle} />
            <button disabled={busy || why.trim().length < 3} onClick={() => cancel(planned)} style={btn(C.bgCard, C.textSec)}>Cancel plan</button>
          </div>
        </div>
      )}

      {st.migrations.filter((m) => m.status !== "planned").length > 0 && (
        <div style={card}>
          <div style={{ fontSize: "13px", fontWeight: 600, color: C.text, marginBottom: "6px" }}>History</div>
          {st.migrations.filter((m) => m.status !== "planned").map((m) => (
            <div key={m.id} style={{ fontSize: "12px", color: C.textSec, padding: "4px 0" }}>
              {m.from_label} → {m.to_label} · {m.status === "executed" ? `migrated ${new Date(m.executed_at!).toLocaleString()} (${m.impact.documents} documents)` : `cancelled: ${m.cancel_reason}`}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
