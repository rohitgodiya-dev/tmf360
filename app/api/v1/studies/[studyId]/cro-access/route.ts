import { z } from "zod";
import { writeAudit } from "@/lib/api/audit";
import { requirePermission, requireUser } from "@/lib/api/auth";
import { ALL_STUDY_ROLES, CRO_SCOPES, CRO_SCOPE_KEYS, endOfDay, memberStatus, scopeForRole } from "@/lib/api/cro";
import { dbError, isoDate, loadStudy } from "@/lib/api/db";
import { conflict, handle, invalidRequest, parseBody } from "@/lib/api/http";
import { createInvitation, ilikeExact } from "@/lib/api/invitations";
import { serviceClient } from "@/lib/api/service";
import { escapeHtml } from "@/lib/email";

type Params = { params: Promise<{ studyId: string }> };

// CRO access to this study (Part 17): CRO members with their organisation, scope and end date, plus open invitations.
export const GET = handle(async (req: Request, { params }: Params) => {
  const ctx = await requireUser(req);
  requirePermission(ctx, "invite_users");
  const study = await loadStudy(ctx, (await params).studyId);
  const [members, invites, cros] = await Promise.all([
    ctx.db.from("study_members").select("id, user_id, email, full_name, role, party_id, expires_at, is_active, added_by, added_at, deactivated_at, deactivation_reason, party:parties(name)")
      .eq("org_id", study.org_id).eq("study_id", study.study_id).not("party_id", "is", null).order("added_at", { ascending: false }),
    serviceClient().from("user_invitations").select("id, email, full_name, role, party_id, access_expires_at, expires_at, created_at")
      .eq("org_id", study.org_id).eq("study_code", study.study_id).eq("status", "pending").gt("expires_at", new Date().toISOString()),
    ctx.db.from("parties").select("id, name").eq("party_type", "cro").eq("status", "active").order("name"),
  ]);
  for (const r of [members, invites, cros]) if (r.error) throw dbError(r.error);
  const croName = new Map((cros.data ?? []).map((c) => [c.id, c.name]));
  return Response.json({
    members: (members.data ?? []).map((m) => ({ ...m, scope: scopeForRole(m.role), status: memberStatus(m) })),
    invitations: (invites.data ?? []).map((i) => ({ ...i, scope: scopeForRole(i.role), cro_name: i.party_id ? croName.get(i.party_id) ?? null : null })),
    cros: cros.data ?? [],
    scopes: Object.entries(CRO_SCOPES).map(([key, s]) => ({ key, ...s })),
  });
});

const schema = z.object({
  email: z.string().trim().toLowerCase().email(),
  full_name: z.string().trim().max(200).default(""),
  cro_party_id: z.string().uuid().optional(),
  cro_name: z.string().trim().min(1).max(300).optional(),
  scope: z.enum(CRO_SCOPE_KEYS),
  expires_on: isoDate.nullish(),
}).refine((b) => !!b.cro_party_id !== !!b.cro_name, { message: "Choose a CRO or give a new CRO name", path: ["cro_party_id"] });

// Gives a CRO person access to this study: adds an existing organisation member, or invites someone new.
export const POST = handle(async (req: Request, { params }: Params) => {
  const ctx = await requireUser(req);
  requirePermission(ctx, "invite_users");
  const study = await loadStudy(ctx, (await params).studyId);
  const body = await parseBody(req, schema);
  if (body.expires_on && endOfDay(body.expires_on) <= new Date().toISOString()) throw invalidRequest("The access end date must be in the future");
  const expiresAt = body.expires_on ? endOfDay(body.expires_on) : null;

  let partyId = body.cro_party_id ?? null;
  if (!partyId) {
    const { data: party, error } = await ctx.db.from("parties").insert([{ party_type: "cro", name: body.cro_name }]).select("id").single();
    if (error) throw dbError(error);
    partyId = party.id;
  } else {
    const { data: party } = await ctx.db.from("parties").select("id").eq("id", partyId).eq("party_type", "cro").maybeSingle();
    if (!party) throw invalidRequest("Choose a CRO from your organisation directory");
  }
  const croLabel = body.cro_name ?? (await ctx.db.from("parties").select("name").eq("id", partyId).single()).data?.name ?? "CRO";
  const scope = CRO_SCOPES[body.scope];

  const svc = serviceClient();
  const { data: existing } = await svc.from("user_roles").select("user_id, org_id, role, full_name, email").ilike("email", ilikeExact(body.email)).maybeSingle();
  if (existing && existing.org_id !== ctx.orgId) throw conflict("This email address cannot be invited");

  if (existing) {
    // Already in the organisation: grant this study with their current role.
    if (ALL_STUDY_ROLES.includes(existing.role)) throw conflict(`${existing.email} is a ${existing.role} and already sees every study`);
    const row = { org_id: ctx.orgId, study_id: study.study_id, user_id: existing.user_id, email: existing.email, full_name: existing.full_name || existing.email,
      role: existing.role, added_by: ctx.user.email, party_id: partyId, expires_at: expiresAt, is_active: true, deactivation_reason: null };
    const { data: current } = await ctx.db.from("study_members").select("id").eq("study_id", study.study_id).eq("user_id", existing.user_id).maybeSingle();
    const { data: member, error } = current
      ? await ctx.db.from("study_members").update(row).eq("id", current.id).select().single()
      : await ctx.db.from("study_members").insert([row]).select().single();
    if (error) throw dbError(error);
    await writeAudit(ctx, { action: "CRO study access granted", studyId: study.study_id, field: "study_members",
      newValue: `${existing.email} (${croLabel}, ${existing.role})${expiresAt ? ` until ${body.expires_on}` : ""}` });
    return Response.json({ kind: "member", member, note: existing.role !== scope.role ? `Kept their organisation role, ${existing.role}.` : null }, { status: 201 });
  }

  const { data: org } = await svc.from("organizations").select("name").eq("id", ctx.orgId).maybeSingle();
  const { invitation, emailed, inviteUrl } = await createInvitation({
    origin: new URL(req.url).origin, orgId: ctx.orgId, orgName: org?.name ?? null, product: "TMF360",
    inviterId: ctx.user.id, inviterEmail: ctx.user.email ?? "", email: body.email, fullName: body.full_name, role: scope.role,
    studyCode: study.study_id, partyId, accessExpiresAt: expiresAt,
    extraHtml: `<p style="color:#374151;font-size:14px;line-height:1.6">You will have ${escapeHtml(scope.label)} access to study
      <strong>${escapeHtml(study.study_id)}</strong> on behalf of ${escapeHtml(croLabel)}${body.expires_on ? ` until ${escapeHtml(body.expires_on)}` : ""}.</p>`,
  });
  await writeAudit(ctx, { action: "User invited", studyId: study.study_id, field: "role",
    newValue: `${body.email} as ${scope.role} for ${croLabel}${body.expires_on ? ` until ${body.expires_on}` : ""}` });
  return Response.json({ kind: "invitation", invitation, emailed, inviteUrl }, { status: 201 });
});
