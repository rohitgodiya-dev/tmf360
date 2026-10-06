import { z } from "zod";
import { requirePermission, requireUser } from "@/lib/api/auth";
import { dbError, loadStudy, reason } from "@/lib/api/db";
import { handle, invalidRequest, parseBody } from "@/lib/api/http";
import { inboundDomain } from "@/lib/api/inbound";

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("set_address"), alias: z.string().trim().toLowerCase().regex(/^[a-z0-9][a-z0-9-]{2,40}$/, "3–41 letters, digits or dashes"), enabled: z.boolean(), reason }).strict(),
  z.object({ action: z.literal("add_sender"), sender: z.string().trim().toLowerCase().regex(/^([^@\s]+@)?[a-z0-9.-]+\.[a-z]{2,}$/, "An email address or a domain such as example.com"), reason }).strict(),
  z.object({ action: z.literal("remove_sender"), id: z.string().uuid(), reason }).strict(),
]);

// STG-02/03: the study's intake email address, the sender allow-list and the received-mail log.
export const GET = handle(async (req: Request, { params }: { params: Promise<{ studyId: string }> }) => {
  const ctx = await requireUser(req);
  requirePermission(ctx, "upload_document");
  const study = await loadStudy(ctx, (await params).studyId);
  const [addr, senders, log] = await Promise.all([
    ctx.db.from("study_intake_addresses").select("alias, enabled").eq("study_id", study.id).maybeSingle(),
    ctx.db.from("intake_allowed_senders").select("id, sender, created_at").eq("study_id", study.id).is("removed_at", null).order("sender"),
    ctx.db.from("intake_email_log").select("sender, subject, received_at, status, reason, attachments, items_created").eq("study_id", study.id).order("received_at", { ascending: false }).limit(50),
  ]);
  for (const r of [addr, senders, log]) if (r.error) throw dbError(r.error);
  const domain = inboundDomain();
  return Response.json({
    configured: !!domain && !!process.env.INBOUND_EMAIL_SECRET,
    address: addr.data ? { ...addr.data, email: domain ? `${addr.data.alias}@${domain}` : null } : null,
    senders: senders.data ?? [], log: log.data ?? [],
  });
});

export const POST = handle(async (req: Request, { params }: { params: Promise<{ studyId: string }> }) => {
  const ctx = await requireUser(req);
  requirePermission(ctx, "invite_users");
  const study = await loadStudy(ctx, (await params).studyId);
  const b = await parseBody(req, schema);
  if (b.action === "set_address") {
    const { data: existing } = await ctx.db.from("study_intake_addresses").select("id").eq("study_id", study.id).maybeSingle();
    const { error } = existing
      ? await ctx.db.from("study_intake_addresses").update({ alias: b.alias, enabled: b.enabled, change_reason: b.reason }).eq("id", existing.id)
      : await ctx.db.from("study_intake_addresses").insert([{ org_id: study.org_id, study_id: study.id, alias: b.alias, enabled: b.enabled, change_reason: b.reason }]);
    if (error) throw error.code === "23505" ? invalidRequest("That address is already used by another study") : dbError(error);
  } else if (b.action === "add_sender") {
    const { error } = await ctx.db.from("intake_allowed_senders").insert([{ org_id: study.org_id, study_id: study.id, sender: b.sender, change_reason: b.reason }]);
    if (error) throw error.code === "23505" ? invalidRequest("This sender is already allowed") : dbError(error);
  } else {
    const { data, error } = await ctx.db.from("intake_allowed_senders").update({ removed_at: new Date().toISOString(), change_reason: b.reason }).eq("id", b.id).eq("study_id", study.id).is("removed_at", null).select("id").maybeSingle();
    if (error) throw dbError(error);
    if (!data) throw invalidRequest("Sender not found");
  }
  return Response.json({ ok: true });
});
