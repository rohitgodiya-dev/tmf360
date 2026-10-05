"use client";
// AI assistance on one intake item (Part 12a, M17). Everything shown here is a recommendation: it
// says which model produced it, how confident it is and where in the document the evidence is.
// The person applies it, edits it or dismisses it; what is finally filed is recorded against it.
import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../../lib/api/client";

const C = { primary: "#F97316", primaryLight: "#FFEDD5", text: "#111827", textSec: "#374151", textTert: "#6B7280", border: "#E5E7EB", bg: "#FFFFFF", bgSec: "#F9FAFB", danger: "#991B1B", dangerBg: "#FEF2F2", warn: "#92400E", warnBg: "#FFFBEB", ai: "#5B21B6", aiBg: "#F5F3FF" };
const btn = (bg: string, color: string): React.CSSProperties => ({ fontSize: "11px", fontWeight: 600, padding: "5px 10px", background: bg, color, border: "none", borderRadius: "6px", cursor: "pointer" });

export type AiFeature = "classification" | "metadata_extraction" | "pre_qc_checks" | "duplicate_detection";
type Ev = { page?: number | null; quote?: string | null; field?: string; artifact_num?: string; check?: string };
type Rec = { id: string; feature: AiFeature; model_version: string; prompt_version: string; confidence: number | null; status: string; created_at: string;
  output: Record<string, unknown>; evidence: Ev[] };
type Suggestion = { artifact_num: string; artifact_name: string; confidence: number; reason: string };
type Field = { value: string | null; confidence: number };
type Flag = { check: string; severity: "high" | "medium" | "low"; detail: string };
type Match = { document_id: string; title: string; artifact_num: string; similarity: number; identical_file: boolean };

const LABEL: Record<AiFeature, string> = { classification: "Suggest record type", metadata_extraction: "Extract metadata", pre_qc_checks: "Pre-QC check", duplicate_detection: "Check for duplicates" };
const FIELD_LABEL: Record<string, string> = { title: "Title", version_label: "Version", effective_date: "Effective date", expiry_date: "Expiry date", site_number: "Site", investigator: "Investigator", signatures_present: "Signatures present" };
const CHECK_LABEL: Record<string, string> = { unsigned: "Unsigned", missing_dates: "Missing dates", blank_pages: "Blank pages", missing_pages: "Missing pages", illegible_scan: "Illegible scan", multiple_documents: "Several documents in one file", type_mismatch: "Type/content mismatch" };

export default function AiAssist({ base, itemId, enabled, isPdf, disabled, refreshKey, onUseArtifact, onUseFields }: {
  base: string; itemId: string; enabled: AiFeature[]; isPdf: boolean; disabled: boolean; refreshKey: number;
  onUseArtifact: (artifactNum: string) => void; onUseFields: (fields: Record<string, string>) => void;
}) {
  const [recs, setRecs] = useState<Rec[]>([]);
  const [busy, setBusy] = useState<AiFeature | "">("");
  const [error, setError] = useState("");

  const load = useCallback(() => {
    apiFetch<{ data: Rec[] }>(`${base}/${itemId}/ai`).then((r) => setRecs(r.data)).catch(() => { /* optional */ });
  }, [base, itemId]);
  useEffect(() => { load(); }, [load, refreshKey]);

  async function run(feature: AiFeature) {
    setBusy(feature); setError("");
    try { await apiFetch(`${base}/${itemId}/ai`, { method: "POST", body: JSON.stringify({ feature }) }); load(); }
    catch (e) { setError((e as Error).message); }
    setBusy("");
  }
  async function dismiss(r: Rec) {
    try { await apiFetch(`/ai-recommendations/${r.id}/decision`, { method: "POST", body: JSON.stringify({ decision: "rejected", note: "Dismissed in Document Intake" }) }); load(); }
    catch (e) { setError((e as Error).message); }
  }

  if (!isPdf || enabled.length === 0) return null;
  const latest = (f: AiFeature) => recs.find((r) => r.feature === f && r.status !== "rejected");
  const page = (e: Ev) => (e.page ? `p. ${e.page}` : "");

  return (
    <div style={{ marginTop: "10px", border: `0.5px solid #DDD6FE`, background: C.aiBg, borderRadius: "8px", padding: "8px 10px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
        <span style={{ fontSize: "11px", fontWeight: 700, color: C.ai }}><i className="ti ti-sparkles" /> AI assistance</span>
        <span style={{ fontSize: "10px", color: C.textTert }}>suggestions only: you decide what is filed</span>
        <span style={{ flex: 1 }} />
        {enabled.map((f) => (
          <button key={f} disabled={disabled || !!busy} onClick={() => run(f)} style={{ ...btn(C.bg, C.ai), border: "0.5px solid #DDD6FE", opacity: disabled || busy ? 0.6 : 1 }}>
            {busy === f ? "Working…" : LABEL[f]}
          </button>
        ))}
      </div>
      {error && <div role="alert" style={{ fontSize: "11px", color: C.danger, marginTop: "6px" }}>{error}</div>}

      {(() => {
        const r = latest("classification");
        if (!r) return null;
        const sugg = (r.output.suggestions as Suggestion[]) ?? [];
        return (
          <Block r={r} title="Record type" onDismiss={() => dismiss(r)} disabled={disabled}>
            {sugg.map((s, i) => (
              <div key={s.artifact_num} style={{ display: "flex", gap: "8px", alignItems: "flex-start", marginTop: "4px" }}>
                <div style={{ flex: 1, fontSize: "11px", color: C.textSec }}>
                  <strong>{i + 1}. {s.artifact_num} {s.artifact_name}</strong> <span style={{ color: C.ai }}>{s.confidence}%</span>
                  <div style={{ color: C.textTert }}>{s.reason}</div>
                  {r.evidence.filter((e) => e.artifact_num === s.artifact_num).slice(0, 2).map((e, j) => <div key={j} style={{ color: C.textTert, fontStyle: "italic" }}>{page(e)} &ldquo;{e.quote}&rdquo;</div>)}
                </div>
                <button disabled={disabled} onClick={() => onUseArtifact(s.artifact_num)} style={btn(C.primaryLight, C.primary)}>Use</button>
              </div>
            ))}
          </Block>
        );
      })()}

      {(() => {
        const r = latest("metadata_extraction");
        if (!r) return null;
        const fields = (r.output.fields as Record<string, Field>) ?? {};
        const usable = Object.fromEntries(Object.entries(fields).filter(([k, f]) => f.value && ["title", "version_label", "effective_date", "site_number"].includes(k)).map(([k, f]) => [k, f.value!]));
        return (
          <Block r={r} title="Metadata" onDismiss={() => dismiss(r)} disabled={disabled}
            action={Object.keys(usable).length ? <button disabled={disabled} onClick={() => onUseFields(usable)} style={btn(C.primaryLight, C.primary)}>Fill the form</button> : null}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "2px 12px", marginTop: "4px" }}>
              {Object.entries(fields).map(([k, f]) => {
                const ev = r.evidence.find((e) => e.field === k);
                return (
                  <div key={k} style={{ fontSize: "11px", color: C.textSec }}>
                    {FIELD_LABEL[k] ?? k}: <strong>{f.value ?? <span style={{ color: C.textTert, fontWeight: 400 }}>not found</span>}</strong>
                    {f.value && <span style={{ color: C.ai }}> {f.confidence}%</span>}
                    {ev && <span style={{ color: C.textTert }} title={ev.quote ?? ""}> · {page(ev)}</span>}
                  </div>
                );
              })}
            </div>
          </Block>
        );
      })()}

      {(() => {
        const r = latest("pre_qc_checks");
        if (!r) return null;
        const flags = (r.output.flags as Flag[]) ?? [];
        return (
          <Block r={r} title={`Pre-QC check: ${flags.length ? `${flags.length} flag${flags.length > 1 ? "s" : ""}` : "nothing flagged"}`} onDismiss={() => dismiss(r)} disabled={disabled}>
            {flags.map((f, i) => {
              const pages = r.evidence.filter((e) => e.check === f.check && e.page).map((e) => e.page);
              return (
                <div key={i} style={{ fontSize: "11px", marginTop: "3px", color: f.severity === "high" ? C.danger : f.severity === "medium" ? C.warn : C.textSec }}>
                  <strong>{CHECK_LABEL[f.check] ?? f.check}</strong> ({f.severity}){pages.length ? ` · pages ${pages.join(", ")}` : ""}: {f.detail}
                </div>
              );
            })}
          </Block>
        );
      })()}

      {(() => {
        const r = latest("duplicate_detection");
        if (!r) return null;
        const matches = (r.output.matches as Match[]) ?? [];
        return (
          <Block r={r} title={matches.length ? `Possible duplicates: ${matches.length}` : `No near-duplicates among ${r.output.compared as number} Final document(s)`} onDismiss={() => dismiss(r)} disabled={disabled}>
            {matches.map((m) => (
              <div key={m.document_id} style={{ fontSize: "11px", color: C.warn, marginTop: "3px" }}>
                {m.title} ({m.artifact_num}): {Math.round(m.similarity * 100)}% similar text{m.identical_file ? ", identical file" : ""}
              </div>
            ))}
          </Block>
        );
      })()}
    </div>
  );
}

function Block({ r, title, children, action, onDismiss, disabled }: { r: Rec; title: string; children: React.ReactNode; action?: React.ReactNode; onDismiss: () => void; disabled: boolean }) {
  return (
    <div style={{ marginTop: "8px", background: C.bg, borderRadius: "6px", padding: "6px 8px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        <span style={{ fontSize: "11px", fontWeight: 700, color: C.text, flex: 1 }}>{title}</span>
        {action}
        {r.status === "pending" && <button disabled={disabled} onClick={onDismiss} style={btn(C.bgSec, C.textSec)}>Dismiss</button>}
      </div>
      {children}
      <div style={{ fontSize: "9.5px", color: C.textTert, marginTop: "4px" }}>{r.model_version} · {r.prompt_version} · {new Date(r.created_at).toLocaleString()}{r.status !== "pending" ? ` · ${r.status}` : ""}</div>
    </div>
  );
}
