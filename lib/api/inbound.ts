// Part 14e — intake email (STG-02/03, D51). The mail provider posts each received message to
// /api/inbound/email as JSON, signed with HMAC-SHA256 over "<timestamp>.<raw body>" using
// INBOUND_EMAIL_SECRET. Addresses are <alias>@INBOUND_EMAIL_DOMAIN. Accepted attachments are stored
// and become Document Intake items (source "email"); everything else is refused and logged.
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { emailLayout, escapeHtml, sendEmail } from "../email";
import { serviceClient } from "./service";

export const inboundDomain = () => (process.env.INBOUND_EMAIL_DOMAIN || "").toLowerCase();
const MAX_ATTACHMENTS = 20;
const MAX_BYTES = 30 * 1024 * 1024;
const ALLOWED_EXT = /\.(pdf|docx?|xlsx?|pptx?|txt|csv|png|jpe?g|tiff?)$/i;

export const messageSchema = z.object({
  message_id: z.string().max(500).optional(),
  to: z.union([z.string(), z.array(z.string())]),
  from: z.string().max(500),
  subject: z.string().max(1000).optional(),
  attachments: z.array(z.object({
    filename: z.string().min(1).max(300),
    content_type: z.string().max(200).optional(),
    content_base64: z.string().optional(),
    url: z.string().url().optional(),
  })).max(50).default([]),
});
export type InboundMessage = z.infer<typeof messageSchema>;

/** Verifies the provider signature (and a 5-minute timestamp window against replay). */
export function verifySignature(rawBody: string, timestamp: string | null, signature: string | null, now = Date.now()): boolean {
  const secret = process.env.INBOUND_EMAIL_SECRET;
  if (!secret || !timestamp || !signature) return false;
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(now - ts * 1000) > 5 * 60 * 1000) return false;
  const expected = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
  const got = signature.replace(/^sha256=/, "");
  return got.length === expected.length && timingSafeEqual(Buffer.from(got), Buffer.from(expected));
}

const emailOf = (s: string) => (/<([^>]+)>/.exec(s)?.[1] ?? s).trim().toLowerCase();
const automated = (sender: string) => /^(no-?reply|mailer-daemon|postmaster|bounce)/i.test(sender.split("@")[0] ?? "");

async function attachmentBytes(a: InboundMessage["attachments"][number]): Promise<Uint8Array | null> {
  if (a.content_base64) return new Uint8Array(Buffer.from(a.content_base64, "base64"));
  if (a.url && a.url.startsWith("https://")) {
    const res = await fetch(a.url);
    if (!res.ok) return null;
    const len = Number(res.headers.get("content-length") ?? 0);
    if (len > MAX_BYTES) return null;
    return new Uint8Array(await res.arrayBuffer());
  }
  return null;
}

export type InboundResult = { study?: string; status: "accepted" | "refused" | "ignored" | "duplicate"; reason?: string; items?: number };

/** Processes one message for every TMF360 study address it was sent to. */
export async function processMessage(m: InboundMessage): Promise<InboundResult[]> {
  const svc = serviceClient();
  const domain = inboundDomain();
  const sender = emailOf(m.from);
  const recipients = (Array.isArray(m.to) ? m.to : m.to.split(",")).map(emailOf).filter((r) => domain && r.endsWith(`@${domain}`));
  if (!recipients.length) return [{ status: "ignored", reason: "No TMF360 study address among the recipients" }];
  const out: InboundResult[] = [];
  for (const rcpt of recipients) {
    const alias = rcpt.split("@")[0];
    const { data: addr } = await svc.from("study_intake_addresses").select("study_id, org_id, enabled, studies(study_id)").eq("alias", alias).maybeSingle();
    if (!addr || !addr.enabled) { out.push({ status: "ignored", reason: `Unknown or disabled address ${rcpt}` }); continue; }
    const studyCode = (addr.studies as unknown as { study_id: string }).study_id;
    if (m.message_id) {
      const { data: seen } = await svc.from("intake_email_log").select("id").eq("study_id", addr.study_id).eq("message_id", m.message_id).maybeSingle();
      if (seen) { out.push({ study: studyCode, status: "duplicate" }); continue; }
    }
    const log = async (status: "accepted" | "refused", reason: string | null, items: number) =>
      svc.from("intake_email_log").insert([{ org_id: addr.org_id, study_id: addr.study_id, message_id: m.message_id ?? null, sender, subject: m.subject ?? null,
        status, reason, attachments: m.attachments.length, items_created: items }]);

    const { data: allowed } = await svc.from("intake_allowed_senders").select("sender").eq("study_id", addr.study_id).is("removed_at", null);
    const ok = (allowed ?? []).some((a) => { const s = a.sender.toLowerCase(); return s.includes("@") ? s === sender : sender.endsWith(`@${s}`); });
    if (!ok) {
      await log("refused", "Sender not on the study's allow-list", 0);
      if (!automated(sender)) {
        await sendEmail(sender, `Documents for ${studyCode} were not accepted`, emailLayout("Your documents were not accepted",
          `<p style="color:#374151;font-size:14px">Your message "${escapeHtml(m.subject ?? "(no subject)")}" to ${escapeHtml(rcpt)} was not accepted because your address is not authorised to submit documents for this study.</p>
           <p style="color:#374151;font-size:14px">Submission guidelines: ask the study's TMF team to add your address, then send each document as a PDF or Office attachment, one document per file, with a clear title in the file name.</p>`));
      }
      out.push({ study: studyCode, status: "refused", reason: "Sender not allowed" });
      continue;
    }

    let created = 0;
    const problems: string[] = [];
    for (const a of m.attachments.slice(0, MAX_ATTACHMENTS)) {
      if (!ALLOWED_EXT.test(a.filename)) { problems.push(`${a.filename}: file type not accepted`); continue; }
      const bytes = await attachmentBytes(a).catch(() => null);
      if (!bytes || bytes.length > MAX_BYTES) { problems.push(`${a.filename}: missing or too large`); continue; }
      const hash = createHash("sha256").update(bytes).digest("hex");
      const ext = a.filename.split(".").pop()!.toLowerCase();
      const path = `${addr.org_id}/${studyCode}/${hash}.${ext}`;
      const up = await svc.storage.from("Documents").upload(path, bytes, { contentType: a.content_type || "application/octet-stream", upsert: false });
      if (up.error && !/exists/i.test(up.error.message)) { problems.push(`${a.filename}: could not be stored`); continue; }
      const { error } = await svc.from("intake_items").insert([{ org_id: addr.org_id, study_id: addr.study_id, file_path: path, file_name: a.filename.slice(0, 300),
        file_type: a.content_type ?? null, file_size_bytes: bytes.length, file_hash: hash, verification_status: "verified",
        source: "email", email_from: sender, email_subject: (m.subject ?? "").slice(0, 1000) || null, email_received_at: new Date().toISOString() }]);
      if (error) problems.push(`${a.filename}: ${error.message}`); else created++;
    }
    if (m.attachments.length > MAX_ATTACHMENTS) problems.push(`Only the first ${MAX_ATTACHMENTS} attachments were taken`);
    if (!m.attachments.length) problems.push("No attachments");
    await log("accepted", problems.length ? problems.join("; ").slice(0, 2000) : null, created);
    out.push({ study: studyCode, status: "accepted", items: created, reason: problems.join("; ") || undefined });
  }
  return out;
}
