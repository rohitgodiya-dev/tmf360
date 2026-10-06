"use client";
// Study banners (Part 18), shown above every panel: read-only when the study is closed or archived, and
// "Inspection in progress" while an inspection session is open, so the whole study team knows.
import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api/client";

type Banner = { lifecycle_status: string; read_only: boolean; closed_at: string | null; archived_at: string | null; inspection: { inspector_org: string; starts_at: string; ends_at: string } | null };

const C = { amberDark: "#92400E", amberLight: "#FEF3C7", amberBorder: "#FCD34D", grayDark: "#374151", grayLight: "#F3F4F6", border: "#E5E7EB" };
const bar: React.CSSProperties = { display: "flex", alignItems: "center", gap: "8px", padding: "8px 14px", fontSize: "12px", borderBottom: "0.5px solid" };

export default function StudyBanner({ studyId, refreshKey }: { studyId: string; refreshKey?: number }) {
  const [b, setB] = useState<Banner | null>(null);
  useEffect(() => {
    let cancelled = false;
    const load = () => apiFetch<Banner | null>(`/studies/${studyId}/banner`).then((r) => { if (!cancelled) setB(r); }).catch(() => undefined);
    void load();
    const t = setInterval(load, 60000); // an inspection can start while the page is open
    return () => { cancelled = true; clearInterval(t); };
  }, [studyId, refreshKey]);
  if (!b) return null;
  return (
    <>
      {b.inspection && (
        <div role="status" style={{ ...bar, background: C.amberLight, color: C.amberDark, borderColor: C.amberBorder }}>
          <i className="ti ti-user-shield" /> <b>Inspection in progress</b> — {b.inspection.inspector_org}, until {new Date(b.inspection.ends_at).toLocaleString()}. Inspectors see Final documents in scope; everything they open is logged.
        </div>
      )}
      {b.read_only && (
        <div role="status" style={{ ...bar, background: C.grayLight, color: C.grayDark, borderColor: C.border }}>
          <i className="ti ti-lock" /> <b>{b.lifecycle_status === "Archived" ? "Archived study" : "Closed study"}</b> — read-only{b.lifecycle_status === "Archived" ? " for good" : ""}. Nothing can be filed, changed or deleted{b.lifecycle_status === "Archived" ? "." : " unless an administrator reopens it with a signature."}
        </div>
      )}
    </>
  );
}
