import { z } from "zod";
import { requireUser } from "@/lib/api/auth";
import { dbError, idParam } from "@/lib/api/db";
import { handle, notFound, parseBody } from "@/lib/api/http";
import { emailLayout, escapeHtml, sendEmail } from "@/lib/email";

const TYPES = {
  document_uploaded: { label: "New document uploaded", color: "#6366F1" },
  document_submitted: { label: "Document submitted for review", color: "#3B82F6" },
  document_approved: { label: "Document approved", color: "#10B981" },
  document_rejected: { label: "Document rejected", color: "#EF4444" },
} as const;

const schema = z.object({
  type: z.enum(Object.keys(TYPES) as [keyof typeof TYPES, ...(keyof typeof TYPES)[]]),
  document_id: z.string(),
});

// Emails a document event to the people who should know about it. The caller only
// names the document; recipients and content come from data the caller can read,
// so nothing can be sent outside the organisation or to arbitrary addresses (AZB-03).
export const POST = handle(async (req: Request) => {
  const ctx = await requireUser(req);
  const body = await parseBody(req, schema);
  const id = idParam(body.document_id);

  const { data: doc, error } = await ctx.db.from("documents")
    .select("id, study_id, user_id, custom_file_name, file_name, artifact_name, zone, rejection_reason")
    .eq("id", id).maybeSingle();
  if (error) throw dbError(error);
  if (!doc) throw notFound();

  const { data: members, error: rpcErr } = await ctx.db.rpc("study_notification_recipients", { p_study_code: doc.study_id });
  if (rpcErr) throw dbError(rpcErr);
  const to = new Set<string>((members ?? []).map((m: { email: string }) => m.email.toLowerCase()));

  // The uploader always hears about decisions on their document (same organisation only).
  if (body.type === "document_approved" || body.type === "document_rejected") {
    const { data: uploader } = await ctx.db.from("user_roles").select("email, is_active")
      .eq("user_id", doc.user_id).eq("org_id", ctx.orgId).maybeSingle();
    if (uploader?.email && uploader.is_active) to.add(uploader.email.toLowerCase());
  }

  const t = TYPES[body.type];
  const name = doc.custom_file_name || doc.file_name || doc.artifact_name || "Document";
  const subject = `${t.label}: ${name}`;
  const rows: [string, unknown][] = [
    ["Document", name], ["Artifact", doc.artifact_name], ["Zone", doc.zone], ["Study", doc.study_id], ["Action by", ctx.user.email],
  ];
  if (body.type === "document_rejected" && doc.rejection_reason) rows.push(["Reason", doc.rejection_reason]);
  const html = emailLayout(subject, `
    <p style="color:${t.color};font-weight:700;font-size:13px">${escapeHtml(t.label)}</p>
    <table style="width:100%;border-collapse:collapse;background:#F9FAFB">
      ${rows.map(([k, v]) => `<tr><td style="padding:8px 14px;font-size:12px;color:#6B7280;border-bottom:1px solid #E5E7EB"><strong>${escapeHtml(k)}:</strong> ${escapeHtml(v ?? "")}</td></tr>`).join("")}
    </table>`);

  const results = await Promise.all([...to].map((addr) => sendEmail(addr, subject, html)));
  return Response.json({ recipients: to.size, sent: results.filter(Boolean).length });
});
