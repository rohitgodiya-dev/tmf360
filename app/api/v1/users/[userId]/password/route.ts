import { z } from "zod";
import { writeAudit } from "@/lib/api/audit";
import { requirePermission, requireUser } from "@/lib/api/auth";
import { dbError, idParam } from "@/lib/api/db";
import { conflict, handle, notFound, parseBody } from "@/lib/api/http";
import { serviceClient } from "@/lib/api/service";

const schema = z.object({ new_password: z.string().min(8, "Use at least 8 characters").max(72) });

type Params = { params: Promise<{ userId: string }> };

// An administrator sets a new password for a member of their own organisation.
// Replaces the unauthenticated /api/change-password, which let anyone set any
// user's password. The password itself is never logged.
export const PUT = handle(async (req: Request, { params }: Params) => {
  const ctx = await requireUser(req);
  requirePermission(ctx, "manage_roles");
  const userId = idParam((await params).userId);
  if (userId === ctx.user.id) throw conflict("Change your own password from your profile");
  const { new_password } = await parseBody(req, schema);

  // Visible only if the target is in the caller's organisation (RLS).
  const { data: target, error } = await ctx.db.from("user_roles")
    .select("user_id, email, is_active").eq("user_id", userId).eq("org_id", ctx.orgId).maybeSingle();
  if (error) throw dbError(error);
  if (!target) throw notFound();

  const { error: updErr } = await serviceClient().auth.admin.updateUserById(userId, { password: new_password });
  if (updErr) throw updErr;

  await writeAudit(ctx, { action: "Password reset by administrator", field: "password", newValue: `for ${target.email}` });
  return Response.json({ ok: true });
});
