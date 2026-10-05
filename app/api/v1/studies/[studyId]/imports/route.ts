import { z } from "zod";
import { requirePermission, requireUser } from "@/lib/api/auth";
import { dbError, loadStudy } from "@/lib/api/db";
import { handle, parseBody } from "@/lib/api/http";
import { people } from "@/lib/api/qc";

const schema = z.object({
  name: z.string().trim().min(3).max(200),
  source_system: z.string().trim().min(2).max(200),
  description: z.string().trim().max(2000).optional(),
}).strict();

// Import batches of a study (MIG-01), newest first.
export const GET = handle(async (req: Request, { params }: { params: Promise<{ studyId: string }> }) => {
  const ctx = await requireUser(req);
  requirePermission(ctx, "invite_users");
  const study = await loadStudy(ctx, (await params).studyId);
  const { data, error } = await ctx.db.from("import_batches").select("*").eq("study_id", study.id).order("created_at", { ascending: false });
  if (error) throw dbError(error);
  const who = await people(ctx);
  return Response.json({ data: (data ?? []).map((b) => ({ ...b, created_by_name: who.get(b.created_by)?.name ?? "Former member" })) });
});

// Opens a new, isolated import batch: nothing in it touches the live TMF until it is accepted.
export const POST = handle(async (req: Request, { params }: { params: Promise<{ studyId: string }> }) => {
  const ctx = await requireUser(req);
  requirePermission(ctx, "invite_users");
  const study = await loadStudy(ctx, (await params).studyId);
  const body = await parseBody(req, schema);
  const { data, error } = await ctx.db.from("import_batches").insert([{ org_id: study.org_id, study_id: study.id, ...body, change_reason: "Batch opened" }]).select("*").single();
  if (error) throw dbError(error);
  return Response.json(data, { status: 201 });
});
