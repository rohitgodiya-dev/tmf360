import { requireUser } from "@/lib/api/auth";
import { loadStudy } from "@/lib/api/db";
import { handle } from "@/lib/api/http";
import { REPORTS, reportPermission } from "@/lib/api/reports";
import { hasPermission } from "@/lib/permissions";

// The report catalogue (RPT-02) with whether the caller may run each one.
export const GET = handle(async (req: Request, { params }: { params: Promise<{ studyId: string }> }) => {
  const ctx = await requireUser(req);
  await loadStudy(ctx, (await params).studyId);
  return Response.json({
    data: Object.entries(REPORTS).map(([key, r]) => ({ key, ...r, allowed: hasPermission(ctx.role, reportPermission(key as keyof typeof REPORTS)) })),
  });
});
