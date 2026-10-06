import { z } from "zod";
import { conflict, gone, handle, parseBody } from "@/lib/api/http";
import { findUsableInvitation } from "@/lib/api/invitations";
import { serviceClient } from "@/lib/api/service";

const schema = z.object({
  token: z.string().min(20).max(200),
  password: z.string().min(8, "Use at least 8 characters").max(72),
});

// Public: turns a valid invitation into an account with the password the invitee chose.
export const POST = handle(async (req: Request) => {
  const { token, password } = await parseBody(req, schema);
  const invitation = await findUsableInvitation(token);
  const svc = serviceClient();

  // Claim the invitation first so the same link cannot be used twice concurrently.
  const { data: claimed } = await svc.from("user_invitations")
    .update({ status: "accepted", accepted_at: new Date().toISOString() })
    .eq("id", invitation.id).eq("status", "pending")
    .select("id").maybeSingle();
  if (!claimed) throw gone("This invitation has already been used.");
  const release = () => svc.from("user_invitations").update({ status: "pending", accepted_at: null }).eq("id", invitation.id);

  const { data: created, error: createErr } = await svc.auth.admin.createUser({
    email: invitation.email,
    password,
    email_confirm: true,
    user_metadata: { full_name: invitation.full_name },
  });
  if (createErr || !created.user) {
    await release();
    if (createErr?.message?.toLowerCase().includes("already")) {
      throw conflict("An account with this email already exists. Sign in instead, or contact your administrator.");
    }
    throw createErr ?? new Error("Could not create account");
  }

  const { error: roleErr } = await svc.from("user_roles").insert([{
    user_id: created.user.id, org_id: invitation.org_id, email: invitation.email,
    full_name: invitation.full_name, role: invitation.role, is_active: true,
    invited_by: invitation.created_by,
  }]);
  if (roleErr) {
    await svc.auth.admin.deleteUser(created.user.id);
    await release();
    throw roleErr;
  }

  // A study invitation (Part 17, e.g. CRO staff) also grants access to that one study, until its end date.
  if (invitation.study_code) {
    const { error: memberErr } = await svc.from("study_members").insert([{
      org_id: invitation.org_id, study_id: invitation.study_code, user_id: created.user.id, email: invitation.email,
      full_name: invitation.full_name || invitation.email, role: invitation.role, added_by: "invitation",
      party_id: invitation.party_id, expires_at: invitation.access_expires_at, is_active: true,
    }]);
    // The account exists; a failed membership only means an administrator has to add the study by hand.
    if (memberErr) console.error("Study membership from invitation failed:", memberErr.message);
  }

  await svc.from("user_invitations").update({ accepted_user_id: created.user.id }).eq("id", invitation.id);
  await svc.from("audit_trail").insert([{
    user_id: created.user.id, user_email: invitation.email, org_id: invitation.org_id,
    action: "Invitation accepted", field_changed: "role", new_value: invitation.role,
  }]);

  return Response.json({ ok: true, email: invitation.email });
});
