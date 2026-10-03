import { z } from "zod";
import { requirePermission, requireUser } from "@/lib/api/auth";
import { insertRow, isoDate, loadStudy } from "@/lib/api/db";
import { handle, parseBody } from "@/lib/api/http";

// A person's role (e.g. Principal Investigator) at study, country or site level.
const createSchema = z.object({
  person_id: z.string().uuid(),
  scope_type: z.enum(["study", "country", "site"]),
  scope_id: z.string().uuid(),
  role_code: z.string().trim().min(1).max(50),
  start_date: isoDate.optional(),
});

export const POST = handle(async (req: Request, { params }: { params: Promise<{ studyId: string }> }) => {
  const ctx = await requireUser(req);
  requirePermission(ctx, "edit_study");
  const study = await loadStudy(ctx, (await params).studyId);
  const body = await parseBody(req, createSchema);
  const contact = await insertRow(ctx, "contact_roles", { ...body, study_id: study.id });
  return Response.json(contact, { status: 201 });
});
