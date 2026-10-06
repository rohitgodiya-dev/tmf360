import { z } from "zod";
import { writeAudit } from "@/lib/api/audit";
import { requirePermission, requireUser } from "@/lib/api/auth";
import { conflict, forbidden, handle, parseBody } from "@/lib/api/http";
import { createInvitation, ilikeExact } from "@/lib/api/invitations";
import { serviceClient } from "@/lib/api/service";
import { ROLES, SITE_MANAGER_ROLES, SITE_ROLES, hasPermission } from "@/lib/permissions";

const ADMIN_ROLES = ["System Administrator", "Sponsor Admin"];

const schema = z.object({
  email: z.string().trim().toLowerCase().email(),
  full_name: z.string().trim().max(200).default(""),
  role: z.enum(ROLES),
});

// Invites a person into the caller's organisation. The invitee sets their own
// password through a single-use link; no password is ever chosen by the inviter.
export const POST = handle(async (req: Request) => {
  const ctx = await requireUser(req);
  // The service client is needed to read the organisation type and to see accounts outside the caller's org.
  const svc = serviceClient();
  const { data: org } = await svc.from("organizations").select("name, type").eq("id", ctx.orgId).maybeSingle();
  const isSiteOrg = org?.type === "Site";

  if (isSiteOrg) {
    // Site360: site managers invite site staff into their own site organisation.
    if (!SITE_MANAGER_ROLES.includes(ctx.role)) throw forbidden("Only site managers can invite users");
  } else {
    requirePermission(ctx, "invite_users");
  }
  const body = await parseBody(req, schema);
  if (isSiteOrg && !(SITE_ROLES as readonly string[]).includes(body.role)) {
    throw forbidden(`Site users can be invited as: ${SITE_ROLES.join(", ")}`);
  }
  if (!isSiteOrg && ADMIN_ROLES.includes(body.role) && !hasPermission(ctx.role, "manage_roles")) {
    throw forbidden("Only administrators can invite administrators");
  }

  const { data: existing } = await svc.from("user_roles").select("org_id").ilike("email", ilikeExact(body.email)).maybeSingle();
  if (existing) {
    throw conflict(existing.org_id === ctx.orgId
      ? "This person is already a member of your organisation"
      : "This email address cannot be invited");
  }

  const product = isSiteOrg ? "Site360" : "TMF360";
  const { invitation, emailed, inviteUrl } = await createInvitation({
    origin: new URL(req.url).origin, orgId: ctx.orgId, orgName: org?.name ?? null, product,
    inviterId: ctx.user.id, inviterEmail: ctx.user.email ?? "", email: body.email, fullName: body.full_name, role: body.role,
  });

  await writeAudit(ctx, { action: "User invited", field: "role", newValue: `${body.email} as ${body.role}` });

  // The link is returned so an administrator can pass it on if email delivery is not set up.
  return Response.json({ ...invitation, emailed, inviteUrl }, { status: 201 });
});
