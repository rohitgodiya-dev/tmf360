// CRO study access (Part 17). A CRO person is a member of the sponsor organisation with access to named studies
// only, optionally until an end date. Each access scope maps to a role that never sees all studies: roles with
// organisation-wide study access (System Administrator, Sponsor Admin, TMF Lead) are never given to CRO staff.
import type { Role } from "../permissions";

export const CRO_SCOPES = {
  monitor: { label: "Monitor", role: "CRA" },
  data_manager: { label: "Data Manager", role: "Clinical Trial Associate" },
  project_manager: { label: "Project Manager", role: "Clinical Trial Manager" },
  regulatory: { label: "Regulatory", role: "Regulatory" },
} as const satisfies Record<string, { label: string; role: Role }>;
export type CroScope = keyof typeof CRO_SCOPES;
export const CRO_SCOPE_KEYS = Object.keys(CRO_SCOPES) as [CroScope, ...CroScope[]];

/** Roles that see every study of the organisation; they cannot be limited to one study. */
export const ALL_STUDY_ROLES: readonly string[] = ["System Administrator", "Sponsor Admin", "TMF Lead"];

export function scopeForRole(role: string): CroScope | null {
  return (Object.entries(CRO_SCOPES).find(([, s]) => s.role === role)?.[0] as CroScope | undefined) ?? null;
}

/** End of the chosen day (UTC), so access lasts through the date the administrator picked. */
export function endOfDay(date: string): string {
  return `${date}T23:59:59.999Z`;
}

export type MemberStatus = "active" | "expired" | "revoked";
export function memberStatus(m: { is_active: boolean | null; expires_at: string | null }): MemberStatus {
  if (m.is_active === false) return "revoked";
  if (m.expires_at && Date.parse(m.expires_at) <= Date.now()) return "expired";
  return "active";
}
