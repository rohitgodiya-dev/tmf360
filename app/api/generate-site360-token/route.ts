import { randomBytes } from "node:crypto";
import { z } from "zod";
import { requirePlatformAdmin } from "@/lib/api/auth";
import { handle, parseBody } from "@/lib/api/http";
import { serviceClient } from "@/lib/api/service";

// Creates a Site360 sign-up link. Platform admins only, identified by their session
// (previously guarded by a browser-visible secret with a hard-coded fallback).
const schema = z.object({
  site_name: z.string().trim().min(1, "site_name is required").max(300),
  email: z.string().trim().email("A valid email is required"),
});

export const POST = handle(async (req: Request) => {
  const { user } = await requirePlatformAdmin(req);
  const body = await parseBody(req, schema);

  const token = randomBytes(24).toString("base64url");
  const expires_at = new Date(Date.now() + 7 * 86_400_000).toISOString();
  const { error } = await serviceClient().from("site360_signup_tokens").insert([{
    token, site_name: body.site_name, email: body.email, expires_at, used: false, created_by: user.email,
  }]);
  if (error) throw error;

  const origin = process.env.NEXT_PUBLIC_SITE_URL || "https://www.trial360os.com";
  return Response.json({ signup_url: `${origin}/site360/signup?token=${token}`, token });
});
