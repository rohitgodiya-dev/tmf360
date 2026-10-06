import { z } from "zod";
import { requirePermission, requireUser } from "@/lib/api/auth";
import { dbError, isoDate, loadStudy } from "@/lib/api/db";
import { handle, notFound, parseBody } from "@/lib/api/http";
import { emailLayout, escapeHtml, sendEmail } from "@/lib/email";
import { hasPermission } from "@/lib/permissions";

type Params = { params: Promise<{ studyId: string }> };
const PROTOCOL_ARTIFACTS = ["02.01.02", "02.01.04"];

type Ack = {
  id: string; amendment_id: string; study_site_id: string; status: string; acknowledged_at: string | null; acknowledged_by_email: string | null;
  acknowledgement_note: string | null; reconsent_count: number; reconsent_completed: boolean;
  site: { site_number: string; display_name: string; status: string; country: { country_code: string } | null } | null;
};

// Protocol amendments of the study with every site's acknowledgement and re-consent progress (Part 19), plus
// Final protocol documents not yet registered as a protocol version, and which sites the caller may act for.
export const GET = handle(async (req: Request, { params }: Params) => {
  const ctx = await requireUser(req);
  const study = await loadStudy(ctx, (await params).studyId);
  const [amendments, acks, docs] = await Promise.all([
    ctx.db.from("protocol_amendments").select("*, document:documents(id, custom_file_name, file_name, artifact_num, artifact_name, version)")
      .eq("study_id", study.id).order("effective_date", { ascending: false }),
    ctx.db.from("amendment_site_acknowledgements")
      .select("id, amendment_id, study_site_id, status, acknowledged_at, acknowledged_by_email, acknowledgement_note, reconsent_count, reconsent_completed, site:study_sites(site_number, display_name, status, country:study_countries(country_code))")
      .eq("study_id", study.id),
    ctx.db.from("documents").select("id, custom_file_name, file_name, artifact_num, artifact_name, version, approved_at")
      .eq("org_id", study.org_id).eq("study_id", study.study_id).in("artifact_num", PROTOCOL_ARTIFACTS).in("status", ["Approved", "Archived"]).is("deleted_at", null)
      .order("approved_at", { ascending: false }),
  ]);
  for (const r of [amendments, acks, docs]) if (r.error) throw dbError(r.error);
  const today = new Date().toISOString().slice(0, 10);
  const allAcks = (acks.data ?? []) as unknown as Ack[];
  const siteIds = [...new Set(allAcks.map((a) => a.study_site_id))];
  const canAct = new Set<string>();
  await Promise.all(siteIds.map(async (id) => {
    const { data } = await ctx.db.rpc("can_act_for_site", { p_site: id });
    if (data) canAct.add(id);
  }));
  const registered = new Set((amendments.data ?? []).map((a) => a.document_id));

  return Response.json({
    amendments: (amendments.data ?? []).map((a) => {
      const sites = allAcks.filter((x) => x.amendment_id === a.id)
        .map((x) => ({ ...x, overdue: x.status === "pending" && a.effective_date < today, can_act: canAct.has(x.study_site_id),
          reconsent_overdue: a.reconsent_required && !x.reconsent_completed && !!a.reconsent_deadline && a.reconsent_deadline < today }))
        .sort((p, q) => (p.site?.site_number ?? "").localeCompare(q.site?.site_number ?? ""));
      return { ...a, sites, counts: {
        total: sites.length, acknowledged: sites.filter((s) => s.status === "acknowledged").length, overdue: sites.filter((s) => s.overdue).length,
        reconsent_completed: sites.filter((s) => s.reconsent_completed).length,
      } };
    }),
    unregistered: (docs.data ?? []).filter((d) => !registered.has(d.id)),
    can_register: hasPermission(ctx.role, "edit_study"),
  });
});

const schema = z.object({
  document_id: z.string().uuid(),
  amendment_number: z.string().trim().min(1).max(50),
  protocol_version: z.string().trim().min(1).max(50),
  effective_date: isoDate,
  reconsent_required: z.boolean().default(false),
  reconsent_deadline: isoDate.nullish(),
  notes: z.string().trim().max(2000).nullish(),
}).refine((b) => !b.reconsent_required || !!b.reconsent_deadline, { message: "Give the re-consent deadline", path: ["reconsent_deadline"] });

// Registers a Final protocol or amendment and cascades acknowledgement tasks to every selected, qualified and
// active site; the sites' current contacts (PI, coordinator, …) are emailed.
export const POST = handle(async (req: Request, { params }: Params) => {
  const ctx = await requireUser(req);
  requirePermission(ctx, "edit_study");
  const study = await loadStudy(ctx, (await params).studyId);
  const b = await parseBody(req, schema);
  const { data: doc } = await ctx.db.from("documents").select("id").eq("id", b.document_id).eq("org_id", study.org_id).eq("study_id", study.study_id).maybeSingle();
  if (!doc) throw notFound();
  const { data: id, error } = await ctx.db.rpc("register_amendment", {
    p_document: b.document_id, p_number: b.amendment_number, p_version: b.protocol_version, p_effective: b.effective_date,
    p_reconsent: b.reconsent_required, p_reconsent_deadline: b.reconsent_required ? b.reconsent_deadline : null, p_notes: b.notes ?? null,
  });
  if (error) throw dbError(error);

  // Notify the site teams (current site-level contacts with an email address).
  const { data: acks } = await ctx.db.from("amendment_site_acknowledgements").select("study_site_id").eq("amendment_id", id);
  const siteIds = (acks ?? []).map((a) => a.study_site_id);
  let notified = 0;
  if (siteIds.length) {
    const today = new Date().toISOString().slice(0, 10);
    const { data: contacts } = await ctx.db.from("contact_roles").select("scope_id, end_date, person:persons(email, given_name)")
      .eq("study_id", study.id).eq("scope_type", "site").in("scope_id", siteIds);
    const emails = new Map<string, string>();
    for (const c of (contacts ?? []) as unknown as { end_date: string | null; person: { email: string | null; given_name: string } | null }[]) {
      if (c.person?.email && (!c.end_date || c.end_date >= today)) emails.set(c.person.email.toLowerCase(), c.person.given_name);
    }
    const link = `${new URL(req.url).origin}/platform`;
    const results = await Promise.all([...emails].map(([email, name]) => sendEmail(email, `Protocol amendment ${b.amendment_number} — study ${study.study_id}`,
      emailLayout(`Protocol amendment ${escapeHtml(b.amendment_number)}`, `
        <p style="color:#374151;font-size:14px;line-height:1.6">Dear ${escapeHtml(name)},</p>
        <p style="color:#374151;font-size:14px;line-height:1.6">Protocol version <strong>${escapeHtml(b.protocol_version)}</strong> of study <strong>${escapeHtml(study.study_id)}</strong>
        takes effect on <strong>${escapeHtml(b.effective_date)}</strong>. Please acknowledge it for your site${b.reconsent_required ? ` and re-consent participants by <strong>${escapeHtml(b.reconsent_deadline)}</strong>` : ""}.</p>
        <p><a href="${escapeHtml(link)}" style="background:#F97316;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:700;display:inline-block">Open TMF360</a></p>`))));
    notified = results.filter(Boolean).length;
  }
  return Response.json({ id, sites: siteIds.length, notified }, { status: 201 });
});
