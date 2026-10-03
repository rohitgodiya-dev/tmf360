import { z } from "zod";
import { handle, parseBody } from "@/lib/api/http";
import { findUsableInvitation } from "@/lib/api/invitations";
import { serviceClient } from "@/lib/api/service";

// Public: shows who an invitation link is for, so the accept page can display it.
// The token is sent in the body rather than the URL to keep it out of logs.
const schema = z.object({ token: z.string().min(20).max(200) });

export const POST = handle(async (req: Request) => {
  const { token } = await parseBody(req, schema);
  const invitation = await findUsableInvitation(token);
  const { data: org } = await serviceClient().from("organizations").select("name").eq("id", invitation.org_id).maybeSingle();
  return Response.json({
    email: invitation.email,
    full_name: invitation.full_name,
    role: invitation.role,
    organisation: org?.name ?? null,
    expires_at: invitation.expires_at,
  });
});
