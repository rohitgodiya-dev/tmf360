// Part 11a — Inspection Mode (M19). Inspectors have no account (D27): each session has a secret
// link token and a separate access code, stored only as SHA-256. Every inspector call sends both
// (headers below) and is checked by inspection_auth() in the database; reads then go through the
// security-definer scope functions, which are the authorisation boundary. The service role is used
// ONLY to call those functions and to sign storage links for documents they returned.
import { createHash, randomBytes, randomInt } from "node:crypto";
import { PDFDocument, StandardFonts, degrees, rgb } from "pdf-lib";
import { ApiError, notFound, unauthenticated } from "./http";
import { serviceClient } from "./service";

export const TOKEN_HEADER = "x-inspection-token";
export const CODE_HEADER = "x-inspection-code";

export type InspectionSession = {
  id: string; org_id: string; study_id: string; inspector_name: string; inspector_email: string | null; inspector_org: string;
  purpose: string; starts_at: string; ends_at: string; scope_countries: string[]; scope_sites: string[]; scope_nodes: string[];
  scope_statuses: string[]; include_versions: boolean; include_audit: boolean; download_mode: "view_only" | "watermark" | "original";
  ai_enabled: boolean; extra_document_ids: string[];
};

export const sha256 = (s: string) => createHash("sha256").update(s, "utf8").digest("hex");

/** Access codes avoid look-alike characters and are compared without the dash, case-insensitively. */
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const normaliseCode = (code: string) => code.replace(/[\s-]/g, "").toUpperCase();

export function newSecrets() {
  const token = randomBytes(32).toString("base64url");
  const raw = Array.from({ length: 8 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join("");
  const code = `${raw.slice(0, 4)}-${raw.slice(4)}`;
  return { token, code, tokenHash: sha256(token), codeHash: sha256(normaliseCode(code)) };
}

/** Checks the session secrets on every inspector request; `login` also records a login event. */
export async function requireInspector(req: Request, login = false): Promise<InspectionSession> {
  const token = req.headers.get(TOKEN_HEADER)?.trim();
  const code = req.headers.get(CODE_HEADER)?.trim();
  if (!token || !code || token.length > 200 || code.length > 40) throw unauthenticated("Open the inspection link and enter your access code");
  const { data, error } = await serviceClient().rpc("inspection_auth", {
    p_token_hash: sha256(token), p_code_hash: sha256(normaliseCode(code)), p_login: login,
  });
  if (error) throw new Error(`Inspection check failed: ${error.message}`);
  const result = data as { session?: InspectionSession; error?: string };
  // inspection_auth explains refusals in words written for the inspector.
  if (!result?.session) throw new ApiError("unauthenticated", result?.error ?? "This inspection link is not valid");
  return result.session;
}

export async function logActivity(session: InspectionSession, kind: string, documentId: string | null, detail: Record<string, unknown> = {}) {
  const { error } = await serviceClient().rpc("inspection_log", { p_session: session.id, p_kind: kind, p_document: documentId, p_detail: detail });
  if (error) throw new Error(`Inspection activity log failed: ${error.message}`);
}

export type ScopedDocument = {
  id: string; org_id: string; study_id: string; artifact_num: string; artifact_name: string; custom_file_name: string | null;
  file_name: string | null; file_type: string | null; file_path: string | null; status: string; version: string | null;
  effective_date: string | null; expiry_date: string | null;
};

/** A document in the session's scope, or 404 (out of scope is indistinguishable from missing). */
export async function scopedDocument(session: InspectionSession, documentId: string): Promise<ScopedDocument> {
  const { data, error } = await serviceClient().rpc("inspection_document", { p_session: session.id, p_document: documentId });
  if (error) throw new Error(`Inspection scope check failed: ${error.message}`);
  if (!data || !(data as ScopedDocument).id) throw notFound();
  return data as ScopedDocument;
}

// pdf-lib's standard fonts only encode WinAnsi; anything else becomes "?".
const winAnsi = (s: string) => s.replace(/[^\x20-\x7E\xA0-\xFF]/g, "?");

/**
 * Stamps every page with the inspector's name, the server date/time and the session id (INS-06).
 * Returns null if the bytes are not a PDF that can be processed.
 */
export async function watermarkPdf(bytes: Uint8Array, session: InspectionSession, at: Date): Promise<Uint8Array | null> {
  let pdf: PDFDocument;
  try {
    pdf = await PDFDocument.load(bytes, { ignoreEncryption: false });
  } catch {
    return null;
  }
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const stamp = winAnsi(`Inspection copy - ${session.inspector_name} (${session.inspector_org}) - ${at.toISOString().replace("T", " ").slice(0, 19)} UTC - Session ${session.id}`);
  const diagonal = winAnsi(`INSPECTION COPY - ${session.inspector_name}`);
  for (const page of pdf.getPages()) {
    const { width, height } = page.getSize();
    const size = Math.max(6, Math.min(9, width / 90));
    page.drawText(stamp, { x: 18, y: 12, size, font, color: rgb(0.75, 0.1, 0.1), maxWidth: width - 36 });
    page.drawText(stamp, { x: 18, y: height - 18, size, font, color: rgb(0.75, 0.1, 0.1), maxWidth: width - 36 });
    const big = Math.min(42, (Math.hypot(width, height) * 0.8) / Math.max(1, diagonal.length) * 1.6);
    page.drawText(diagonal, { x: width * 0.12, y: height * 0.2, size: big, font, color: rgb(0.85, 0.2, 0.2), opacity: 0.15, rotate: degrees(Math.atan2(height, width) * 180 / Math.PI) });
  }
  pdf.setProducer("TMF360 Inspection Mode");
  pdf.setModificationDate(at);
  return pdf.save();
}

export function sessionView(s: InspectionSession) {
  return {
    id: s.id, inspector_name: s.inspector_name, inspector_org: s.inspector_org, purpose: s.purpose, starts_at: s.starts_at, ends_at: s.ends_at,
    include_versions: s.include_versions, include_audit: s.include_audit, download_mode: s.download_mode, ai_enabled: s.ai_enabled,
    scope_statuses: s.scope_statuses, scope_nodes: s.scope_nodes,
  };
}
