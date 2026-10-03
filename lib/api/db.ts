// Database helpers shared by /api/v1 route handlers.
import type { PostgrestError } from "@supabase/supabase-js";
import { z } from "zod";
import type { RequestContext } from "./auth";
import { ApiError, conflict, invalidRequest, notFound } from "./http";

// Maps Postgres errors to API errors without leaking SQL to the client.
export function dbError(error: PostgrestError): ApiError | PostgrestError {
  switch (error.code) {
    case "23505": return conflict("A record with these details already exists");
    case "23503": return invalidRequest("A referenced record does not exist");
    case "23514":
    case "22P02":
    case "22007": return invalidRequest("One or more values are not allowed");
    // Raised by our own validation triggers; their messages are written for users.
    case "P0001": return invalidRequest(error.message);
    case "42501": return notFound();
    default: return error;
  }
}

const uuid = z.string().uuid();
/** Route ids that are not valid UUIDs are simply "not found". */
export function idParam(value: string): string {
  if (!uuid.safeParse(value).success) throw notFound();
  return value;
}

export type StudyRef = { id: string; study_id: string; org_id: string };

/** Loads a study the user may access; anything else is indistinguishable from "not found" (AZB-07). */
export async function loadStudy(ctx: RequestContext, studyId: string): Promise<StudyRef> {
  const id = idParam(studyId);
  const { data: allowed, error: rpcErr } = await ctx.db.rpc("can_access_study_id", { p_study_id: id });
  if (rpcErr) throw dbError(rpcErr);
  if (!allowed) throw notFound();
  const { data, error } = await ctx.db.from("studies").select("id, study_id, org_id").eq("id", id).maybeSingle();
  if (error) throw dbError(error);
  if (!data) throw notFound();
  return data as StudyRef;
}

export async function insertRow<T>(ctx: RequestContext, table: string, row: Record<string, unknown>): Promise<T> {
  const { data, error } = await ctx.db.from(table).insert([row]).select().single();
  if (error) throw dbError(error);
  return data as T;
}

/**
 * Updates a row only if it is still at the version the client last saw.
 * Returns 404 if the row is not visible, 409 if someone else changed it first.
 */
export async function updateVersioned<T>(
  ctx: RequestContext,
  table: string,
  match: Record<string, string>,
  rowVersion: number,
  patch: Record<string, unknown>,
): Promise<T> {
  let q = ctx.db.from(table).update(patch).eq("row_version", rowVersion);
  for (const [k, v] of Object.entries(match)) q = q.eq(k, v);
  const { data, error } = await q.select().maybeSingle();
  if (error) throw dbError(error);
  if (data) return data as T;

  let current = ctx.db.from(table).select("row_version");
  for (const [k, v] of Object.entries(match)) current = current.eq(k, v);
  const { data: existing } = await current.maybeSingle();
  if (!existing) throw notFound();
  throw conflict("This record was changed by someone else. Reload it and try again.");
}

// Common body fields.
export const rowVersion = z.number().int().positive();
export const reason = z.string().trim().min(3, "Give a reason of at least 3 characters").max(2000);
export const countryCode = z.string().regex(/^[A-Z]{2}$/, "Use a 2-letter ISO country code, e.g. US");
export const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");
