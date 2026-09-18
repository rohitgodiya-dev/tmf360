import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Mirrors TMF360's /api/generate-token route exactly, pointed at
// site360_signup_tokens instead of signup_tokens. Uses the service role
// key (server-side only) so token creation doesn't depend on the admin's
// own RLS visibility.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function randomToken(length = 32) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  for (let i = 0; i < length; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { site_name, email, secret, created_by } = body;

    const expectedSecret = process.env.NEXT_PUBLIC_SITE360_TOKEN_SECRET || "site360-admin-2026";
    if (secret !== expectedSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!site_name || !site_name.trim()) {
      return NextResponse.json({ error: "site_name is required" }, { status: 400 });
    }

    const token = randomToken();
    const expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const { error } = await supabaseAdmin.from("site360_signup_tokens").insert([{
      token,
      site_name: site_name.trim(),
      email: email?.trim() || null,
      expires_at,
      used: false,
      created_by: created_by || null,
    }]);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const origin = process.env.NEXT_PUBLIC_SITE_URL || "https://www.trial360os.com";
    const signup_url = `${origin}/site360/signup?token=${token}`;

    return NextResponse.json({ signup_url, token });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed to generate token" }, { status: 500 });
  }
}