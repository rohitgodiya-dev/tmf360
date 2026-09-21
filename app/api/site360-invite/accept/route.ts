import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(req: NextRequest) {
  try {
    const { token, password } = await req.json();
    if (!token || !password || password.length < 6) {
      return NextResponse.json({ error: 'Token and a password of at least 6 characters are required' }, { status: 400 });
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: invite } = await admin.from('site360_invites').select('*').eq('token', token).single();
    if (!invite) return NextResponse.json({ error: 'Invalid invite link' }, { status: 404 });
    if (invite.status !== 'pending') return NextResponse.json({ error: 'This invite has already been used' }, { status: 410 });

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: invite.email, password, email_confirm: true,
    });
    if (createErr || !created?.user) return NextResponse.json({ error: createErr?.message || 'Could not create account' }, { status: 500 });

    await admin.from('user_roles').insert([{
      org_id: invite.org_id, user_id: created.user.id, email: invite.email, full_name: invite.full_name || invite.email.split('@')[0],
      role: invite.role, status: 'Active', can_upload: true, can_download: true, notifications_enabled: true, can_delete: false,
    }]);

    await admin.from('site360_invites').update({ status: 'accepted', accepted_at: new Date().toISOString() }).eq('id', invite.id);

    return NextResponse.json({ ok: true, email: invite.email });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Unexpected error' }, { status: 500 });
  }
}