// Server-side email via Resend. All user-supplied text must go through escapeHtml
// before it is placed in an email body.

// onboarding@resend.dev only delivers to the Resend account owner; set EMAIL_FROM
// to an address on a domain verified in Resend for real delivery.
const FROM = process.env.EMAIL_FROM || "TMF360 <onboarding@resend.dev>";

export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Sends one email. Returns false (without throwing) when email is not configured or Resend rejects it. */
export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ from: FROM, to, subject, html }),
    });
    if (!res.ok) console.error("Resend rejected email:", res.status, await res.text().catch(() => ""));
    return res.ok;
  } catch (e) {
    console.error("Email send failed:", e);
    return false;
  }
}

/** Shared TMF360 email layout. `bodyHtml` must already be escaped. */
export function emailLayout(title: string, bodyHtml: string): string {
  return `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;background:#fff;border:1px solid #E5E7EB;border-radius:12px;overflow:hidden">
  <div style="background:#1E1B4B;padding:24px 32px"><h1 style="color:#fff;font-size:20px;margin:0">TMF<span style="color:#F97316">360</span></h1></div>
  <div style="padding:28px 32px"><h2 style="color:#111827;font-size:16px;margin:0 0 12px">${escapeHtml(title)}</h2>${bodyHtml}</div>
</div>`;
}
