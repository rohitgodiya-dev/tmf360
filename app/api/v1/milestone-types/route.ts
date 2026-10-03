import { requireUser } from "@/lib/api/auth";
import { dbError } from "@/lib/api/db";
import { handle } from "@/lib/api/http";

// Reference list of milestone types, grouped by level in the UI.
export const GET = handle(async (req: Request) => {
  const ctx = await requireUser(req);
  const { data, error } = await ctx.db
    .from("milestone_types")
    .select("code, label, applies_to, completed_by_site_status, sort_order")
    .eq("status", "active")
    .order("applies_to")
    .order("sort_order");
  if (error) throw dbError(error);
  return Response.json({ data });
});
