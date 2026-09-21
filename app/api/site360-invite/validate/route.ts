import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 });

  const admin = createClient(supabaseUrl, serviceKey);
  const { data: invite } = await admin.from('site360_invites').select('email, full_name, role, status').eq('token', token).single();

  if (!invite) return NextResponse.json({ error: 'Invalid invite link' }, { status: 404 });
  if (invite.status !== 'pending') return NextResponse.json({ error: 'This invite has already been used' }, { status: 410 });

  return NextResponse.json({ email: invite.email, full_name: invite.full_name, role: invite.role });
}