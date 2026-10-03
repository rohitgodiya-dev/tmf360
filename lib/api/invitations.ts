import { createHash, randomBytes } from "node:crypto";
import { gone, notFound } from "./http";
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
};

/** Finds a usable invitation by its link token: 404 if unknown, 410 if used, revoked or expired. */
export async function findUsableInvitation(token: string): Promise<Invitation> {
  const { data } = await serviceClient()
    .from("user_invitations")
    .select("id, org_id, email, full_name, role, status, expires_at, created_by")
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
