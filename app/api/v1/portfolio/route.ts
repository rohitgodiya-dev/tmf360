import { writeAudit } from "@/lib/api/audit";
import { requirePermission, requireUser } from "@/lib/api/auth";
import { handle } from "@/lib/api/http";
import { portfolio, portfolioSheets } from "@/lib/api/portfolio";
import { buildXlsx, xlsxResponse } from "@/lib/xlsx";

// Sponsor portfolio across all studies (Part 16). ?format=xlsx downloads it as Excel (audited).
export const GET = handle(async (req: Request) => {
  const ctx = await requireUser(req);
  requirePermission(ctx, "view_portfolio");
  const p = await portfolio(ctx.db, ctx.orgId);
  if (new URL(req.url).searchParams.get("format") !== "xlsx") return Response.json(p);
  const bytes = await buildXlsx(portfolioSheets(p));
  const today = new Date().toISOString().slice(0, 10);
  await writeAudit(ctx, { action: "Report generated", field: "report", newValue: `Portfolio (${p.studies.length} studies) ${today}` });
  return xlsxResponse(bytes, `portfolio-${today}.xlsx`);
});
