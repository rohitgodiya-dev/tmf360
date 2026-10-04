import { z } from "zod";
import { writeAudit } from "@/lib/api/audit";
import { requirePermission, requireUser } from "@/lib/api/auth";
import { loadStudy } from "@/lib/api/db";
import { handle, parseBody } from "@/lib/api/http";
import { exportRows, querySchema } from "@/lib/api/navigator";

const MAX_ROWS = 5000;
const exportSchema = querySchema.extend({ ids: z.array(z.string().uuid()).max(MAX_ROWS).optional() });

const HEADERS: [string, string][] = [
  ["Status", "nav_status"], ["Current Activity", "current_activity"], ["Document Type", "document_type"],
  ["Artifact", "artifact_num"], ["ID", "doc_ref"], ["Title", "title"], ["Country", "country_code"],
  ["Site", "site_number"], ["Site Name", "site_name"], ["Owner", "owner"], ["Last Modified", "last_modified"],
  ["TMF Level", "tmf_level"], ["File Type", "file_type"], ["Revision", "revision"],
];

// Spreadsheet apps run cells starting with = + - @ as formulas; prefix them so they stay text.
function cell(v: unknown) {
  let s = v == null ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// NAV-08 Export: the selected rows (or every row matching the filters) as CSV. Generated with
// the requester's own permissions at request time and audited (AZB-04).
export const POST = handle(async (req: Request, { params }: { params: Promise<{ studyId: string }> }) => {
  const ctx = await requireUser(req);
  requirePermission(ctx, "view_document");
  const study = await loadStudy(ctx, (await params).studyId);
  const { ids, ...query } = await parseBody(req, exportSchema);

  const rows = await exportRows(ctx.db, study, query, ids, MAX_ROWS);
  const csv = [HEADERS.map(([h]) => h).join(","), ...rows.map((r: Record<string, unknown>) => HEADERS.map(([, k]) => cell(r[k])).join(","))].join("\r\n");

  await writeAudit(ctx, {
    action: "Navigator export", studyId: study.study_id, field: "navigator",
    newValue: `${rows.length} rows${ids?.length ? " (selected)" : ""}`,
  });
  return new Response("﻿" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${study.study_id.replace(/[^\w.-]/g, "_")}-navigator.csv"`,
      "Cache-Control": "no-store",
    },
  });
});
