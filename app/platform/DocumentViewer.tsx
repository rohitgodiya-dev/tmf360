"use client";
// Document viewer (Part 6, M07): renders PDFs in the page with pdf.js (thumbnails, zoom, rotate)
// and images directly. The file is fetched once through a short-lived link; downloads and prints
// are logged on the server (VWR-02). Nothing is sent to third-party viewers.
import { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { apiFetch } from "../../lib/api/client";

type Meta = { id: string; status: string; artifact_num: string; artifact_name: string; custom_file_name: string | null; file_name: string | null; file_type: string | null; version: string | null; has_file: boolean };
type Kind = "pdf" | "image" | "other";

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

export default function DocumentViewer({ documentId, canDownload, onClose }: { documentId: string; canDownload: boolean; onClose: () => void }) {
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

  const name = meta ? (meta.custom_file_name || meta.file_name || meta.artifact_name) : "";

  useEffect(() => {
    let cancelled = false;
    let doc: PDFDocumentProxy | null = null;
    let objectUrl: string | null = null;
    (async () => {
      try {
        const m = await apiFetch<Meta>(`/documents/${documentId}`);
        if (cancelled) return;
        setMeta(m);
        if (!m.has_file) return;
        const k = kindOf(m.file_name ?? "", m.file_type);
        setKind(k);
        if (k === "other") return;
        const { url } = await apiFetch<{ url: string }>(`/documents/${documentId}/access`, { method: "POST", body: JSON.stringify({ purpose: "view" }) });
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

  // Keyboard: Esc closes, arrows change page.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (!pdf || (e.target as HTMLElement)?.tagName === "INPUT") return;
      if (e.key === "ArrowRight" || e.key === "PageDown") setPage((p) => Math.min(pdf.numPages, p + 1));
      if (e.key === "ArrowLeft" || e.key === "PageUp") setPage((p) => Math.max(1, p - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pdf, onClose]);

  async function download() {
    setBusy("Preparing download…"); setError("");
    try {
      const r = await apiFetch<{ url: string }>(`/documents/${documentId}/access`, { method: "POST", body: JSON.stringify({ purpose: "download" }) });
      window.location.href = r.url;
    } catch (e) { setError((e as Error).message); }
    setBusy("");
  }

  async function print() {
    if (!bytes) return;
    setBusy("Preparing to print…"); setError("");
    try {
      // Logs the print on the server first; the bytes already loaded are what gets printed.
      await apiFetch(`/documents/${documentId}/access`, { method: "POST", body: JSON.stringify({ purpose: "print" }) });
      const url = URL.createObjectURL(bytes);
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
    <div role="dialog" aria-modal="true" aria-label={`Viewer: ${name}`}
      style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(17,24,39,.6)", display: "flex", alignItems: "stretch", justifyContent: "center", padding: "16px" }}>
      <div style={{ flex: 1, maxWidth: "1300px", background: C.bgSec, borderRadius: "12px", display: "flex", flexDirection: "column", overflow: "hidden" }}>
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
          <button aria-label="Close viewer" onClick={onClose} style={{ ...tool, background: C.dark, color: "#fff", border: "none" }}><i className="ti ti-x" /> Close</button>
        </div>
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
            {pdf && <PdfPage pdf={pdf} n={page} scale={zoom * 1.3} rotation={rotation} />}
            {imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageUrl} alt={name} style={{ maxWidth: zoom === 1 ? "100%" : "none", width: zoom === 1 ? undefined : `${zoom * 100}%`, transform: `rotate(${rotation}deg)`, transition: "transform .15s", background: "#fff", boxShadow: "0 1px 6px rgba(0,0,0,.25)" }} />
            )}
          </div>
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
