// Part 12a — AI as recommendations (M17 AI-01..07). Every capability:
//  * runs on the server, only when its switch is on for the organisation (AI-07);
//  * reads the file as the signed-in user (RLS and storage policies apply);
//  * stores its output as an ai_recommendations row (service role) with model + version, prompt
//    version, confidence and evidence pointers (AI-06) — nothing is applied to a record by itself.
// AI never files, approves or rejects; the person decides (business rules, M17).
import { createHash } from "node:crypto";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import * as z from "zod/v4";
import type { RequestContext } from "./auth";
import { dbError, type StudyRef } from "./db";
import { forbidden, invalidRequest, notFound } from "./http";
import { pdfPagesText, similarity, shingleSet } from "./pdftext";
import { serviceClient } from "./service";

export const FEATURES = {
  classification: { label: "Document classification", description: "Top-3 record types from the study's taxonomy, with confidence and the evidence behind each.", default: true },
  metadata_extraction: { label: "Metadata extraction", description: "Title, version, dates, site, investigator and whether signatures are present, each with the page it came from.", default: false },
  pre_qc_checks: { label: "Pre-QC checks", description: "Flags unsigned pages, missing dates, blank or missing pages, illegible scans, several documents in one file, and type/content mismatch.", default: false },
  duplicate_detection: { label: "Content duplicate detection", description: "Compares the text of a new file with the study's Final documents of the same type to find near-duplicates.", default: false },
  summary: { label: "Document summary", description: "A short summary in the viewer, with page references.", default: false },
} as const;
export type Feature = keyof typeof FEATURES;

/** Model for all AI capabilities; override per deployment with TMF_AI_MODEL. */
export const AI_MODEL = process.env.TMF_AI_MODEL || "claude-opus-5-5";
export const PROMPT_VERSION: Record<Feature, string> = {
  classification: "classify-v1", metadata_extraction: "metadata-v1", pre_qc_checks: "preqc-v1", duplicate_detection: "shingle-jaccard-v1", summary: "summary-v1",
};
const MAX_PDF_BYTES = 20 * 1024 * 1024;

// ---------------------------------------------------------------------------------------------
// Model access (replaceable in tests so they never spend API credits)
// ---------------------------------------------------------------------------------------------
export type ModelCall<T> = { pdf: Uint8Array; instructions: string; schema: z.ZodType<T>; maxTokens: number };
export type ModelResult<T> = { output: T; model: string };
export type ModelRunner = <T>(call: ModelCall<T>) => Promise<ModelResult<T>>;

let client: Anthropic | null = null;
const realRunner: ModelRunner = async <T,>({ pdf, instructions, schema, maxTokens }: ModelCall<T>) => {
  client ??= new Anthropic();
  const response = await client.messages.parse({
    model: AI_MODEL,
    max_tokens: maxTokens,
    output_config: { effort: "low", format: zodOutputFormat(schema) },
    messages: [{
      role: "user",
      content: [
        { type: "document", source: { type: "base64", media_type: "application/pdf", data: Buffer.from(pdf).toString("base64") } },
        { type: "text", text: instructions },
      ],
    }],
  });
  if (response.stop_reason === "refusal") throw invalidRequest("The AI service declined to analyse this document");
  if (response.stop_reason === "max_tokens" || !response.parsed_output) throw invalidRequest("The AI service did not return a usable answer. Try again.");
  return { output: response.parsed_output as T, model: response.model };
};
let runner: ModelRunner = realRunner;
/** Tests only: swap the model call for a stub. */
export function setModelRunner(r: ModelRunner | null) { runner = r ?? realRunner; }

// ---------------------------------------------------------------------------------------------
// Switches and storage
// ---------------------------------------------------------------------------------------------
export async function aiSettings(ctx: RequestContext, orgId: string) {
  const { data, error } = await ctx.db.from("ai_settings").select("feature, enabled").eq("org_id", orgId);
  if (error) throw dbError(error);
  const set = new Map((data ?? []).map((r) => [r.feature as string, r.enabled as boolean]));
  return (Object.keys(FEATURES) as Feature[]).map((f) => ({ feature: f, ...FEATURES[f], enabled: set.get(f) ?? FEATURES[f].default, configured: set.has(f) }));
}

async function requireFeature(ctx: RequestContext, orgId: string, feature: Feature) {
  const { data, error } = await ctx.db.rpc("ai_feature_enabled", { p_org: orgId, p_feature: feature });
  if (error) throw dbError(error);
  if (!data) throw forbidden(`${FEATURES[feature].label} is switched off for your organisation`);
}

type Target = { study: StudyRef; intakeItemId?: string; documentId?: string; fileHash: string | null };
async function store(ctx: RequestContext, t: Target, feature: Feature, r: { model: string; model_version: string; confidence: number | null; output: unknown; evidence: unknown; config?: unknown }) {
  const { data, error } = await serviceClient().from("ai_recommendations").insert([{
    org_id: t.study.org_id, study_id: t.study.id, feature, intake_item_id: t.intakeItemId ?? null, document_id: t.documentId ?? null, file_hash: t.fileHash,
    model: r.model, model_version: r.model_version, prompt_version: PROMPT_VERSION[feature], config: r.config ?? {},
    confidence: r.confidence, output: r.output, evidence: r.evidence, requested_by: ctx.user.id,
  }]).select("*").single();
  if (error) throw new Error(`Could not record the AI recommendation: ${error.message}`);
  return data;
}

async function download(ctx: RequestContext, path: string, name: string | null, type: string | null): Promise<Uint8Array> {
  if (!/pdf/i.test(type ?? "") && !/\.pdf$/i.test(name ?? "")) throw invalidRequest("AI assistance works on PDF files only");
  const { data: blob, error } = await ctx.db.storage.from("Documents").download(path);
  if (error || !blob) throw notFound("The file could not be read");
  if (blob.size > MAX_PDF_BYTES) throw invalidRequest("The file is too large for AI assistance (20 MB maximum)");
  return new Uint8Array(await blob.arrayBuffer());
}

// ---------------------------------------------------------------------------------------------
// Schemas (structured outputs) and prompts
// ---------------------------------------------------------------------------------------------
const Evidence = z.object({ page: z.number().int(), quote: z.string() });
const ClassificationOut = z.object({
  suggestions: z.array(z.object({ artifact_num: z.string(), confidence: z.number(), reason: z.string(), evidence: z.array(Evidence) })),
});
const Field = z.object({ value: z.string().nullable(), confidence: z.number(), page: z.number().int().nullable(), quote: z.string().nullable() });
const MetadataOut = z.object({
  fields: z.object({ title: Field, version_label: Field, effective_date: Field, expiry_date: Field, site_number: Field, investigator: Field, signatures_present: Field }),
});
const PreQcOut = z.object({
  flags: z.array(z.object({
    check: z.enum(["unsigned", "missing_dates", "blank_pages", "missing_pages", "illegible_scan", "multiple_documents", "type_mismatch"]),
    severity: z.enum(["high", "medium", "low"]), detail: z.string(), pages: z.array(z.number().int()),
  })),
});
const SummaryOut = z.object({ summary: z.string(), key_points: z.array(z.object({ point: z.string(), page: z.number().int().nullable() })) });

const GROUND_RULES = "You assist a clinical trial master file (TMF) team. Use only what is in the attached document. " +
  "For every claim give the 1-based page number and a short verbatim quote as evidence. Confidence is 0-100. " +
  "You only suggest: a person makes every decision.";

// ---------------------------------------------------------------------------------------------
// Capabilities
// ---------------------------------------------------------------------------------------------
type IntakeRow = { id: string; study_id: string; file_path: string; file_name: string | null; file_type: string | null; file_hash: string | null; artifact_num: string | null };

export async function loadIntake(ctx: RequestContext, study: StudyRef, itemId: string): Promise<IntakeRow> {
  const { data, error } = await ctx.db.from("intake_items").select("id, study_id, file_path, file_name, file_type, file_hash, artifact_num, status")
    .eq("id", itemId).eq("study_id", study.id).maybeSingle();
  if (error) throw dbError(error);
  if (!data) throw notFound();
  if (data.status === "filed" || data.status === "rejected") throw invalidRequest("This intake item is already closed");
  return data as IntakeRow;
}

/** AI-01: top-3 record types of the study's taxonomy (only types that exist in it are kept). */
export async function classify(ctx: RequestContext, study: StudyRef, item: IntakeRow) {
  await requireFeature(ctx, study.org_id, "classification");
  const { data: types, error } = await ctx.db.from("tmf_config").select("artifact_num, artifact_name, classification")
    .eq("org_id", study.org_id).eq("study_id", study.study_id).eq("type", "artifact").eq("is_enabled", true);
  if (error) throw dbError(error);
  const known = new Map((types ?? []).map((t) => [t.artifact_num as string, t]));
  if (!known.size) throw invalidRequest("This study has no record types configured to classify against");
  const pdf = await download(ctx, item.file_path, item.file_name, item.file_type);
  const list = [...known.values()].map((t) => `${t.artifact_num} ${t.artifact_name}`).join("\n");
  const { output, model } = await runner({
    pdf, schema: ClassificationOut, maxTokens: 4000,
    instructions: `${GROUND_RULES}\n\nClassify the document into the record type it is, choosing ONLY from this list (artifact number and name):\n${list}\n\nReturn up to 3 suggestions, best first.`,
  });
  const suggestions = output.suggestions.filter((s) => known.has(s.artifact_num)).slice(0, 3)
    .map((s) => ({ ...s, artifact_name: known.get(s.artifact_num)!.artifact_name, confidence: Math.max(0, Math.min(100, Math.round(s.confidence))) }));
  if (!suggestions.length) throw invalidRequest("The AI service did not suggest a record type from this study's taxonomy");
  return store(ctx, { study, intakeItemId: item.id, fileHash: item.file_hash }, "classification", {
    model: AI_MODEL, model_version: model, confidence: suggestions[0].confidence,
    output: { suggestions: suggestions.map((s) => ({ artifact_num: s.artifact_num, artifact_name: s.artifact_name, confidence: s.confidence, reason: s.reason })) }, evidence: suggestions.flatMap((s) => s.evidence.map((e) => ({ ...e, artifact_num: s.artifact_num }))),
    config: { candidates: known.size },
  });
}

/** AI-02: metadata with the page and text each value came from. */
export async function extractMetadata(ctx: RequestContext, study: StudyRef, item: IntakeRow) {
  await requireFeature(ctx, study.org_id, "metadata_extraction");
  const pdf = await download(ctx, item.file_path, item.file_name, item.file_type);
  const { output, model } = await runner({
    pdf, schema: MetadataOut, maxTokens: 4000,
    instructions: `${GROUND_RULES}\n\nExtract: title (the document's own title), version_label, effective_date and expiry_date (YYYY-MM-DD), site_number, investigator (name), ` +
      "signatures_present (\"yes\" or \"no\"). Use null for anything not in the document; never guess.",
  });
  const fields = Object.fromEntries(Object.entries(output.fields).map(([k, f]) => [k, { ...f, confidence: Math.max(0, Math.min(100, Math.round(f.confidence))),
    value: f.value && /date$/.test(k) && !/^\d{4}-\d{2}-\d{2}$/.test(f.value) ? null : f.value }]));
  const found = Object.values(fields).filter((f) => f.value != null);
  return store(ctx, { study, intakeItemId: item.id, fileHash: item.file_hash }, "metadata_extraction", {
    model: AI_MODEL, model_version: model, confidence: found.length ? Math.round(found.reduce((s, f) => s + f.confidence, 0) / found.length) : null,
    output: { fields: Object.fromEntries(Object.entries(fields).map(([k, f]) => [k, { value: f.value, confidence: f.confidence }])) },
    evidence: Object.entries(fields).filter(([, f]) => f.value != null && f.page != null).map(([k, f]) => ({ field: k, page: f.page, quote: f.quote })),
  });
}

/** AI-03: pre-QC flags. Flags only — the QC reviewer decides. */
export async function preQc(ctx: RequestContext, study: StudyRef, item: IntakeRow) {
  await requireFeature(ctx, study.org_id, "pre_qc_checks");
  const pdf = await download(ctx, item.file_path, item.file_name, item.file_type);
  let expected = "";
  if (item.artifact_num) {
    const { data } = await ctx.db.from("tmf_config").select("artifact_name").eq("org_id", study.org_id).eq("study_id", study.study_id).eq("artifact_num", item.artifact_num).maybeSingle();
    if (data?.artifact_name) expected = `\nThe person has indexed it as "${item.artifact_num} ${data.artifact_name}"; flag type_mismatch if the content is a different kind of document.`;
  }
  const { output, model } = await runner({
    pdf, schema: PreQcOut, maxTokens: 4000,
    instructions: `${GROUND_RULES}\n\nCheck the document before QC and list only real problems: unsigned signature blocks, missing dates where a date is expected, ` +
      `blank pages, missing pages (page x of y gaps), illegible scans, several separate documents in one file, type/content mismatch.${expected}\nReturn an empty list if there is nothing to flag.`,
  });
  return store(ctx, { study, intakeItemId: item.id, fileHash: item.file_hash }, "pre_qc_checks", {
    model: AI_MODEL, model_version: model, confidence: null, output: { flags: output.flags.map((f) => ({ check: f.check, severity: f.severity, detail: f.detail })) },
    evidence: output.flags.flatMap((f) => f.pages.map((page) => ({ check: f.check, page }))), config: { indexed_as: item.artifact_num },
  });
}

/** AI-04: content-based near-duplicates among the study's Final documents of the same type (no model call). */
export async function findDuplicates(ctx: RequestContext, study: StudyRef, item: IntakeRow) {
  await requireFeature(ctx, study.org_id, "duplicate_detection");
  const pdf = await download(ctx, item.file_path, item.file_name, item.file_type);
  const mine = shingleSet((await pdfPagesText(pdf)).join(" "));
  if (mine.size < 5) throw invalidRequest("The file has too little text to compare (it may be a scan without a text layer)");
  let q = ctx.db.from("documents").select("id, artifact_num, artifact_name, custom_file_name, file_path, file_name, file_type, file_hash")
    .eq("org_id", study.org_id).eq("study_id", study.study_id).eq("status", "Approved").is("deleted_at", null).not("file_path", "is", null).limit(25);
  if (item.artifact_num) q = q.eq("artifact_num", item.artifact_num);
  const { data: docs, error } = await q;
  if (error) throw dbError(error);
  const matches: { document_id: string; title: string; artifact_num: string; similarity: number; identical_file: boolean }[] = [];
  for (const d of docs ?? []) {
    if (!/pdf/i.test(d.file_type ?? "") && !/\.pdf$/i.test(d.file_name ?? "")) continue;
    const { data: blob } = await ctx.db.storage.from("Documents").download(d.file_path!);
    if (!blob || blob.size > MAX_PDF_BYTES) continue;
    const s = similarity(mine, shingleSet((await pdfPagesText(new Uint8Array(await blob.arrayBuffer()))).join(" ")));
    if (s >= 0.6) matches.push({ document_id: d.id, title: (d.custom_file_name || "").trim() || d.artifact_name, artifact_num: d.artifact_num, similarity: Math.round(s * 100) / 100, identical_file: d.file_hash === item.file_hash });
  }
  matches.sort((a, b) => b.similarity - a.similarity);
  return store(ctx, { study, intakeItemId: item.id, fileHash: item.file_hash }, "duplicate_detection", {
    model: "tmf360-text-similarity", model_version: "word-5-shingle-jaccard-1", confidence: matches[0] ? Math.round(matches[0].similarity * 100) : null,
    output: { matches, compared: (docs ?? []).length, threshold: 0.6 }, evidence: matches.map((m) => ({ document_id: m.document_id, similarity: m.similarity })),
  });
}

/** AI-05: a short summary of a document for the viewer. */
export async function summarise(ctx: RequestContext, documentId: string) {
  const { data: d, error } = await ctx.db.from("documents").select("id, org_id, study_id, file_path, file_name, file_type, file_hash").eq("id", documentId).is("deleted_at", null).maybeSingle();
  if (error) throw dbError(error);
  if (!d || !d.file_path) throw notFound();
  const { data: s } = await ctx.db.from("studies").select("id, study_id, org_id").eq("org_id", d.org_id).eq("study_id", d.study_id).order("created_at").limit(1).maybeSingle();
  if (!s) throw notFound();
  await requireFeature(ctx, d.org_id, "summary");
  // A summary of the same file version is reused rather than paid for again.
  const { data: existing } = await ctx.db.from("ai_recommendations").select("*").eq("document_id", d.id).eq("feature", "summary").eq("file_hash", d.file_hash ?? "")
    .neq("status", "rejected").order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (existing) return existing;
  const pdf = await download(ctx, d.file_path, d.file_name, d.file_type);
  const { output, model } = await runner({
    pdf, schema: SummaryOut, maxTokens: 3000,
    instructions: `${GROUND_RULES}\n\nSummarise the document in at most 120 words for a TMF reviewer, then list up to 5 key points, each with its page.`,
  });
  return store(ctx, { study: s as StudyRef, documentId: d.id, fileHash: d.file_hash }, "summary", {
    model: AI_MODEL, model_version: model, confidence: null, output, evidence: output.key_points.filter((k) => k.page != null).map((k) => ({ page: k.page, quote: k.point })),
  });
}

export const fileHashOf = (b: Uint8Array) => createHash("sha256").update(b).digest("hex");
