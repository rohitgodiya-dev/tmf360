import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const { type, document_name, artifact_name, zone, study_id, uploaded_by } = await request.json();

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get all users with notifications enabled
    const { data: users } = await supabaseAdmin
      .from('user_roles')
      .select('email, full_name, role')
      .eq('is_active', true)
      .eq('notifications_enabled', true);

    if (!users || users.length === 0) {
      return NextResponse.json({ success: true, sent: 0 });
    }

    const subjects: Record<string, string> = {
      document_uploaded: `New document uploaded — ${document_name}`,
      document_submitted: `Document submitted for review — ${document_name}`,
      document_approved: `Document approved — ${document_name}`,
      document_rejected: `Document rejected — ${document_name}`,
      document_expiring: `Document expiring soon — ${document_name}`,
    };

    const colors: Record<string, string> = {
      document_uploaded: '#6366F1',
      document_submitted: '#3B82F6',
      document_approved: '#10B981',
      document_rejected: '#EF4444',
      document_expiring: '#F59E0B',
    };

    const icons: Record<string, string> = {
      document_uploaded: '📄',
      document_submitted: '📋',
      document_approved: '✅',
      document_rejected: '❌',
      document_expiring: '⚠️',
    };

    const subject = subjects[type] || `TMF360 Notification — ${document_name}`;
    const color = colors[type] || '#6366F1';
    const icon = icons[type] || '📄';

    // Send to all users with notifications enabled
    const emailPromises = users.map(user =>
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: 'TMF360 <onboarding@resend.dev>',
          to: user.email,
          subject,
          html: `
            <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;background:#fff;border:1px solid #E5E7EB;border-radius:12px;overflow:hidden">
              <div style="background:#1E1B4B;padding:24px 32px">
                <h1 style="color:#fff;font-size:20px;margin:0;font-weight:900">TMF<span style="color:#a78bfa">360</span></h1>
                <p style="color:#A5B4FC;font-size:11px;margin:4px 0 0">Smart TMF. Confident Trials.</p>
              </div>
              <div style="padding:28px 32px">
                <div style="display:inline-block;background:${color}22;border:1px solid ${color}44;border-radius:8px;padding:8px 14px;margin-bottom:16px">
                  <span style="color:${color};font-weight:700;font-size:13px">${icon} ${type.replace(/_/g,' ').replace(/\b\w/g,l=>l.toUpperCase())}</span>
                </div>
                <h2 style="color:#111827;font-size:16px;margin:0 0 12px">${subject}</h2>
                <table style="width:100%;border-collapse:collapse;margin:16px 0;background:#F9FAFB;border-radius:8px;overflow:hidden">
                  <tr><td style="padding:8px 14px;font-size:12px;color:#6B7280;border-bottom:1px solid #E5E7EB"><strong>Document:</strong> ${document_name}</td></tr>
                  <tr><td style="padding:8px 14px;font-size:12px;color:#6B7280;border-bottom:1px solid #E5E7EB"><strong>Artifact:</strong> ${artifact_name}</td></tr>
                  <tr><td style="padding:8px 14px;font-size:12px;color:#6B7280;border-bottom:1px solid #E5E7EB"><strong>Zone:</strong> ${zone}</td></tr>
                  <tr><td style="padding:8px 14px;font-size:12px;color:#6B7280;border-bottom:1px solid #E5E7EB"><strong>Study:</strong> ${study_id}</td></tr>
                  <tr><td style="padding:8px 14px;font-size:12px;color:#6B7280"><strong>Action by:</strong> ${uploaded_by}</td></tr>
                </table>
                <a href="https://tmf360-gliv.vercel.app/platform" style="background:${color};color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:700;font-size:13px;display:inline-block">View in TMF360 →</a>
              </div>
              <div style="padding:14px 32px;border-top:1px solid #E5E7EB;background:#F9FAFB">
                <p style="color:#9CA3AF;font-size:11px;margin:0">© 2025 TMF360 · You received this because notifications are enabled for your account · <a href="https://tmf360-gliv.vercel.app/platform/users" style="color:#6366F1">Manage notifications</a></p>
              </div>
            </div>
          `
        })
      })
    );

    await Promise.all(emailPromises);

    return NextResponse.json({ success: true, sent: users.length });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}