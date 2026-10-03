import { z } from "zod";
import { requirePermission, requireUser } from "@/lib/api/auth";
import { insertRow, loadStudy } from "@/lib/api/db";
import { handle, parseBody } from "@/lib/api/http";
import { SITE_STATUSES } from "@/lib/api/structure";

const createSchema = z.object({
  study_country_id: z.string().uuid(),
  site_number: z.string().trim().min(1).max(50),
  site_party_id: z.string().uuid(),
  display_name: z.string().trim().min(1).max(300),
  status: z.enum(SITE_STATUSES).optional(),
});

export const POST = handle(async (req: Request, { params }: { params: Promise<{ studyId: string }> }) => {
  const ctx = await requireUser(req);
  requirePermission(ctx, "edit_study");
  const study = await loadStudy(ctx, (await params).studyId);
  const body = await parseBody(req, createSchema);
  const site = await insertRow(ctx, "study_sites", { ...body, study_id: study.id });
  return Response.json(site, { status: 201 });
});
