import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function sendEmail(to: string, subject: string, html: string) {
  return fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.RESEND_API_KEY}` },
    body: JSON.stringify({ from: 'TMF360 <onboarding@resend.dev>', to, subject, html })
  });
}

function buildEmailHtml(subject: string, color: string, icon: string, type: string, document_name: string, artifact_name: string, zone: string, study_id: string, action_by: string, rejection_reason?: string) {
  return `
<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;background:#fff;border:1px solid #E5E7EB;border-radius:12px;overflow:hidden">
  <div style="background:#1E1B4B;padding:24px 32px">
    <h1 style="color:#fff;font-size:20px;margin:0">TMF<span style="color:#F97316">360</span></h1>
    <p style="color:#A5B4FC;font-size:11px;margin:4px 0 0">Document Notification</p>
  </div>
  <div style="padding:28px 32px">
    <div style="background:${color}22;border:1px solid ${color}44;border-radius:8px;padding:8px 14px;margin-bottom:16px;display:inline-block">
      <span style="color:${color};font-weight:700;font-size:13px">${icon} ${type.replace(/_/g,' ').replace(/\b\w/g,(l:string)=>l.toUpperCase())}</span>
    </div>
    <h2 style="color:#111827;font-size:16px;margin:0 0 12px">${subject}</h2>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;background:#F9FAFB;border-radius:8px;overflow:hidden">
      <tr><td style="padding:8px 14px;font-size:12px;color:#6B7280;border-bottom:1px solid #E5E7EB"><strong>Document:</strong> ${document_name}</td></tr>
      <tr><td style="padding:8px 14px;font-size:12px;color:#6B7280;border-bottom:1px solid #E5E7EB"><strong>Artifact:</strong> ${artifact_name}</td></tr>
      <tr><td style="padding:8px 14px;font-size:12px;color:#6B7280;border-bottom:1px solid #E5E7EB"><strong>Zone:</strong> ${zone}</td></tr>
      <tr><td style="padding:8px 14px;font-size:12px;color:#6B7280;border-bottom:1px solid #E5E7EB"><strong>Study:</strong> ${study_id}</td></tr>
      <tr><td style="padding:8px 14px;font-size:12px;color:#6B7280"><strong>Action by:</strong> ${action_by}</td></tr>
      ${rejection_reason ? `<tr><td style="padding:8px 14px;font-size:12px;color:#991B1B;background:#FEF2F2"><strong>Reason:</strong> ${rejection_reason}</td></tr>` : ''}
    </table>
    <a href="https://tmf360-gliv.vercel.app/platform" style="background:${color};color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:700;font-size:13px;display:inline-block">View in TMF360 →</a>
  </div>
  <div style="padding:14px 32px;border-top:1px solid #E5E7EB;background:#F9FAFB;">
    <p style="color:#9CA3AF;font-size:11px;margin:0">© 2025 TMF360 · You received this because you are a team member · <a href="https://tmf360-gliv.vercel.app/platform" style="color:#6366F1">Manage notifications</a></p>
  </div>
</div>`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, document_name, artifact_name, zone, study_id, uploaded_by, org_id, uploader_email, rejection_reason } = body;

    const colors: Record<string, string> = {
      document_uploaded: '#6366F1', document_submitted: '#3B82F6',
      document_approved: '#10B981', document_rejected: '#EF4444', document_expiring: '#F59E0B',
    };
    const icons: Record<string, string> = {
      document_uploaded: '📄', document_submitted: '📋',
      document_approved: '✅', document_rejected: '❌', document_expiring: '⚠️',
    };
    const subjects: Record<string, string> = {
      document_uploaded: `New document uploaded — ${document_name}`,
      document_submitted: `Document submitted for review — ${document_name}`,
      document_approved: `Document approved — ${document_name}`,
      document_rejected: `Document rejected — ${document_name}`,
      document_expiring: `Document expiring soon — ${document_name}`,
    };

    const color = colors[type] || '#6366F1';
    const icon = icons[type] || '📄';
    const subject = subjects[type] || `TMF360 — ${document_name}`;

    let recipientQuery = supabaseAdmin.from('user_roles').select('email, full_name, role').eq('is_active', true).eq('notifications_enabled', true);
    if (org_id) recipientQuery = recipientQuery.eq('org_id', org_id);

    // For approval/rejection: notify uploader specifically
    // For upload/submit: notify TMF Lead + Sponsor Admin + System Admin
    let { data: users } = await recipientQuery;
    if (!users) users = [];

    // On rejection: also always notify the uploader even if notifications off
    if (type === 'document_rejected' && uploader_email) {
      if (!users.find((u: any) => u.email === uploader_email)) {
        users.push({ email: uploader_email, full_name: '', role: 'Uploader' });
      }
    }

    // On approval: notify uploader
    if (type === 'document_approved' && uploader_email) {
      if (!users.find((u: any) => u.email === uploader_email)) {
        users.push({ email: uploader_email, full_name: '', role: 'Uploader' });
      }
    }

    const html = buildEmailHtml(subject, color, icon, type, document_name, artifact_name, zone, study_id, uploaded_by, rejection_reason);

    await Promise.all(users.map((u: any) => sendEmail(u.email, subject, html)));
    return NextResponse.json({ success: true, sent: users.length });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
