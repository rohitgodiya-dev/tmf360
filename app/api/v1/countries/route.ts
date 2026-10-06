import { requireUser } from "@/lib/api/auth";
import { dbError } from "@/lib/api/db";
import { handle } from "@/lib/api/http";

// ISO 3166-1 reference list with region and clinical-trial regulator (Part 15).
export const GET = handle(async (req: Request) => {
  const ctx = await requireUser(req);
  const { data, error } = await ctx.db.from("countries").select("code, name, region, regulatory_authority").order("name");
  if (error) throw dbError(error);
  return Response.json({ data });
});
