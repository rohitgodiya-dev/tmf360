import { randomBytes } from "node:crypto";
import { z } from "zod";
import { requirePlatformAdmin } from "@/lib/api/auth";
import { handle, parseBody } from "@/lib/api/http";
import { serviceClient } from "@/lib/api/service";

// Creates a TMF360 sign-up link. Platform admins only, identified by their session
// (previously guarded by a "secret" sent from the browser, i.e. public).
const schema = z.object({
  org_name: z.string().trim().max(300).default(""),
  email: z.string().trim().email().or(z.literal("")).default(""),
});

export const POST = handle(async (req: Request) => {
  const { user } = await requirePlatformAdmin(req);
  const body = await parseBody(req, schema);

  const token = randomBytes(32).toString("hex");
  const expires_at = new Date(Date.now() + 7 * 86_400_000).toISOString();
  const { error } = await serviceClient().from("signup_tokens").insert([{
    token, org_name: body.org_name, email: body.email, expires_at, created_by: user.email,
  }]);
  if (error) throw error;

  const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;
  return Response.json({ token, signup_url: `${origin}/signup?token=${token}`, expires_at, ...body });
});
