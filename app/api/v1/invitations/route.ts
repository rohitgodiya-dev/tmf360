import { z } from "zod";
import { writeAudit } from "@/lib/api/audit";
import { requirePermission, requireUser } from "@/lib/api/auth";
import { conflict, forbidden, handle, parseBody } from "@/lib/api/http";
import { INVITE_TTL_DAYS, ilikeExact, newInviteToken } from "@/lib/api/invitations";
import { serviceClient } from "@/lib/api/service";
import { emailLayout, escapeHtml, sendEmail } from "@/lib/email";
import { ROLES, hasPermission } from "@/lib/permissions";

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
  requirePermission(ctx, "invite_users");
  const body = await parseBody(req, schema);
  if (ADMIN_ROLES.includes(body.role) && !hasPermission(ctx.role, "manage_roles")) {
    throw forbidden("Only administrators can invite administrators");
  }

  // Authorised above; the service client is needed to see accounts outside the caller's org.
  const svc = serviceClient();
  const { data: existing } = await svc.from("user_roles").select("org_id").ilike("email", ilikeExact(body.email)).maybeSingle();
  if (existing) {
    throw conflict(existing.org_id === ctx.orgId
      ? "This person is already a member of your organisation"
      : "This email address cannot be invited");
  }

  // A new invitation replaces any earlier pending one for the same person.
  await svc.from("user_invitations").update({ status: "revoked" })
    .eq("org_id", ctx.orgId).ilike("email", ilikeExact(body.email)).eq("status", "pending");

  const { token, hash } = newInviteToken();
  const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 86_400_000).toISOString();
  const { data: invitation, error } = await svc.from("user_invitations").insert([{
    org_id: ctx.orgId, email: body.email, full_name: body.full_name, role: body.role,
    token_hash: hash, expires_at: expiresAt, created_by: ctx.user.id,
  }]).select("id, email, role, expires_at").single();
  if (error) throw error;

  const { data: org } = await svc.from("organizations").select("name").eq("id", ctx.orgId).maybeSingle();
  const inviteUrl = `${new URL(req.url).origin}/platform/invite?token=${token}`;
  const emailed = await sendEmail(
    body.email,
    `You've been invited to ${org?.name ?? "TMF360"}`,
    emailLayout(`You've been invited to TMF360`, `
      <p style="color:#374151;font-size:14px;line-height:1.6">${escapeHtml(ctx.user.email)} invited you to join
      <strong>${escapeHtml(org?.name ?? "their organisation")}</strong> as <strong>${escapeHtml(body.role)}</strong>.</p>
      <p><a href="${escapeHtml(inviteUrl)}" style="background:#F97316;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:700;display:inline-block">Set up your account</a></p>
      <p style="color:#6B7280;font-size:12px">This link works once and expires in ${INVITE_TTL_DAYS} days. Don't share it.</p>`),
  );

  await writeAudit(ctx, { action: "User invited", field: "role", newValue: `${body.email} as ${body.role}` });

  // The link is returned so an administrator can pass it on if email delivery is not set up.
  return Response.json({ ...invitation, emailed, inviteUrl }, { status: 201 });
});
