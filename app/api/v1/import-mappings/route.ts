import { z } from "zod";
import { requirePermission, requireUser } from "@/lib/api/auth";
import { dbError, reason } from "@/lib/api/db";
import { handle, parseBody } from "@/lib/api/http";

const schema = z.object({
  mappings: z.array(z.object({
    kind: z.enum(["document_type", "status", "site", "country"]),
    source_value: z.string().trim().min(1).max(300),
    target_value: z.string().trim().min(1).max(300),
  }).strict()).min(1).max(500),
  reason,
}).strict().superRefine((b, c) => {
  b.mappings.forEach((m, i) => {
    const ok = m.kind === "document_type" ? /^\d\d\.\d\d\.\d\d$/.test(m.target_value) : m.kind === "status" ? ["Final", "Draft"].includes(m.target_value)
      : m.kind === "country" ? /^[A-Z]{2}$/.test(m.target_value) : true;
    if (!ok) c.addIssue({ code: "custom", path: ["mappings", i, "target_value"], message: `Not a valid ${m.kind.replace("_", " ")} target` });
  });
});

// MIG-02: the organisation's saved mappings, reused by every batch.
export const GET = handle(async (req: Request) => {
  const ctx = await requireUser(req);
  const { data, error } = await ctx.db.from("import_mappings").select("id, kind, source_value, target_value, updated_at, created_at").eq("org_id", ctx.orgId).order("kind").order("source_value");
  if (error) throw dbError(error);
  return Response.json({ data: data ?? [] });
});

// Adds or changes mappings (same source value and kind = one mapping). Audited with the reason.
export const PUT = handle(async (req: Request) => {
  const ctx = await requireUser(req);
  requirePermission(ctx, "invite_users");
  const { mappings, reason: why } = await parseBody(req, schema);
  const { data: existing, error } = await ctx.db.from("import_mappings").select("id, kind, source_value, target_value").eq("org_id", ctx.orgId);
  if (error) throw dbError(error);
  const key = (k: string, v: string) => `${k}|${v.trim().toLowerCase()}`;
  const have = new Map((existing ?? []).map((m) => [key(m.kind, m.source_value), m]));
  let saved = 0;
  for (const m of mappings) {
    const e = have.get(key(m.kind, m.source_value));
    if (e && e.target_value === m.target_value) continue;
    const { error: wErr } = e
      ? await ctx.db.from("import_mappings").update({ target_value: m.target_value, change_reason: why }).eq("id", e.id)
      : await ctx.db.from("import_mappings").insert([{ org_id: ctx.orgId, ...m, change_reason: why }]);
    if (wErr) throw dbError(wErr);
    saved++;
  }
  return Response.json({ saved });
});
