import { z } from "zod";
import { requirePermission, requireUser } from "@/lib/api/auth";
import { countryCode, insertRow, loadStudy } from "@/lib/api/db";
import { handle, parseBody } from "@/lib/api/http";
import { COUNTRY_STATUSES } from "@/lib/api/structure";

const createSchema = z.object({
  country_code: countryCode,
  status: z.enum(COUNTRY_STATUSES).optional(),
});

export const POST = handle(async (req: Request, { params }: { params: Promise<{ studyId: string }> }) => {
  const ctx = await requireUser(req);
  requirePermission(ctx, "edit_study");
  const study = await loadStudy(ctx, (await params).studyId);
  const body = await parseBody(req, createSchema);
  const country = await insertRow(ctx, "study_countries", { ...body, study_id: study.id });
  return Response.json(country, { status: 201 });
});
