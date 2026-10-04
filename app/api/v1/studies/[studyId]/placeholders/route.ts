import { z } from "zod";
import { requirePermission, requireUser } from "@/lib/api/auth";
import { dbError, isoDate, loadStudy } from "@/lib/api/db";
import { handle, invalidRequest, parseBody } from "@/lib/api/http";

const text = (max: number) => z.string().trim().max(max).optional().transform((v) => v || null);
const item = z.object({
  artifact_num: z.string().regex(/^\d{2}\.\d{2}\.\d{2}$/, "Use an artifact number like 01.01.01"),
  level: z.enum(["study", "country", "site"]),
  study_country_id: z.string().uuid().nullable().default(null),
  study_site_id: z.string().uuid().nullable().default(null),
  title: text(300),
  instructions: text(4000),
  responsible_org: text(200),
  responsible_dept: text(200),
  due_date: isoDate.nullable().default(null),
  quantity: z.number().int().min(1).max(50).default(1),
}).strict().refine((p) => p.level !== "site" || p.study_site_id, { message: "Choose the site", path: ["study_site_id"] })
  .refine((p) => p.level !== "country" || p.study_country_id, { message: "Choose the country", path: ["study_country_id"] });
const schema = z.object({ items: z.array(item).min(1).max(100) }).strict();

// Add Expected Artifact (PLC-02/03), one or many. Each placeholder fills itself straight away if a
// matching document is already filed. The database checks the artifact is enabled for the study
// and that the country/site belong to it, and audits each placeholder.
export const POST = handle(async (req: Request, { params }: { params: Promise<{ studyId: string }> }) => {
  const ctx = await requireUser(req);
  requirePermission(ctx, "edit_study");
  const study = await loadStudy(ctx, (await params).studyId);
  const body = await parseBody(req, schema);
  const rows = body.items.flatMap(({ quantity, ...p }) => Array.from({ length: quantity }, () => ({
    ...p, org_id: study.org_id, study_id: study.id,
    study_country_id: p.level === "study" ? null : p.study_country_id,
    study_site_id: p.level === "site" ? p.study_site_id : null,
  })));
  if (rows.length > 200) throw invalidRequest("Add at most 200 expected artifacts at a time");
  const { data, error } = await ctx.db.from("placeholders").insert(rows).select("id, status, artifact_num, level");
  if (error) throw dbError(error);
  return Response.json({ data }, { status: 201 });
});
