import { writeAudit } from "@/lib/api/audit";
import { requirePermission, requireUser } from "@/lib/api/auth";
import { loadStudy } from "@/lib/api/db";
import { handle, invalidRequest, notFound } from "@/lib/api/http";
import { REPORTS, buildReport, reportPermission, type ReportKey } from "@/lib/api/reports";
import { buildXlsx, xlsxResponse } from "@/lib/xlsx";

const DATE = /^\d{4}-\d{2}-\d{2}$/;

// One report as Excel (RPT-02): ?from=YYYY-MM-DD&to=YYYY-MM-DD (default: the last 90 days).
// Generated with the caller's own permissions at request time and audited.
export const GET = handle(async (req: Request, { params }: { params: Promise<{ studyId: string; report: string }> }) => {
  const ctx = await requireUser(req);
  const { studyId, report } = await params;
  if (!(report in REPORTS)) throw notFound();
  const key = report as ReportKey;
  requirePermission(ctx, reportPermission(key));
  const study = await loadStudy(ctx, studyId);
  const url = new URL(req.url);
  const to = url.searchParams.get("to") ?? new Date().toISOString().slice(0, 10);
  const from = url.searchParams.get("from") ?? new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10);
  if (!DATE.test(from) || !DATE.test(to) || Number.isNaN(Date.parse(from)) || Number.isNaN(Date.parse(to))) throw invalidRequest("Use dates as YYYY-MM-DD");
  if (from > to) throw invalidRequest("The start date must be on or before the end date");
  if (Date.parse(to) - Date.parse(from) > 3 * 366 * 86400000) throw invalidRequest("Choose a range of at most 3 years");

  const bytes = await buildXlsx(await buildReport(ctx, study, key, { from, to }));
  await writeAudit(ctx, { action: "Report generated", studyId: study.study_id, field: "report", newValue: `${REPORTS[key].title} ${from} to ${to}` });
  return xlsxResponse(bytes, `${study.study_id}-${key}-${from}-to-${to}.xlsx`);
});
