import { createHash, randomBytes } from "node:crypto";
import { gone, notFound } from "./http";
import { emailLayout, escapeHtml, sendEmail } from "../email";
import { serviceClient } from "./service";

export const INVITE_TTL_DAYS = 7;

export function newInviteToken() {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashToken(token) };
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export type Invitation = {
  id: string;
  org_id: string;
  email: string;
  full_name: string;
  role: string;
  status: string;
  expires_at: string;
  created_by: string | null;
  /** Part 17: an invitation can also grant access to one study, for a CRO, until a date. */
  study_code: string | null;
  party_id: string | null;
  access_expires_at: string | null;
};

/** Finds a usable invitation by its link token: 404 if unknown, 410 if used, revoked or expired. */
export async function findUsableInvitation(token: string): Promise<Invitation> {
  const { data } = await serviceClient()
    .from("user_invitations")
    .select("id, org_id, email, full_name, role, status, expires_at, created_by, study_code, party_id, access_expires_at")
    .eq("token_hash", hashToken(token))
    .maybeSingle();
  if (!data) throw notFound("This invitation link is not valid");
  if (data.status !== "pending" || new Date(data.expires_at) <= new Date()) {
    throw gone("This invitation has already been used or has expired. Ask your administrator for a new one.");
  }
  return data as Invitation;
}

/** Escapes a value for use inside a PostgREST ilike pattern (exact, case-insensitive match). */
export function ilikeExact(value: string) {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}

/**
 * Creates a pending invitation (replacing any earlier pending one for the same person) and emails the
 * single-use link. Returns the invitation, whether the email was sent, and the link for manual hand-over.
 */
export async function createInvitation(opts: {
  origin: string; orgId: string; orgName: string | null; product: string; inviterId: string; inviterEmail: string;
  email: string; fullName: string; role: string; studyCode?: string | null; partyId?: string | null; accessExpiresAt?: string | null;
  extraHtml?: string;
}) {
  const svc = serviceClient();
  await svc.from("user_invitations").update({ status: "revoked" })
    .eq("org_id", opts.orgId).ilike("email", ilikeExact(opts.email)).eq("status", "pending");

  const { token, hash } = newInviteToken();
  const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 86_400_000).toISOString();
  const { data: invitation, error } = await svc.from("user_invitations").insert([{
    org_id: opts.orgId, email: opts.email, full_name: opts.fullName, role: opts.role,
    token_hash: hash, expires_at: expiresAt, created_by: opts.inviterId,
    study_code: opts.studyCode ?? null, party_id: opts.partyId ?? null, access_expires_at: opts.accessExpiresAt ?? null,
  }]).select("id, email, role, expires_at, study_code, access_expires_at").single();
  if (error) throw error;

  const inviteUrl = `${opts.origin}/platform/invite?token=${token}`;
  const emailed = await sendEmail(
    opts.email,
    `You've been invited to ${opts.orgName ?? opts.product}`,
    emailLayout(`You've been invited to ${opts.product}`, `
      <p style="color:#374151;font-size:14px;line-height:1.6">${escapeHtml(opts.inviterEmail)} invited you to join
      <strong>${escapeHtml(opts.orgName ?? "their organisation")}</strong> as <strong>${escapeHtml(opts.role)}</strong>.</p>
      ${opts.extraHtml ?? ""}
      <p><a href="${escapeHtml(inviteUrl)}" style="background:#F97316;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:700;display:inline-block">Set up your account</a></p>
      <p style="color:#6B7280;font-size:12px">This link works once and expires in ${INVITE_TTL_DAYS} days. Don't share it.</p>`),
  );
  return { invitation, emailed, inviteUrl };
}
