import { requireUser } from "@/lib/api/auth";
import { loadStudy } from "@/lib/api/db";
import { studyHierarchy } from "@/lib/api/hierarchy";
import { handle } from "@/lib/api/http";

// Countries and sites with enrollment, completeness and key dates (Part 15).
export const GET = handle(async (req: Request, { params }: { params: Promise<{ studyId: string }> }) => {
  const ctx = await requireUser(req);
  const study = await loadStudy(ctx, (await params).studyId);
  return Response.json(await studyHierarchy(ctx.db, study));
});
