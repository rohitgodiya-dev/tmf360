// Study lifecycle (Part 18): Planning → Startup → Active → Closeout → Closed → Archived. The database enforces
// the steps (transition_study); this module describes them for the UI and gathers the close-out checks.
import { dbError, type StudyRef } from "./db";
import type { RequestContext } from "./auth";
import { studyHierarchy } from "./hierarchy";

export const LIFECYCLE = ["Planning", "Startup", "Active", "Closeout", "Closed", "Archived"] as const;
export type LifecycleStatus = (typeof LIFECYCLE)[number];

/** Allowed steps; must match lifecycle_allowed() in migration 20261109000001. */
export const TRANSITIONS: Record<LifecycleStatus, LifecycleStatus[]> = {
  Planning: ["Startup"], Startup: ["Active", "Planning"], Active: ["Closeout"], Closeout: ["Closed", "Active"], Closed: ["Archived"], Archived: [],
};
/** Steps that need an electronic signature, and the meaning that is signed. */
export const SIGNED: Partial<Record<LifecycleStatus, { purpose: "study_closeout" | "study_archive"; meaning: string }>> = {
  Closed: { purpose: "study_closeout", meaning: "Study TMF closed" },
  Archived: { purpose: "study_archive", meaning: "Study TMF archived" },
};
export const WHAT_HAPPENS: Record<LifecycleStatus, string> = {
  Planning: "The study goes back to planning. Nothing else changes.",
  Startup: "The study is in start-up: countries and sites are being selected and activated.",
  Active: "The study is active. Documents are filed and reviewed as usual.",
  Closeout: "Close-out starts. Filing continues so the TMF can be completed; review the completeness and open tasks below.",
  Closed: "You sign the close-out. Open QC tasks are cancelled with your reason and the whole study becomes read-only. Retention starts if it runs from close-out. A study administrator can reopen it with a signature.",
  Archived: "You sign the archive. The study stays read-only for good and can never be reopened. It remains available for inspection and retention.",
};
export const CLOSEOUT_TARGET = 90;

export async function closeoutChecks(ctx: RequestContext, study: StudyRef) {
  const [h, tasks, findings, holds] = await Promise.all([
    studyHierarchy(ctx.db, study),
    ctx.db.from("document_tasks").select("id", { count: "exact", head: true }).eq("study_id", study.id).eq("status", "open"),
    ctx.db.from("findings").select("priority").eq("study_id", study.id).eq("status", "open"),
    ctx.db.from("legal_holds").select("id", { count: "exact", head: true }).eq("study_id", study.id).is("released_at", null),
  ]);
  for (const r of [tasks, findings, holds]) if (r.error) throw dbError(r.error);
  const open = findings.data ?? [];
  const completeness = h.totals.completeness;
  const warnings: string[] = [];
  if (completeness == null) warnings.push("No expected documents are planned, so completeness cannot be measured.");
  else if (completeness < CLOSEOUT_TARGET) warnings.push(`Completeness is ${completeness}%, below the ${CLOSEOUT_TARGET}% close-out target (${h.totals.missing} missing).`);
  if ((tasks.count ?? 0) > 0) warnings.push(`${tasks.count} QC task(s) are still open; closing cancels them.`);
  const high = open.filter((f) => Number(f.priority) >= 12).length;
  if (high > 0) warnings.push(`${high} high-priority finding(s) are open.`);
  const activeSites = h.countries.reduce((n, c) => n + c.sites_active, 0);
  if (activeSites > 0) warnings.push(`${activeSites} site(s) are still active.`);
  return {
    completeness, missing: h.totals.missing, open_tasks: tasks.count ?? 0, open_findings: open.length, high_priority_findings: high,
    active_sites: activeSites, legal_holds: holds.count ?? 0, warnings,
  };
}
