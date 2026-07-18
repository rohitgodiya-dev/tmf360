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

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
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

        const html = `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;border:1px solid #E5E7EB;border-radius:12px;overflow:hidden">
  <div style="background:#1E1B4B;padding:24px 32px">
    <h1 style="color:#fff;font-size:20px;margin:0">TMF<span style="color:#F97316">360</span></h1>
    <p style="color:#A5B4FC;font-size:11px;margin:4px 0 0">Document Expiry Alert</p>
  </div>
  <div style="padding:28px 32px">
    <div style="background:${color}22;border:1px solid ${color}44;border-radius:8px;padding:10px 14px;margin-bottom:16px;display:inline-block">
      <span style="color:${color};font-weight:700;font-size:13px">⚠️ ${urgency} — ${daysLeft} days until expiry</span>
    </div>
    <h2 style="font-size:16px;color:#111;margin:0 0 16px">${doc.artifact_name}</h2>
    <table style="width:100%;border-collapse:collapse;background:#F9FAFB;border-radius:8px;overflow:hidden;margin-bottom:20px;">
      <tr><td style="padding:8px 14px;font-size:12px;color:#6B7280;border-bottom:1px solid #E5E7EB"><strong>Document:</strong> ${doc.custom_file_name||doc.file_name||doc.artifact_name}</td></tr>
      <tr><td style="padding:8px 14px;font-size:12px;color:#6B7280;border-bottom:1px solid #E5E7EB"><strong>Zone:</strong> ${doc.zone}</td></tr>
      <tr><td style="padding:8px 14px;font-size:12px;color:#6B7280;border-bottom:1px solid #E5E7EB"><strong>Artifact:</strong> ${doc.artifact_num}</td></tr>
      <tr><td style="padding:8px 14px;font-size:12px;color:#6B7280;border-bottom:1px solid #E5E7EB"><strong>Expiry Date:</strong> ${doc.expiry_date}</td></tr>
      <tr><td style="padding:8px 14px;font-size:12px;color:${color}"><strong>Days Remaining:</strong> ${daysLeft} days</td></tr>
    </table>
    <p style="font-size:13px;color:#374151;">Please renew or replace this document before it expires to maintain TMF compliance.</p>
    <a href="https://tmf360-gliv.vercel.app/platform" style="background:#F97316;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:700;font-size:13px;display:inline-block">View in TMF360 →</a>
  </div>
  <div style="padding:14px 32px;border-top:1px solid #E5E7EB;background:#F9FAFB;">
    <p style="color:#9CA3AF;font-size:11px;margin:0">© 2025 TMF360 · Document Expiry Notification · ${new Date().toLocaleDateString()}</p>
  </div>
</div>`;

        for (const recipient of allRecipients) {
          await sendEmail(recipient.email, `⚠️ Document expiring in ${daysLeft} days — ${doc.artifact_name}`, html);
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
