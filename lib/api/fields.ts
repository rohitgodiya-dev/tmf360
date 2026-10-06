// Required and type-specific fields per TMF artifact (Part 22, RM-06). The database enforces required fields at
// filing and at Submit for QC (metadata_gaps); this module validates rule definitions and entered values.
import { z } from "zod";
import type { RequestContext } from "./auth";
import { dbError } from "./db";
import { invalidRequest } from "./http";

export const STANDARD_FIELDS = {
  title: "Title", version: "Version", effective_date: "Effective date", expiry_date: "Expiry date",
  owner: "Owner", country: "Country", site: "Site",
} as const;
export type StandardField = keyof typeof STANDARD_FIELDS;
export const STANDARD_KEYS = Object.keys(STANDARD_FIELDS) as [StandardField, ...StandardField[]];

export const customFieldSchema = z.object({
  key: z.string().regex(/^[a-z][a-z0-9_]{0,39}$/, "Use lower-case letters, digits and underscores (max 40)"),
  label: z.string().trim().min(1).max(100),
  type: z.enum(["text", "date", "number", "select"]),
  options: z.array(z.string().trim().min(1).max(100)).max(50).optional(),
  required: z.boolean().default(false),
}).refine((f) => f.type !== "select" || (f.options?.length ?? 0) > 0, { message: "A list field needs options", path: ["options"] });
export type CustomField = z.infer<typeof customFieldSchema>;

export const ruleSchema = z.object({
  artifact_num: z.string().regex(/^[0-9]{2}(\.[0-9]{2}){0,2}$/, "Use an artifact number such as 05.02.04"),
  required_fields: z.array(z.enum(STANDARD_KEYS)).max(STANDARD_KEYS.length).default([]),
  custom_fields: z.array(customFieldSchema).max(20).default([])
    .refine((fs) => new Set(fs.map((f) => f.key)).size === fs.length, { message: "Field keys must be unique" }),
});
export type Rule = z.infer<typeof ruleSchema> & { id?: string; row_version?: number };

export const customValues = z.record(z.string().max(40), z.string().max(1000));

export async function ruleFor(ctx: RequestContext, artifact: string | null | undefined): Promise<Rule | null> {
  if (!artifact) return null;
  const { data, error } = await ctx.db.from("artifact_field_rules").select("*").eq("org_id", ctx.orgId).eq("artifact_num", artifact).maybeSingle();
  if (error) throw dbError(error);
  return (data as Rule | null) ?? null;
}

/** Checks entered type-specific values against the artifact's fields; returns the cleaned values (unknown keys dropped). */
export function checkValues(rule: Rule | null, values: Record<string, string>): Record<string, string> {
  const fields = rule?.custom_fields ?? [];
  const out: Record<string, string> = {};
  const errors: { path: string; message: string }[] = [];
  for (const f of fields) {
    const v = (values[f.key] ?? "").trim();
    if (!v) continue;
    if (f.type === "date" && !/^\d{4}-\d{2}-\d{2}$/.test(v)) errors.push({ path: f.key, message: `${f.label}: use YYYY-MM-DD` });
    else if (f.type === "number" && !/^-?\d+(\.\d+)?$/.test(v)) errors.push({ path: f.key, message: `${f.label}: enter a number` });
    else if (f.type === "select" && !(f.options ?? []).includes(v)) errors.push({ path: f.key, message: `${f.label}: choose one of the listed values` });
    else out[f.key] = v;
  }
  if (errors.length) throw invalidRequest(errors.map((e) => e.message).join("; "), errors);
  return out;
}
