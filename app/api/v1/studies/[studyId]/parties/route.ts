import { z } from "zod";
import { requirePermission, requireUser } from "@/lib/api/auth";
import { insertRow, isoDate, loadStudy } from "@/lib/api/db";
import { handle, parseBody } from "@/lib/api/http";

// An organisation's role in this study (sponsor, CRO, vendor, central lab).
const createSchema = z.object({
  party_id: z.string().uuid(),
  role: z.enum(["sponsor", "cro", "vendor", "central_lab", "other"]),
  valid_from: isoDate.nullish(),
  valid_to: isoDate.nullish(),
});

export const POST = handle(async (req: Request, { params }: { params: Promise<{ studyId: string }> }) => {
  const ctx = await requireUser(req);
  requirePermission(ctx, "edit_study");
  const study = await loadStudy(ctx, (await params).studyId);
  const body = await parseBody(req, createSchema);
  const link = await insertRow(ctx, "study_parties", { ...body, study_id: study.id });
  return Response.json(link, { status: 201 });
});
