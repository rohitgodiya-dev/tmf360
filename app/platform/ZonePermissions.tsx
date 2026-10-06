"use client";
// Zone access (Part 14g, USR-05/06): per-zone content levels for a study. With no grants the study is open
// to everyone with study access; the first grant restricts it. Unblinded Contribute needs a second approver.
import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api/client";

type Level = "none" | "read" | "contribute" | "unblinded_contribute";
type Grant = { id: string; user_id: string; email: string | null; zone_num: string; level: Level; status: "pending" | "active"; reason: string; created_by_email: string | null };
type State = { restricted: boolean; grants: Grant[]; users: { user_id: string; email: string; role: string }[] };

const C = {
  text: "#111827", textSec: "#374151", textMuted: "#6B7280", border: "#E5EDF6", bgCard: "#FFFFFF", bg: "#F8FAFC",
  orange: "#F97316", green: "#065F46", greenLight: "#ECFDF5", red: "#991B1B", redLight: "#FEF2F2", amber: "#92400E", amberLight: "#FFFBEB",
};
const card: React.CSSProperties = { background: C.bgCard, border: `0.5px solid ${C.border}`, borderRadius: "12px", padding: "16px 18px" };
const btn = (bg: string, color: string): React.CSSProperties => ({ fontSize: "12px", fontWeight: 600, padding: "6px 12px", background: bg, color, border: `0.5px solid ${C.border}`, borderRadius: "8px", cursor: "pointer" });
const inputStyle: React.CSSProperties = { fontSize: "12px", padding: "6px 8px", border: `0.5px solid ${C.border}`, borderRadius: "8px", fontFamily: "inherit", boxSizing: "border-box", background: C.bgCard };
const LEVELS: [Level, string][] = [["none", "None"], ["read", "Read-only"], ["contribute", "Contribute"], ["unblinded_contribute", "Unblinded Contribute"]];
const label = (l: Level) => LEVELS.find(([k]) => k === l)![1];

export default function ZonePermissions({ study, zones }: { study: { id: string; study_id: string }; zones: { num: string; name: string }[] }) {
  const [st, setSt] = useState<State | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [reloads, setReloads] = useState(0);
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState<{ user_id: string; zone_num: string; level: Level }>({ user_id: "", zone_num: "", level: "read" });
  const [why, setWhy] = useState("");

  useEffect(() => {
    apiFetch<State>(`/studies/${study.id}/zone-permissions`).then(setSt).catch((e) => setError((e as Error).message));
  }, [study.id, reloads]);

  if (!st) return <div style={{ fontSize: "12px", color: error ? C.red : C.textMuted }}>{error || "Loading zone access…"}</div>;
  const canManage = st.users.length > 0;
  const reasonOk = why.trim().length >= 3;

  async function run(msg: string, fn: () => Promise<unknown>) {
    if (!reasonOk) { setError("Give a reason first (at least 3 characters)."); return; }
    setBusy(true); setError(""); setNotice("");
    try { await fn(); setNotice(msg); setWhy(""); setReloads((n) => n + 1); }
    catch (e) { setError((e as Error).message); }
    setBusy(false);
  }
  const zoneName = (n: string) => zones.find((z) => z.num === n)?.name ?? "";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <div>
        <h2 style={{ fontSize: "16px", fontWeight: 700, color: C.text }}>Zone access</h2>
        <p style={{ fontSize: "12px", color: C.textMuted, marginTop: "2px" }}>
          {st.restricted
            ? `Study ${study.study_id} is restricted: people see only the zones they are granted. Blinded documents need Unblinded Contribute.`
            : `Study ${study.study_id} is open: everyone with study access reads and contributes in every zone. Blinded documents stay hidden.`}
        </p>
      </div>
      {notice && <div role="status" style={{ fontSize: "12px", padding: "8px 12px", borderRadius: "8px", background: C.greenLight, color: C.green }}>{notice}</div>}
      {error && <div role="alert" style={{ fontSize: "12px", padding: "8px 12px", borderRadius: "8px", background: C.redLight, color: C.red }}>{error}</div>}

      {canManage && (
        <div style={{ ...card, display: "flex", flexDirection: "column", gap: "8px" }}>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
            <select aria-label="User" value={f.user_id} onChange={(e) => setF({ ...f, user_id: e.target.value })} style={inputStyle}>
              <option value="">User…</option>
              {st.users.map((u) => <option key={u.user_id} value={u.user_id}>{u.email} ({u.role})</option>)}
            </select>
            <select aria-label="Zone" value={f.zone_num} onChange={(e) => setF({ ...f, zone_num: e.target.value })} style={inputStyle}>
              <option value="">Zone…</option>
              {zones.map((z) => <option key={z.num} value={z.num}>{z.num} {z.name}</option>)}
            </select>
            <select aria-label="Level" value={f.level} onChange={(e) => setF({ ...f, level: e.target.value as Level })} style={inputStyle}>
              {LEVELS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
            <input aria-label="Reason" placeholder="Reason (recorded in the audit trail)" value={why} onChange={(e) => setWhy(e.target.value)} style={{ ...inputStyle, flex: 1, minWidth: "200px" }} />
            <button disabled={busy || !f.user_id || !f.zone_num || !reasonOk}
              onClick={() => run(f.level === "unblinded_contribute" ? "Requested. A second access manager must approve it." : "Access granted.",
                () => apiFetch(`/studies/${study.id}/zone-permissions`, { method: "POST", body: JSON.stringify({ ...f, reason: why.trim() }) }))}
              style={btn(C.orange, "#fff")}>Grant</button>
          </div>
          <div style={{ fontSize: "11px", color: C.textMuted }}>
            What happens next: {st.restricted ? "the user's level on that zone is replaced." : "the study becomes restricted, so everyone else without a grant loses access to its documents."}
            {f.level === "unblinded_contribute" && " Unblinded Contribute stays pending until a different access manager approves it."}
          </div>
        </div>
      )}

      <div style={card}>
        {st.grants.length === 0 ? <div style={{ fontSize: "12px", color: C.textMuted }}>No zone grants.</div> : st.grants.map((g) => (
          <div key={g.id} style={{ display: "flex", gap: "8px", alignItems: "center", fontSize: "12px", color: C.textSec, padding: "5px 0", borderBottom: `0.5px solid ${C.border}`, flexWrap: "wrap" }}>
            <span style={{ minWidth: "200px" }}>{g.email ?? g.user_id.slice(0, 8)}</span>
            <span style={{ minWidth: "160px" }}>Zone {g.zone_num} {zoneName(g.zone_num)}</span>
            <span style={{ fontWeight: 600 }}>{label(g.level)}</span>
            {g.status === "pending" && <span style={{ fontSize: "11px", padding: "2px 6px", borderRadius: "6px", background: C.amberLight, color: C.amber }}>Awaiting approval (requested by {g.created_by_email ?? "—"})</span>}
            <span style={{ flex: 1 }} />
            {canManage && g.status === "pending" && (
              <>
                <button disabled={busy || !reasonOk} onClick={() => run("Approved.", () => apiFetch(`/zone-permissions/${g.id}/decide`, { method: "POST", body: JSON.stringify({ approve: true, reason: why.trim() }) }))} style={btn(C.bgCard, C.green)}>Approve</button>
                <button disabled={busy || !reasonOk} onClick={() => run("Rejected.", () => apiFetch(`/zone-permissions/${g.id}/decide`, { method: "POST", body: JSON.stringify({ approve: false, reason: why.trim() }) }))} style={btn(C.bgCard, C.red)}>Reject</button>
              </>
            )}
            {canManage && <button disabled={busy || !reasonOk} onClick={() => run("Access revoked.", () => apiFetch(`/zone-permissions/${g.id}/revoke`, { method: "POST", body: JSON.stringify({ reason: why.trim() }) }))} style={btn(C.bgCard, C.textSec)}>Revoke</button>}
          </div>
        ))}
        {canManage && st.grants.length > 0 && !reasonOk && <div style={{ fontSize: "11px", color: C.textMuted, marginTop: "6px" }}>Enter a reason above to approve, reject or revoke.</div>}
      </div>
    </div>
  );
}
