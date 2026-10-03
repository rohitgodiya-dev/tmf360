import { requireUser } from "@/lib/api/auth";
import { handle } from "@/lib/api/http";
import { PERMISSIONS, hasPermission, type Permission } from "@/lib/permissions";

// The signed-in user's identity, organisation, role and effective permissions.
export const GET = handle(async (req: Request) => {
  const ctx = await requireUser(req);
  const permissions = (Object.keys(PERMISSIONS) as Permission[]).filter((p) => hasPermission(ctx.role, p));
  return Response.json({
    id: ctx.user.id,
    email: ctx.user.email,
    orgId: ctx.orgId,
    role: ctx.role,
    permissions,
  });
});
