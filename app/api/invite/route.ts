import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const { email, role, full_name, invited_by_email } = await request.json();

    if (!email || !role) {
      return NextResponse.json({ error: 'Email and role are required' }, { status: 400 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Pre-insert role so it's ready when user signs up
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .upsert([{
        user_id: '00000000-0000-0000-0000-000000000000', // placeholder
        email: email.trim(),
        role,
        full_name: full_name || '',
        is_active: true,
        notifications_enabled: true,
      }], { onConflict: 'email' });

    if (roleError) {
      console.error('Role insert error:', roleError);
    }

    // Send branded invitation email via Resend
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'TMF360 <onboarding@resend.dev>',
        to: email,
        subject: `You've been invited to TMF360 as ${role}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;background:#fff;border:1px solid #E5E7EB;border-radius:12px;overflow:hidden">
            <div style="background:#1E1B4B;padding:28px 32px">
              <h1 style="color:#fff;font-size:22px;margin:0;font-weight:900">TMF<span style="color:#a78bfa">360</span></h1>
              <p style="color:#A5B4FC;font-size:12px;margin:4px 0 0">Smart TMF. Confident Trials.</p>
            </div>
            <div style="padding:32px">
              <h2 style="color:#111827;font-size:18px;margin:0 0 12px">You've been invited to TMF360!</h2>
              <p style="color:#6B7280;font-size:14px;line-height:1.6">
                <strong>${invited_by_email || 'A System Administrator'}</strong> has invited you to join <strong>TMF360</strong> as a <strong style="color:#6366F1">${role}</strong>.
              </p>
              <div style="margin:28px 0">
                <a href="https://tmf360-gliv.vercel.app" 
                   style="background:#6366F1;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;display:inline-block">
                  Accept Invitation →
                </a>
              </div>
              <div style="background:#F9FAFB;border-radius:8px;padding:14px;margin-top:20px">
                <p style="color:#6B7280;font-size:12px;margin:0"><strong>Your role:</strong> ${role}</p>
                <p style="color:#6B7280;font-size:12px;margin:4px 0 0"><strong>Platform:</strong> tmf360-gliv.vercel.app</p>
              </div>
            </div>
            <div style="padding:16px 32px;border-top:1px solid #E5E7EB;background:#F9FAFB">
              <p style="color:#9CA3AF;font-size:11px;margin:0">© 2025 TMF360 · Free for the clinical research community</p>
            </div>
          </div>
        `
      })
    });

    const resendData = await resendResponse.json();

    if (!resendResponse.ok) {
      return NextResponse.json({ error: resendData.message || 'Failed to send email' }, { status: 400 });
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}