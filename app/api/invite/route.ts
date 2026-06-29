import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const { email, role, full_name, password, invited_by_email } = await request.json();

    if (!email || !role || !password) {
      return NextResponse.json({ error: 'Email, password and role are required' }, { status: 400 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get inviter's org_id
    const { data: inviterRole } = await supabaseAdmin
      .from('user_roles')
      .select('org_id')
      .eq('email', invited_by_email)
      .single();

    const orgId = inviterRole?.org_id || null;

    // Create user account in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email.trim(),
      password: password,
      email_confirm: true,
      user_metadata: { full_name, role }
    });

    let userId = '';

    if (authError) {
      if (authError.message.includes('already registered') || authError.message.includes('already been registered')) {
        const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
        const existingUser = existingUsers?.users?.find(u => u.email === email.trim());
        if (existingUser) {
          userId = existingUser.id;
          await supabaseAdmin.auth.admin.updateUserById(userId, { password });
        } else {
          return NextResponse.json({ error: authError.message }, { status: 400 });
        }
      } else {
        return NextResponse.json({ error: authError.message }, { status: 400 });
      }
    } else {
      userId = authData.user.id;
    }

    // Assign role with org_id so invited user skips setup
    await supabaseAdmin.from('user_roles').upsert([{
      user_id: userId,
      email: email.trim(),
      role,
      full_name: full_name || '',
      is_active: true,
      notifications_enabled: true,
      can_upload_download: true,
      can_download: true,
      org_id: orgId,
    }], { onConflict: 'email' });

    // Send login credentials via Resend
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'TMF360 <onboarding@resend.dev>',
        to: email,
        subject: `Your TMF360 account is ready — ${role}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;background:#fff;border:1px solid #E5E7EB;border-radius:12px;overflow:hidden">
            <div style="background:#1E1B4B;padding:28px 32px">
              <h1 style="color:#fff;font-size:22px;margin:0;font-weight:900">TMF<span style="color:#a78bfa">360</span></h1>
              <p style="color:#A5B4FC;font-size:12px;margin:4px 0 0">Smart TMF. Confident Trials.</p>
            </div>
            <div style="padding:32px">
              <h2 style="color:#111827;font-size:18px;margin:0 0 8px">Welcome to TMF360, ${full_name || email}!</h2>
              <p style="color:#6B7280;font-size:14px;line-height:1.6;margin-bottom:20px">
                Your account has been created by <strong>${invited_by_email || 'System Administrator'}</strong>. Here are your login credentials:
              </p>
              <div style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:10px;padding:20px;margin-bottom:20px">
                <p style="color:#111827;font-size:13px;margin:0 0 8px"><strong>Login URL:</strong> <a href="https://tmf360-gliv.vercel.app" style="color:#6366F1">tmf360-gliv.vercel.app</a></p>
                <p style="color:#111827;font-size:13px;margin:0 0 8px"><strong>Email:</strong> ${email}</p>
                <p style="color:#111827;font-size:13px;margin:0 0 8px"><strong>Password:</strong> ${password}</p>
                <p style="color:#111827;font-size:13px;margin:0"><strong>Your role:</strong> <span style="color:#6366F1;font-weight:700">${role}</span></p>
              </div>
              <p style="color:#EF4444;font-size:12px;margin-bottom:20px">⚠️ Please change your password after your first login for security.</p>
              <a href="https://tmf360-gliv.vercel.app" style="background:#6366F1;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;display:inline-block">Login to TMF360 →</a>
            </div>
            <div style="padding:16px 32px;border-top:1px solid #E5E7EB;background:#F9FAFB">
              <p style="color:#9CA3AF;font-size:11px;margin:0">© 2025 TMF360 · Free for the clinical research community</p>
            </div>
          </div>
        `
      })
    });

    return NextResponse.json({ success: true });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}