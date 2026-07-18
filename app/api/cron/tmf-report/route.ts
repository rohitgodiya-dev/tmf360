import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function sendEmail(to: string, subject: string, html: string) {
  return fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${process.env.RESEND_API_KEY}` },
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
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
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
        `<tr><td style="padding:6px 10px;border-bottom:1px solid #E5E7EB;font-size:12px;">Zone ${z}</td><td style="padding:6px 10px;border-bottom:1px solid #E5E7EB;font-size:12px;color:#EF4444;">${arts.length} missing</td></tr>`
      ).join("");

      const expiringRows = expiring.slice(0, 5).map((d: any) => {
        const daysLeft = Math.ceil((new Date(d.expiry_date).getTime() - now.getTime()) / 86400000);
        return `<tr><td style="padding:6px 10px;border-bottom:1px solid #E5E7EB;font-size:12px;">${d.artifact_name}</td><td style="padding:6px 10px;border-bottom:1px solid #E5E7EB;font-size:12px;color:#F59E0B;">${daysLeft} days</td></tr>`;
      }).join("");

      const html = `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;border:1px solid #E5E7EB;border-radius:12px;overflow:hidden">
  <div style="background:#1E1B4B;padding:24px 32px">
    <h1 style="color:#fff;font-size:20px;margin:0">TMF<span style="color:#F97316">360</span></h1>
    <p style="color:#A5B4FC;font-size:11px;margin:4px 0 0">${pref.report_frequency} TMF Report</p>
  </div>
  <div style="padding:28px 32px">
    <p style="font-size:13px;color:#374151;">Hi ${userRole.full_name||userRole.email},</p>
    <p style="font-size:13px;color:#374151;">Here is your ${pref.report_frequency.toLowerCase()} TMF summary for <strong>${studies.map((s:any)=>s.study_id).join(", ")}</strong>.</p>
    
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin:20px 0;">
      <div style="background:#EFF6FF;border-radius:8px;padding:12px;text-align:center;">
        <div style="font-size:24px;font-weight:700;color:#3B82F6;">${approved}</div>
        <div style="font-size:11px;color:#6B7280;">Approved</div>
      </div>
      <div style="background:#FEF2F2;border-radius:8px;padding:12px;text-align:center;">
        <div style="font-size:24px;font-weight:700;color:#EF4444;">${missing.length}</div>
        <div style="font-size:11px;color:#6B7280;">Missing Core</div>
      </div>
      <div style="background:#FFFBEB;border-radius:8px;padding:12px;text-align:center;">
        <div style="font-size:24px;font-weight:700;color:#F59E0B;">${pending}</div>
        <div style="font-size:11px;color:#6B7280;">Pending Review</div>
      </div>
    </div>

    ${missing.length > 0 ? `
    <h3 style="font-size:13px;color:#111;margin:20px 0 8px;">Top Missing Gaps by Zone</h3>
    <table style="width:100%;border-collapse:collapse;background:#F9FAFB;border-radius:8px;overflow:hidden;">
      <tr style="background:#F3F4F6;"><th style="padding:8px 10px;text-align:left;font-size:11px;">Zone</th><th style="padding:8px 10px;text-align:left;font-size:11px;">Missing</th></tr>
      ${missingZoneRows}
    </table>` : '<p style="color:#10B981;font-size:13px;">✅ No missing core documents!</p>'}

    ${expiring.length > 0 ? `
    <h3 style="font-size:13px;color:#111;margin:20px 0 8px;">Documents Expiring in ${windowDays} Days</h3>
    <table style="width:100%;border-collapse:collapse;background:#F9FAFB;border-radius:8px;overflow:hidden;">
      <tr style="background:#F3F4F6;"><th style="padding:8px 10px;text-align:left;font-size:11px;">Document</th><th style="padding:8px 10px;text-align:left;font-size:11px;">Days Left</th></tr>
      ${expiringRows}
    </table>` : ''}

    ${pending > 0 ? `<p style="font-size:13px;color:#374151;margin-top:16px;">📋 <strong>${pending}</strong> document${pending!==1?"s":""} are currently pending review.</p>` : ''}

    <a href="https://tmf360-gliv.vercel.app/platform" style="background:#F97316;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:700;font-size:13px;display:inline-block;margin-top:16px;">Open TMF360 →</a>
  </div>
  <div style="padding:14px 32px;border-top:1px solid #E5E7EB;background:#F9FAFB;">
    <p style="color:#9CA3AF;font-size:11px;margin:0">© 2025 TMF360 · ${pref.report_frequency} report · Generated ${new Date().toLocaleDateString()}</p>
  </div>
</div>`;

      await sendEmail(userRole.email, `TMF360 ${pref.report_frequency} Report — ${new Date().toLocaleDateString()}`, html);

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
