import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { escapeHtml } from '@/lib/email';

// Roles a site manager may grant. The user_roles valid_role constraint only accepts
// these two of the Site360 roles; admin roles must never be grantable from Site360.
const INVITABLE_SITE_ROLES = ['Site Coordinator', 'Investigator'];

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(req: NextRequest) {
  try {
    const { org_id, site_id, email, full_name, role, created_by, site_name, access_token } = await req.json();
    if (!org_id || !site_id || !email || !role || !access_token) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify the caller is actually a manager of this org before inviting anyone.
    const callerClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: `Bearer ${access_token}` } } });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: callerRole } = await admin.from('user_roles').select('role, org_id').eq('user_id', caller.id).single();
    if (!callerRole || callerRole.org_id !== org_id || !['Site Coordinator', 'PI'].includes(callerRole.role)) {
      return NextResponse.json({ error: 'Only site managers can invite users' }, { status: 403 });
    }
    if (!INVITABLE_SITE_ROLES.includes(role)) {
      return NextResponse.json({ error: `Site users can be invited as: ${INVITABLE_SITE_ROLES.join(', ')}` }, { status: 400 });
    }

    const token = crypto.randomUUID().replace(/-/g, '') + Date.now().toString(36);
    const { error: insErr } = await admin.from('site360_invites').insert([{
      org_id, site_id, email, full_name: full_name || '', role, token, status: 'pending', created_by: created_by || caller.email,
    }]);
    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });

    const inviteUrl = `${req.nextUrl.origin}/site360/invite?token=${token}`;

    if (process.env.RESEND_API_KEY) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'Trial360 OS <onboarding@trial360os.com>',
          to: email,
          subject: `You've been invited to ${site_name || 'a site'} on Site360`,
          html: `<p>Hi${full_name ? ' ' + escapeHtml(full_name) : ''},</p><p>You've been invited to join <strong>${escapeHtml(site_name || 'your site')}</strong> on Site360 as <strong>${escapeHtml(role)}</strong>.</p><p><a href="${escapeHtml(inviteUrl)}">Click here to set up your account</a></p><p>This link is single-use and does not expire, but should not be shared.</p>`,
        }),
      });
    }

    return NextResponse.json({ ok: true, inviteUrl });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Unexpected error' }, { status: 500 });
  }
}