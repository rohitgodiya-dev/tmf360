const fs = require('fs');

// Create API directories
['app/api/cron/tmf-report', 'app/api/cron/expiry-check', 'app/api/notification-preferences'].forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, {recursive: true});
});

// 1. Notification preferences API
const prefsRoute = `import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("user_id");
  if (!userId) return NextResponse.json({ error: "user_id required" }, { status: 400 });
  const { data, error } = await supabaseAdmin
    .from("notification_preferences")
    .select("*")
    .eq("user_id", userId)
    .single();
  if (error && error.code !== "PGRST116") return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || { report_frequency: "Off", expiry_window: 30 });
}

export async function POST(req: NextRequest) {
  const { user_id, org_id, report_frequency, expiry_window } = await req.json();
  if (!user_id) return NextResponse.json({ error: "user_id required" }, { status: 400 });
  const { data, error } = await supabaseAdmin
    .from("notification_preferences")
    .upsert({ user_id, org_id, report_frequency, expiry_window, updated_at: new Date().toISOString() }, { onConflict: "user_id" })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
`;

// 2. TMF Report cron
const tmfReportCron = `import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function sendEmail(to: string, subject: string, html: string) {
  return fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": \`Bearer \${process.env.RESEND_API_KEY}\` },
    body: JSON.stringify({ from: "TMF360 <onboarding@resend.dev>", to, subject, html })
  });
}

function shouldSendReport(freq: string, lastSent: string | null): boolean {
  if (freq === "Off") return false;
  if (!lastSent) return true;
  const last = new Date(lastSent);
  const now = new Date();
  const daysDiff = Math.floor((now.getTime() - last.getTime()) / 86400000);
  if (freq === "Weekly") return daysDiff >= 7;
  if (freq === "Bi-weekly") return daysDiff >= 14;
  if (freq === "Monthly") return daysDiff >= 30;
  return false;
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== \`Bearer \${process.env.CRON_SECRET}\`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get all eligible users
    const { data: prefs } = await supabaseAdmin
      .from("notification_preferences")
      .select("*")
      .neq("report_frequency", "Off");

    if (!prefs || prefs.length === 0) return NextResponse.json({ sent: 0 });

    let sent = 0;

    for (const pref of prefs) {
      if (!shouldSendReport(pref.report_frequency, pref.last_report_sent)) continue;

      // Get user email
      const { data: userRole } = await supabaseAdmin
        .from("user_roles")
        .select("email, full_name, role")
        .eq("user_id", pref.user_id)
        .eq("is_active", true)
        .single();

      if (!userRole) continue;
      if (!["System Administrator","Sponsor Admin","TMF Lead"].includes(userRole.role)) continue;

      // Get studies for this org
      const { data: studies } = await supabaseAdmin
        .from("studies")
        .select("*")
        .eq("org_id", pref.org_id);

      if (!studies || studies.length === 0) continue;

      // Get docs for this org
      const { data: docs } = await supabaseAdmin
        .from("documents")
        .select("*")
        .eq("org_id", pref.org_id);

      const allDocs = docs || [];
      const approved = allDocs.filter((d: any) => d.status === "Approved").length;
      const pending = allDocs.filter((d: any) => d.status === "Under Review").length;
      const now = new Date();
      const windowDays = pref.expiry_window || 30;
      const expiring = allDocs.filter((d: any) => {
        if (!d.expiry_date) return false;
        const exp = new Date(d.expiry_date);
        const daysLeft = Math.ceil((exp.getTime() - now.getTime()) / 86400000);
        return daysLeft >= 0 && daysLeft <= windowDays;
      });

      // Get tmf config to calculate missing
      const { data: tmfConfig } = await supabaseAdmin
        .from("tmf_config")
        .select("*")
        .eq("org_id", pref.org_id)
        .eq("is_enabled", true)
        .eq("type", "artifact");

      const coreArts = (tmfConfig || []).filter((a: any) => a.classification === "Core");
      const filedNums = allDocs.filter((d: any) => d.status === "Approved").map((d: any) => d.artifact_num);
      const missing = coreArts.filter((a: any) => !filedNums.includes(a.artifact_num));

      // Build missing by zone
      const missingByZone: Record<string, any[]> = {};
      missing.forEach((a: any) => {
        if (!missingByZone[a.zone_num]) missingByZone[a.zone_num] = [];
        missingByZone[a.zone_num].push(a);
      });

      const missingZoneRows = Object.entries(missingByZone).slice(0, 5).map(([z, arts]: [string, any[]]) =>
        \`<tr><td style="padding:6px 10px;border-bottom:1px solid #E5E7EB;font-size:12px;">Zone \${z}</td><td style="padding:6px 10px;border-bottom:1px solid #E5E7EB;font-size:12px;color:#EF4444;">\${arts.length} missing</td></tr>\`
      ).join("");

      const expiringRows = expiring.slice(0, 5).map((d: any) => {
        const daysLeft = Math.ceil((new Date(d.expiry_date).getTime() - now.getTime()) / 86400000);
        return \`<tr><td style="padding:6px 10px;border-bottom:1px solid #E5E7EB;font-size:12px;">\${d.artifact_name}</td><td style="padding:6px 10px;border-bottom:1px solid #E5E7EB;font-size:12px;color:#F59E0B;">\${daysLeft} days</td></tr>\`;
      }).join("");

      const html = \`
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;border:1px solid #E5E7EB;border-radius:12px;overflow:hidden">
  <div style="background:#1E1B4B;padding:24px 32px">
    <h1 style="color:#fff;font-size:20px;margin:0">TMF<span style="color:#F97316">360</span></h1>
    <p style="color:#A5B4FC;font-size:11px;margin:4px 0 0">\${pref.report_frequency} TMF Report</p>
  </div>
  <div style="padding:28px 32px">
    <p style="font-size:13px;color:#374151;">Hi \${userRole.full_name||userRole.email},</p>
    <p style="font-size:13px;color:#374151;">Here is your \${pref.report_frequency.toLowerCase()} TMF summary for <strong>\${studies.map((s:any)=>s.study_id).join(", ")}</strong>.</p>
    
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin:20px 0;">
      <div style="background:#EFF6FF;border-radius:8px;padding:12px;text-align:center;">
        <div style="font-size:24px;font-weight:700;color:#3B82F6;">\${approved}</div>
        <div style="font-size:11px;color:#6B7280;">Approved</div>
      </div>
      <div style="background:#FEF2F2;border-radius:8px;padding:12px;text-align:center;">
        <div style="font-size:24px;font-weight:700;color:#EF4444;">\${missing.length}</div>
        <div style="font-size:11px;color:#6B7280;">Missing Core</div>
      </div>
      <div style="background:#FFFBEB;border-radius:8px;padding:12px;text-align:center;">
        <div style="font-size:24px;font-weight:700;color:#F59E0B;">\${pending}</div>
        <div style="font-size:11px;color:#6B7280;">Pending Review</div>
      </div>
    </div>

    \${missing.length > 0 ? \`
    <h3 style="font-size:13px;color:#111;margin:20px 0 8px;">Top Missing Gaps by Zone</h3>
    <table style="width:100%;border-collapse:collapse;background:#F9FAFB;border-radius:8px;overflow:hidden;">
      <tr style="background:#F3F4F6;"><th style="padding:8px 10px;text-align:left;font-size:11px;">Zone</th><th style="padding:8px 10px;text-align:left;font-size:11px;">Missing</th></tr>
      \${missingZoneRows}
    </table>\` : '<p style="color:#10B981;font-size:13px;">✅ No missing core documents!</p>'}

    \${expiring.length > 0 ? \`
    <h3 style="font-size:13px;color:#111;margin:20px 0 8px;">Documents Expiring in \${windowDays} Days</h3>
    <table style="width:100%;border-collapse:collapse;background:#F9FAFB;border-radius:8px;overflow:hidden;">
      <tr style="background:#F3F4F6;"><th style="padding:8px 10px;text-align:left;font-size:11px;">Document</th><th style="padding:8px 10px;text-align:left;font-size:11px;">Days Left</th></tr>
      \${expiringRows}
    </table>\` : ''}

    \${pending > 0 ? \`<p style="font-size:13px;color:#374151;margin-top:16px;">📋 <strong>\${pending}</strong> document\${pending!==1?"s":""} are currently pending review.</p>\` : ''}

    <a href="https://tmf360-gliv.vercel.app/platform" style="background:#F97316;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:700;font-size:13px;display:inline-block;margin-top:16px;">Open TMF360 →</a>
  </div>
  <div style="padding:14px 32px;border-top:1px solid #E5E7EB;background:#F9FAFB;">
    <p style="color:#9CA3AF;font-size:11px;margin:0">© 2025 TMF360 · \${pref.report_frequency} report · Generated \${new Date().toLocaleDateString()}</p>
  </div>
</div>\`;

      await sendEmail(userRole.email, \`TMF360 \${pref.report_frequency} Report — \${new Date().toLocaleDateString()}\`, html);

      // Update last_report_sent
      await supabaseAdmin.from("notification_preferences")
        .update({ last_report_sent: new Date().toISOString() })
        .eq("user_id", pref.user_id);

      sent++;
    }

    return NextResponse.json({ sent });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
`;

// 3. Expiry check cron
const expiryCron = `import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function sendEmail(to: string, subject: string, html: string) {
  return fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": \`Bearer \${process.env.RESEND_API_KEY}\` },
    body: JSON.stringify({ from: "TMF360 <onboarding@resend.dev>", to, subject, html })
  });
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== \`Bearer \${process.env.CRON_SECRET}\`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    const thresholds = [90, 30, 15];

    // Get all docs with expiry dates
    const { data: docs } = await supabaseAdmin
      .from("documents")
      .select("*")
      .not("expiry_date", "is", null);

    if (!docs || docs.length === 0) return NextResponse.json({ sent: 0 });

    let sent = 0;

    for (const doc of docs) {
      const expDate = new Date(doc.expiry_date);
      const daysLeft = Math.ceil((expDate.getTime() - now.getTime()) / 86400000);

      for (const threshold of thresholds) {
        // Check if exactly at threshold (within 1 day window)
        if (daysLeft > threshold || daysLeft < threshold - 1) continue;

        // Check if already sent
        const { data: existing } = await supabaseAdmin
          .from("notification_log")
          .select("id")
          .eq("document_id", doc.id)
          .eq("threshold_days", threshold)
          .single();

        if (existing) continue;

        // Get recipients: owner + TMF Lead + Sponsor Admin for this org
        const { data: recipients } = await supabaseAdmin
          .from("user_roles")
          .select("email, full_name, role")
          .eq("org_id", doc.org_id)
          .eq("is_active", true)
          .in("role", ["System Administrator", "Sponsor Admin", "TMF Lead"]);

        // Also notify document owner by email if they have an account
        const ownerEmail = doc.owner?.includes("@") ? doc.owner : null;
        const allRecipients = [...(recipients||[])];
        if (ownerEmail && !allRecipients.find(r => r.email === ownerEmail)) {
          allRecipients.push({ email: ownerEmail, full_name: doc.owner, role: "Owner" });
        }

        const color = daysLeft <= 15 ? "#EF4444" : daysLeft <= 30 ? "#F59E0B" : "#6366F1";
        const urgency = daysLeft <= 15 ? "URGENT" : daysLeft <= 30 ? "WARNING" : "NOTICE";

        const html = \`
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;border:1px solid #E5E7EB;border-radius:12px;overflow:hidden">
  <div style="background:#1E1B4B;padding:24px 32px">
    <h1 style="color:#fff;font-size:20px;margin:0">TMF<span style="color:#F97316">360</span></h1>
    <p style="color:#A5B4FC;font-size:11px;margin:4px 0 0">Document Expiry Alert</p>
  </div>
  <div style="padding:28px 32px">
    <div style="background:\${color}22;border:1px solid \${color}44;border-radius:8px;padding:10px 14px;margin-bottom:16px;display:inline-block">
      <span style="color:\${color};font-weight:700;font-size:13px">⚠️ \${urgency} — \${daysLeft} days until expiry</span>
    </div>
    <h2 style="font-size:16px;color:#111;margin:0 0 16px">\${doc.artifact_name}</h2>
    <table style="width:100%;border-collapse:collapse;background:#F9FAFB;border-radius:8px;overflow:hidden;margin-bottom:20px;">
      <tr><td style="padding:8px 14px;font-size:12px;color:#6B7280;border-bottom:1px solid #E5E7EB"><strong>Document:</strong> \${doc.custom_file_name||doc.file_name||doc.artifact_name}</td></tr>
      <tr><td style="padding:8px 14px;font-size:12px;color:#6B7280;border-bottom:1px solid #E5E7EB"><strong>Zone:</strong> \${doc.zone}</td></tr>
      <tr><td style="padding:8px 14px;font-size:12px;color:#6B7280;border-bottom:1px solid #E5E7EB"><strong>Artifact:</strong> \${doc.artifact_num}</td></tr>
      <tr><td style="padding:8px 14px;font-size:12px;color:#6B7280;border-bottom:1px solid #E5E7EB"><strong>Expiry Date:</strong> \${doc.expiry_date}</td></tr>
      <tr><td style="padding:8px 14px;font-size:12px;color:\${color}"><strong>Days Remaining:</strong> \${daysLeft} days</td></tr>
    </table>
    <p style="font-size:13px;color:#374151;">Please renew or replace this document before it expires to maintain TMF compliance.</p>
    <a href="https://tmf360-gliv.vercel.app/platform" style="background:#F97316;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:700;font-size:13px;display:inline-block">View in TMF360 →</a>
  </div>
  <div style="padding:14px 32px;border-top:1px solid #E5E7EB;background:#F9FAFB;">
    <p style="color:#9CA3AF;font-size:11px;margin:0">© 2025 TMF360 · Document Expiry Notification · \${new Date().toLocaleDateString()}</p>
  </div>
</div>\`;

        for (const recipient of allRecipients) {
          await sendEmail(recipient.email, \`⚠️ Document expiring in \${daysLeft} days — \${doc.artifact_name}\`, html);
          sent++;
        }

        // Log that we sent this threshold
        await supabaseAdmin.from("notification_log").insert([{
          document_id: doc.id,
          org_id: doc.org_id,
          threshold_days: threshold,
          sent_at: new Date().toISOString()
        }]);
      }
    }

    return NextResponse.json({ sent });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
`;

fs.writeFileSync('app/api/notification-preferences/route.ts', prefsRoute);
fs.writeFileSync('app/api/cron/tmf-report/route.ts', tmfReportCron);
fs.writeFileSync('app/api/cron/expiry-check/route.ts', expiryCron);
console.log('API routes created');

// Update notify route to handle approval/rejection with proper recipients
const notifyRoute = `import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function sendEmail(to: string, subject: string, html: string) {
  return fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${process.env.RESEND_API_KEY}\` },
    body: JSON.stringify({ from: 'TMF360 <onboarding@resend.dev>', to, subject, html })
  });
}

function buildEmailHtml(subject: string, color: string, icon: string, type: string, document_name: string, artifact_name: string, zone: string, study_id: string, action_by: string, rejection_reason?: string) {
  return \`
<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;background:#fff;border:1px solid #E5E7EB;border-radius:12px;overflow:hidden">
  <div style="background:#1E1B4B;padding:24px 32px">
    <h1 style="color:#fff;font-size:20px;margin:0">TMF<span style="color:#F97316">360</span></h1>
    <p style="color:#A5B4FC;font-size:11px;margin:4px 0 0">Document Notification</p>
  </div>
  <div style="padding:28px 32px">
    <div style="background:\${color}22;border:1px solid \${color}44;border-radius:8px;padding:8px 14px;margin-bottom:16px;display:inline-block">
      <span style="color:\${color};font-weight:700;font-size:13px">\${icon} \${type.replace(/_/g,' ').replace(/\\b\\w/g,(l:string)=>l.toUpperCase())}</span>
    </div>
    <h2 style="color:#111827;font-size:16px;margin:0 0 12px">\${subject}</h2>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;background:#F9FAFB;border-radius:8px;overflow:hidden">
      <tr><td style="padding:8px 14px;font-size:12px;color:#6B7280;border-bottom:1px solid #E5E7EB"><strong>Document:</strong> \${document_name}</td></tr>
      <tr><td style="padding:8px 14px;font-size:12px;color:#6B7280;border-bottom:1px solid #E5E7EB"><strong>Artifact:</strong> \${artifact_name}</td></tr>
      <tr><td style="padding:8px 14px;font-size:12px;color:#6B7280;border-bottom:1px solid #E5E7EB"><strong>Zone:</strong> \${zone}</td></tr>
      <tr><td style="padding:8px 14px;font-size:12px;color:#6B7280;border-bottom:1px solid #E5E7EB"><strong>Study:</strong> \${study_id}</td></tr>
      <tr><td style="padding:8px 14px;font-size:12px;color:#6B7280"><strong>Action by:</strong> \${action_by}</td></tr>
      \${rejection_reason ? \`<tr><td style="padding:8px 14px;font-size:12px;color:#991B1B;background:#FEF2F2"><strong>Reason:</strong> \${rejection_reason}</td></tr>\` : ''}
    </table>
    <a href="https://tmf360-gliv.vercel.app/platform" style="background:\${color};color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:700;font-size:13px;display:inline-block">View in TMF360 →</a>
  </div>
  <div style="padding:14px 32px;border-top:1px solid #E5E7EB;background:#F9FAFB;">
    <p style="color:#9CA3AF;font-size:11px;margin:0">© 2025 TMF360 · You received this because you are a team member · <a href="https://tmf360-gliv.vercel.app/platform" style="color:#6366F1">Manage notifications</a></p>
  </div>
</div>\`;
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
      document_uploaded: \`New document uploaded — \${document_name}\`,
      document_submitted: \`Document submitted for review — \${document_name}\`,
      document_approved: \`Document approved — \${document_name}\`,
      document_rejected: \`Document rejected — \${document_name}\`,
      document_expiring: \`Document expiring soon — \${document_name}\`,
    };

    const color = colors[type] || '#6366F1';
    const icon = icons[type] || '📄';
    const subject = subjects[type] || \`TMF360 — \${document_name}\`;

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
`;

fs.writeFileSync('app/api/notify/route.ts', notifyRoute);
console.log('Notify route updated');

// Create vercel.json for cron jobs
const vercelJson = {
  "crons": [
    { "path": "/api/cron/tmf-report", "schedule": "0 8 * * 1" },
    { "path": "/api/cron/expiry-check", "schedule": "0 7 * * *" }
  ]
};

// Check if vercel.json exists and merge
let existingVercel = {};
if (fs.existsSync('vercel.json')) {
  existingVercel = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
}
const merged = { ...existingVercel, ...vercelJson };
fs.writeFileSync('vercel.json', JSON.stringify(merged, null, 2));
console.log('vercel.json updated with cron jobs');

console.log('Done - now need to add CRON_SECRET to Vercel env vars and add notification preferences UI to Profile panel');
