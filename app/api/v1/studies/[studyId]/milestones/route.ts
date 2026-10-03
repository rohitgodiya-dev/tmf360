import { z } from "zod";
import { requirePermission, requireUser } from "@/lib/api/auth";
import { dbError, insertRow, isoDate, loadStudy } from "@/lib/api/db";
import { handle, parseBody } from "@/lib/api/http";

type Params = { params: Promise<{ studyId: string }> };

// All milestones of the study, optionally for one study/country/site.
export const GET = handle(async (req: Request, { params }: Params) => {
  const ctx = await requireUser(req);
  const study = await loadStudy(ctx, (await params).studyId);
  const search = new URL(req.url).searchParams;
  let q = ctx.db
    .from("milestones")
    .select("*, type:milestone_types(label, sort_order)")
    .eq("study_id", study.id)
    .order("scope_type");
  const scopeType = search.get("scope_type");
  const scopeId = search.get("scope_id");
  if (scopeType) q = q.eq("scope_type", scopeType);
  if (scopeId && z.string().uuid().safeParse(scopeId).success) q = q.eq("scope_id", scopeId);
  const { data, error } = await q;
  if (error) throw dbError(error);
  return Response.json({ data });
});

// Plans a milestone. Achieving it later is a PATCH (or happens automatically
// for site milestones when the site status changes).
const createSchema = z.object({
  scope_type: z.enum(["study", "country", "site"]),
  scope_id: z.string().uuid(),
  milestone_type: z.string().trim().min(1).max(50),
  planned_date: isoDate.nullish(),
});

export const POST = handle(async (req: Request, { params }: Params) => {
  const ctx = await requireUser(req);
  requirePermission(ctx, "edit_study");
  const study = await loadStudy(ctx, (await params).studyId);
  const body = await parseBody(req, createSchema);
  const milestone = await insertRow(ctx, "milestones", { ...body, study_id: study.id });
  return Response.json(milestone, { status: 201 });
});
