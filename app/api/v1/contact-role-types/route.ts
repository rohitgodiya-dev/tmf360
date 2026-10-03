import { requireUser } from "@/lib/api/auth";
import { dbError } from "@/lib/api/db";
import { handle } from "@/lib/api/http";

// Reference list of contact roles (PI, Sub-Investigator, ...) for pickers.
export const GET = handle(async (req: Request) => {
  const ctx = await requireUser(req);
  const { data, error } = await ctx.db
    .from("contact_role_types")
    .select("code, label")
    .eq("status", "active")
    .order("label");
  if (error) throw dbError(error);
  return Response.json({ data });
});
