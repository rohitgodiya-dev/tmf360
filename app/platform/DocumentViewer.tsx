"use client";
// Document viewer (Part 6, M07): renders PDFs in the page with pdf.js (thumbnails, zoom, rotate)
// and images directly. The file is fetched once through a short-lived link; downloads and prints
// are logged on the server (VWR-02). Nothing is sent to third-party viewers.
import { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { apiFetch } from "../../lib/api/client";
import { useUnsavedChanges } from "../../lib/unsaved";
import DocumentSidePanel, { type Annotation } from "./DocumentSidePanel";

export type Meta = { id: string; status: string; artifact_num: string; artifact_name: string; custom_file_name: string | null; file_name: string | null; file_type: string | null; version: string | null; has_file: boolean; signpost?: boolean; signpost_reference?: string | null; certified_copy?: boolean; blinded?: boolean };
type Kind = "pdf" | "image" | "other";

/** Where the viewer gets its metadata and file links. Defaults to the signed-in user's /documents API;
 *  Inspection Mode passes its own (session-checked) endpoints. */
export type ViewerSource = {
  meta: () => Promise<Meta>;
  access: (purpose: "view" | "download" | "print") => Promise<{ url: string }>;
};
const defaultSource = (documentId: string): ViewerSource => ({
  meta: () => apiFetch<Meta>(`/documents/${documentId}`),
  access: (purpose) => apiFetch<{ url: string }>(`/documents/${documentId}/access`, { method: "POST", body: JSON.stringify({ purpose }) }),
});

const C = { primary: "#F97316", text: "#111827", textSec: "#374151", textTert: "#6B7280", border: "#E5E7EB", bg: "#FFFFFF", bgSec: "#F9FAFB", dark: "#374151", danger: "#991B1B" };
const tool: React.CSSProperties = { fontSize: "12px", padding: "5px 9px", background: C.bg, color: C.textSec, border: `0.5px solid ${C.border}`, borderRadius: "6px", cursor: "pointer" };
const ZOOMS = [0.5, 0.75, 1, 1.25, 1.5, 2, 3];

function kindOf(name: string, type: string | null): Kind {
  if (/pdf/i.test(type ?? "") || /\.pdf$/i.test(name)) return "pdf";
  if (/^image\/(png|jpe?g|gif|webp)/i.test(type ?? "") || /\.(png|jpe?g|gif|webp)$/i.test(name)) return "image";
  return "other";
}

async function loadPdfjs() {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
  return pdfjs;
}

function PdfPage({ pdf, n, scale, rotation, onClick, active }: { pdf: PDFDocumentProxy; n: number; scale: number; rotation: number; onClick?: () => void; active?: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let task: { cancel: () => void; promise: Promise<void> } | null = null;
    let cancelled = false;
    pdf.getPage(n).then((page) => {
      if (cancelled || !canvas.current) return;
      const ratio = window.devicePixelRatio || 1;
      const viewport = page.getViewport({ scale: scale * ratio, rotation: (page.rotate + rotation) % 360 });
      const c = canvas.current;
      c.width = viewport.width; c.height = viewport.height;
      c.style.width = `${viewport.width / ratio}px`; c.style.height = `${viewport.height / ratio}px`;
      task = page.render({ canvas: c, viewport });
      task.promise.catch(() => { /* cancelled */ });
    });
    return () => { cancelled = true; task?.cancel(); };
  }, [pdf, n, scale, rotation]);
  return <canvas ref={canvas} onClick={onClick} aria-label={`Page ${n}`}
    style={{ display: "block", background: "#fff", boxShadow: "0 1px 6px rgba(0,0,0,.25)", cursor: onClick ? "pointer" : "default", outline: active ? `2px solid ${C.primary}` : "none", outlineOffset: "2px" }} />;
}

/** `inline` renders inside its parent (the QC task screen) instead of as a full-screen dialog. */
export default function DocumentViewer({ documentId, canDownload, onClose, inline = false, source, onPageTime }: {
  documentId: string; canDownload: boolean; onClose: () => void; inline?: boolean;
  source?: ViewerSource;
  /** Called with how long (whole seconds) a page was on screen when the reader moves on (INS-08). */
  onPageTime?: (page: number, seconds: number) => void;
}) {
  const src = useRef<ViewerSource>(source ?? defaultSource(documentId));
  const pageTime = useRef(onPageTime);
  useEffect(() => { pageTime.current = onPageTime; }, [onPageTime]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [kind, setKind] = useState<Kind | null>(null);
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [bytes, setBytes] = useState<Blob | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  // AI summary (Part 12a, AI-05): only in the team's own viewer, never in Inspection Mode.
  const [summaryOn, setSummaryOn] = useState(false);
  const [summary, setSummary] = useState<{ summary: string; key_points: { point: string; page: number | null }[]; model: string } | null>(null);
  useEffect(() => {
    if (source) return;
    apiFetch<{ features: { feature: string; enabled: boolean }[] }>("/ai-settings")
      .then((r) => setSummaryOn(r.features.some((f) => f.feature === "summary" && f.enabled))).catch(() => { /* off */ });
  }, [source]);
  // Reviewer notes and type-specific fields (Part 22): only in the team viewer, never in Inspection Mode.
  const [side, setSide] = useState<"notes" | "fields" | null>(null);
  const [notes, setNotes] = useState<Annotation[]>([]);
  const [addMode, setAddMode] = useState(false);
  const [pin, setPin] = useState<{ page: number; x: number; y: number } | null>(null);
  const [sideDirty, setSideDirty] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  useUnsavedChanges(`viewer-${documentId}`, sideDirty || !!pin);
  const requestClose = () => { if (sideDirty || pin) setConfirmClose(true); else onClose(); };
  const placePin = (e: React.MouseEvent<HTMLDivElement>, n: number) => {
    if (!addMode) return;
    const r = e.currentTarget.getBoundingClientRect();
    setPin({ page: n, x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)) });
    setAddMode(false);
  };
  const openNotes = notes.filter((a) => a.status === "open");
  const pins = (n: number) => rotation !== 0 ? null : (
    <>
      {openNotes.filter((a) => a.page === n).map((a) => (
        <span key={a.id} title={a.body} aria-label={`Note ${openNotes.indexOf(a) + 1}: ${a.body}`} style={{ position: "absolute", left: `${a.x * 100}%`, top: `${a.y * 100}%`, transform: "translate(-50%, -100%)",
          background: C.primary, color: "#fff", borderRadius: "10px 10px 10px 0", fontSize: "10px", fontWeight: 700, padding: "2px 6px", boxShadow: "0 1px 3px rgba(0,0,0,.3)" }}>
          {openNotes.indexOf(a) + 1}
        </span>
      ))}
      {pin && pin.page === n && <span aria-label="New note position" style={{ position: "absolute", left: `${pin.x * 100}%`, top: `${pin.y * 100}%`, transform: "translate(-50%, -100%)",
        background: "#1D4ED8", color: "#fff", borderRadius: "10px 10px 10px 0", fontSize: "10px", fontWeight: 700, padding: "2px 6px" }}>new</span>}
    </>
  );
  async function summarise() {
    setBusy("Summarising…"); setError("");
    try {
      const r = await apiFetch<{ output: { summary: string; key_points: { point: string; page: number | null }[] }; model_version: string }>(`/documents/${documentId}/summary`, { method: "POST" });
      setSummary({ ...r.output, model: r.model_version });
    } catch (e) { setError((e as Error).message); }
    setBusy("");
  }

  const name = meta ? (meta.custom_file_name || meta.file_name || meta.artifact_name) : "";

  useEffect(() => {
    let cancelled = false;
    let doc: PDFDocumentProxy | null = null;
    let objectUrl: string | null = null;
    (async () => {
      try {
        const m = await src.current.meta();
        if (cancelled) return;
        setMeta(m);
        if (!m.has_file) return;
        const k = kindOf(m.file_name ?? "", m.file_type);
        setKind(k);
        if (k === "other") return;
        const { url } = await src.current.access("view");
        const res = await fetch(url);
        if (!res.ok) throw new Error("The file could not be loaded");
        const blob = await res.blob();
        if (cancelled) return;
        setBytes(blob);
        if (k === "image") { objectUrl = URL.createObjectURL(blob); setImageUrl(objectUrl); return; }
        const pdfjs = await loadPdfjs();
        doc = await pdfjs.getDocument({ data: new Uint8Array(await blob.arrayBuffer()) }).promise;
        if (cancelled) { doc.destroy(); return; }
        setPdf(doc);
      } catch (e) { if (!cancelled) setError((e as Error).message); }
    })();
    return () => { cancelled = true; doc?.destroy(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [documentId]);

  // Page view time: report the previous page when the page changes or the viewer closes.
  useEffect(() => {
    if (!pdf && !imageUrl) return;
    const started = Date.now();
    return () => {
      const seconds = Math.round((Date.now() - started) / 1000);
      if (seconds >= 1) pageTime.current?.(page, seconds);
    };
  }, [page, pdf, imageUrl]);

  // Keyboard: Esc closes, arrows change page.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !inline) requestClose();
      const tag = (e.target as HTMLElement)?.tagName;
      if (!pdf || tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "ArrowRight" || e.key === "PageDown") setPage((p) => Math.min(pdf.numPages, p + 1));
      if (e.key === "ArrowLeft" || e.key === "PageUp") setPage((p) => Math.max(1, p - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdf, onClose, inline, sideDirty, pin]);

  async function download() {
    setBusy("Preparing download…"); setError("");
    try {
      const r = await src.current.access("download");
      window.location.href = r.url;
    } catch (e) { setError((e as Error).message); }
    setBusy("");
  }

  async function print() {
    if (!bytes) return;
    setBusy("Preparing to print…"); setError("");
    try {
      // Logs the print on the server first; the bytes already loaded are what gets printed.
      // A source may hand back different bytes for printing (Inspection Mode: a watermarked copy).
      const r = await src.current.access("print");
      const printBytes = source ? await (await fetch(r.url)).blob() : bytes;
      const url = URL.createObjectURL(printBytes);
      const frame = document.createElement("iframe");
      frame.style.position = "fixed"; frame.style.width = "0"; frame.style.height = "0"; frame.style.border = "0";
      frame.src = url;
      frame.onload = () => {
        frame.contentWindow?.focus();
        frame.contentWindow?.print();
        setTimeout(() => { frame.remove(); URL.revokeObjectURL(url); }, 60000);
      };
      document.body.appendChild(frame);
    } catch (e) { setError((e as Error).message); }
    setBusy("");
  }

  const zoomStep = (dir: 1 | -1) => setZoom((z) => {
    const i = ZOOMS.findIndex((x) => x >= z - 0.001);
    return ZOOMS[Math.max(0, Math.min(ZOOMS.length - 1, (i === -1 ? ZOOMS.length - 1 : i) + dir))];
  });
  const viewable = kind === "pdf" || kind === "image";

  return (
    <div role={inline ? "region" : "dialog"} aria-modal={inline ? undefined : true} aria-label={`Viewer: ${name}`}
      style={inline
        ? { height: "100%", display: "flex", minHeight: 0 }
        : { position: "fixed", inset: 0, zIndex: 1000, background: "rgba(17,24,39,.6)", display: "flex", alignItems: "stretch", justifyContent: "center", padding: "16px" }}>
      <div style={{ flex: 1, maxWidth: inline ? undefined : "1300px", minWidth: 0, background: C.bgSec, borderRadius: "12px", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Header + toolbar */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", padding: "10px 14px", background: C.bg, borderBottom: `0.5px solid ${C.border}` }}>
          <div style={{ flex: "1 1 240px", minWidth: 0 }}>
            <div style={{ fontSize: "13px", fontWeight: 700, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name || "Loading…"}</div>
            {meta && <div style={{ fontSize: "10px", color: C.textTert, fontFamily: "monospace" }}>{meta.artifact_num} · {meta.artifact_name} · {meta.status}{meta.version ? ` · v${meta.version}` : ""}</div>}
          </div>
          {pdf && (
            <>
              <button aria-label="Previous page" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} style={tool}><i className="ti ti-chevron-left" /></button>
              <span style={{ fontSize: "12px", color: C.textSec, display: "flex", alignItems: "center", gap: "4px" }}>
                <input aria-label="Page number" value={page} onChange={(e) => { const n = parseInt(e.target.value, 10); if (n >= 1 && n <= pdf.numPages) setPage(n); }}
                  style={{ width: "38px", fontSize: "12px", padding: "4px", textAlign: "center", border: `0.5px solid ${C.border}`, borderRadius: "5px" }} /> / {pdf.numPages}
              </span>
              <button aria-label="Next page" disabled={page >= pdf.numPages} onClick={() => setPage((p) => p + 1)} style={tool}><i className="ti ti-chevron-right" /></button>
            </>
          )}
          {viewable && (
            <>
              <button aria-label="Zoom out" onClick={() => zoomStep(-1)} style={tool}><i className="ti ti-zoom-out" /></button>
              <span style={{ fontSize: "12px", color: C.textSec, minWidth: "40px", textAlign: "center" }}>{Math.round(zoom * 100)}%</span>
              <button aria-label="Zoom in" onClick={() => zoomStep(1)} style={tool}><i className="ti ti-zoom-in" /></button>
              <button aria-label="Rotate" onClick={() => setRotation((r) => (r + 90) % 360)} style={tool}><i className="ti ti-rotate-clockwise" /></button>
            </>
          )}
          {meta?.has_file && canDownload && <button disabled={!!busy} onClick={download} style={tool}><i className="ti ti-download" /> Download</button>}
          {meta?.has_file && canDownload && viewable && <button disabled={!!busy || !bytes} onClick={print} style={tool}><i className="ti ti-printer" /> Print</button>}
          {summaryOn && meta?.has_file && kind === "pdf" && <button disabled={!!busy} onClick={() => (summary ? setSummary(null) : summarise())} style={tool}><i className="ti ti-sparkles" /> {summary ? "Hide summary" : "AI summary"}</button>}
          {!source && meta && <button onClick={() => setSide(side === "notes" ? null : "notes")} style={{ ...tool, ...(side === "notes" ? { background: "#FFF7ED", color: C.primary } : {}) }}><i className="ti ti-message-2" /> Notes{openNotes.length ? ` (${openNotes.length})` : ""}</button>}
          {!source && meta && <button onClick={() => setSide(side === "fields" ? null : "fields")} style={{ ...tool, ...(side === "fields" ? { background: "#FFF7ED", color: C.primary } : {}) }}><i className="ti ti-forms" /> Fields</button>}
          {!inline && <button aria-label="Close viewer" onClick={requestClose} style={{ ...tool, background: C.dark, color: "#fff", border: "none" }}><i className="ti ti-x" /> Close</button>}
        </div>
        {meta?.signpost && (
          <div style={{ fontSize: "12px", padding: "8px 14px", background: "#EFF6FF", color: "#1E3A8A", borderBottom: `0.5px solid ${C.border}` }}>
            <i className="ti ti-signpost" /> <b>Signpost:</b> the original is held elsewhere: {meta.signpost_reference}
          </div>
        )}
        {meta?.blinded && (
          <div style={{ fontSize: "12px", padding: "6px 14px", background: "#FEF3C7", color: "#92400E", borderBottom: `0.5px solid ${C.border}` }}>
            <i className="ti ti-eye-off" /> Blinded document: visible only to users with Unblinded Contribute on this zone
          </div>
        )}
        {meta?.certified_copy && (
          <div style={{ fontSize: "12px", padding: "6px 14px", background: "#ECFDF5", color: "#065F46", borderBottom: `0.5px solid ${C.border}` }}>
            <i className="ti ti-certificate" /> Certified copy (see version history for the certification)
          </div>
        )}
        {summary && (
          <div style={{ fontSize: "12px", padding: "8px 14px", background: "#F5F3FF", color: C.text, borderBottom: `0.5px solid ${C.border}` }}>
            <div>{summary.summary}</div>
            <ul style={{ margin: "4px 0 0", paddingLeft: "18px" }}>{summary.key_points.map((k, i) => <li key={i}>{k.point}{k.page ? ` (p. ${k.page})` : ""}</li>)}</ul>
            <div style={{ fontSize: "10px", color: C.textTert, marginTop: "4px" }}>AI-generated summary ({summary.model}); check it against the document.</div>
          </div>
        )}
        {confirmClose && (
          <div role="alert" style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", padding: "8px 14px", background: "#FEF2F2", color: C.danger, borderBottom: `0.5px solid ${C.border}` }}>
            <span style={{ flex: 1 }}>You have an unsaved note or field change. Close anyway?</span>
            <button onClick={() => setConfirmClose(false)} style={tool}>Keep editing</button>
            <button onClick={() => { setConfirmClose(false); setPin(null); setSideDirty(false); onClose(); }} style={{ ...tool, background: C.danger, color: "#fff", border: "none" }}>Discard and close</button>
          </div>
        )}
        {addMode && <div style={{ fontSize: "12px", padding: "6px 14px", background: "#EFF6FF", color: "#1E3A8A" }}><i className="ti ti-pin" /> Click on the page where the note belongs{rotation !== 0 ? " (reset the rotation first)" : ""}.</div>}
        {(error || busy) && <div style={{ fontSize: "12px", padding: "6px 14px", background: error ? "#FEF2F2" : C.bg, color: error ? C.danger : C.textSec }}>{error || busy}</div>}

        <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
          {/* Thumbnails */}
          {pdf && pdf.numPages > 1 && (
            <div style={{ width: "120px", flexShrink: 0, overflowY: "auto", padding: "12px 10px", display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", background: "#E5E7EB" }}>
              {Array.from({ length: Math.min(pdf.numPages, 300) }, (_, i) => (
                <div key={i} style={{ textAlign: "center" }}>
                  <PdfPage pdf={pdf} n={i + 1} scale={0.15} rotation={rotation} active={page === i + 1} onClick={() => setPage(i + 1)} />
                  <div style={{ fontSize: "10px", color: C.textSec, marginTop: "3px" }}>{i + 1}</div>
                </div>
              ))}
            </div>
          )}
          <div style={{ flex: 1, overflow: "auto", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "20px", background: "#D1D5DB" }}>
            {!meta && !error && <Placeholder icon="ti-loader-2" title="Loading document…" />}
            {meta && !meta.has_file && <Placeholder icon="ti-file-off" title="No file in the TMF" text="This record has metadata but no file attached. Add the file through Document Intake." />}
            {meta?.has_file && kind === "other" && (
              <Placeholder icon="ti-file-unknown" title="Preview isn't available for this file type"
                text={canDownload ? "Download the file to open it in its own application. The download is recorded in the audit trail." : "Your role can't download files. Ask a TMF Lead for a copy."} />
            )}
            {meta?.has_file && viewable && !pdf && !imageUrl && !error && <Placeholder icon="ti-loader-2" title="Loading file…" />}
            {pdf && (
              <div data-testid="page-surface" onClick={(e) => rotation === 0 && placePin(e, page)} style={{ position: "relative", display: "inline-block", cursor: addMode && rotation === 0 ? "crosshair" : "default" }}>
                <PdfPage pdf={pdf} n={page} scale={zoom * 1.3} rotation={rotation} />
                <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>{pins(page)}</div>
              </div>
            )}
            {imageUrl && (
              <div data-testid="page-surface" onClick={(e) => rotation === 0 && placePin(e, 1)} style={{ position: "relative", display: "inline-block", maxWidth: zoom === 1 ? "100%" : "none", width: zoom === 1 ? undefined : `${zoom * 100}%`, cursor: addMode && rotation === 0 ? "crosshair" : "default" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageUrl} alt={name} style={{ display: "block", width: "100%", transform: `rotate(${rotation}deg)`, transition: "transform .15s", background: "#fff", boxShadow: "0 1px 6px rgba(0,0,0,.25)" }} />
                <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>{pins(1)}</div>
              </div>
            )}
          </div>
          {!source && side && meta && (
            <DocumentSidePanel documentId={documentId} tab={side} onTab={setSide} page={pdf ? page : 1} canPin={!!(pdf || imageUrl)}
              notes={notes} onNotes={setNotes} addMode={addMode} onAddMode={setAddMode} pin={pin} onPin={setPin}
              onDirty={setSideDirty} onGoTo={(n) => setPage(n)} />
          )}
        </div>
      </div>
    </div>
  );
}

function Placeholder({ icon, title, text }: { icon: string; title: string; text?: string }) {
  return (
    <div style={{ margin: "auto", textAlign: "center", maxWidth: "380px", background: C.bg, borderRadius: "12px", padding: "28px 24px" }}>
      <i className={`ti ${icon}`} style={{ fontSize: "34px", color: C.textTert }} />
      <div style={{ fontSize: "14px", fontWeight: 600, color: C.text, marginTop: "8px" }}>{title}</div>
      {text && <div style={{ fontSize: "12px", color: C.textTert, marginTop: "4px" }}>{text}</div>}
    </div>
  );
}
