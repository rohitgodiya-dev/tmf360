// Navigator (Part 6, M04): server-side filtering, sorting and paging over navigator_items.
// Every query runs as the signed-in user, so row-level security decides what is counted.
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { dbError } from "./db";

/** Grid columns (NAV-05): API key → view column. Only these can be filtered or sorted. */
export const COLUMNS = {
  status: "nav_status",
  activity: "current_activity",
  type: "document_type",
  ref: "doc_ref",
  title: "title",
  country: "country_code",
  site: "site_number",
  site_name: "site_name",
  owner: "owner",
  modified: "last_modified",
  level: "tmf_level",
  file_type: "file_type",
  revision: "revision",
  artifact: "artifact_num",
  due: "due_date",
} as const;
export type ColumnKey = keyof typeof COLUMNS;
const columnKey = z.enum(Object.keys(COLUMNS) as [ColumnKey, ...ColumnKey[]]);

/** Tree selections (NAV-01/02): each chip is one field = value; chips combine with AND. */
export const CHIP_FIELDS = {
  zone: "zone_num",
  section: "section_num",
  artifact: "artifact_num",
  country: "study_country_id",
  site: "study_site_id",
} as const;
type ChipField = keyof typeof CHIP_FIELDS;
const chipField = z.enum(Object.keys(CHIP_FIELDS) as [ChipField, ...ChipField[]]);

export const TILES = ["Missing", "Expected", "Incomplete", "Under Revision", "Final"] as const;

export const SELECT_COLUMNS =
  "row_id, kind, document_id, nav_status, current_activity, document_type, artifact_num, doc_ref, title, " +
  "study_country_id, country_code, study_site_id, site_number, site_name, owner, last_modified, tmf_level, " +
  "file_type, revision, has_file, is_historical, placeholder_id, due_date";

/** Completeness (PLC-06) = Final ÷ all rows under the same filters; null when there are none. */
export function completeness(counts: Record<string, number>): number | null {
  const total = TILES.reduce((n, t) => n + (counts[t] ?? 0), 0);
  return total ? Math.round(((counts.Final ?? 0) / total) * 1000) / 10 : null;
}

const rule = z.object({
  column: columnKey,
  op: z.enum(["eq", "neq", "contains", "starts_with", "gt", "lt", "empty", "not_empty"]),
  value: z.string().max(200).optional(),
}).refine((r) => !((r.column === "modified" || r.column === "due") && (r.op === "contains" || r.op === "starts_with")), {
  message: "Dates can be compared with before/after, not text matching",
}).refine((r) => r.op === "empty" || r.op === "not_empty" || (r.value ?? "") !== "", {
  message: "This rule needs a value",
});

export const querySchema = z.object({
  chips: z.array(z.object({ field: chipField, value: z.string().min(1).max(100) })).max(20).default([]),
  status: z.enum(TILES).nullish(),
  level: z.enum(["Study", "Country", "Site"]).nullish(),
  index: z.enum(["current", "historical"]).default("current"),
  q: z.string().trim().max(200).optional(),
  rules: z.array(rule).max(20).default([]),
  sort: z.object({ column: columnKey, dir: z.enum(["asc", "desc"]).default("asc") }).optional(),
  page: z.number().int().min(1).max(100000).default(1),
  page_size: z.number().int().min(1).max(200).default(50),
});
export type NavigatorQuery = z.infer<typeof querySchema>;

// PostgREST filter values: escape LIKE wildcards; values are sent as parameters, not SQL.
const like = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Builder = any;

/** Applies every filter except the status tile, for the study given by org + code. */
function applyFilters(q: Builder, study: { org_id: string; study_id: string }, f: NavigatorQuery): Builder {
  q = q.eq("org_id", study.org_id).eq("study_code", study.study_id);
  if (f.index === "current") q = q.eq("is_historical", false);
  if (f.level) q = q.eq("tmf_level", f.level);
  for (const c of f.chips) q = q.eq(CHIP_FIELDS[c.field], c.value);
  if (f.q) q = q.ilike("title", `%${like(f.q)}%`);
  for (const r of f.rules) {
    const col = COLUMNS[r.column];
    const v = r.value ?? "";
    switch (r.op) {
      case "eq": q = q.eq(col, v); break;
      case "neq": q = q.or(`${col}.is.null,${col}.neq.${JSON.stringify(v)}`); break;
      case "contains": q = q.ilike(col, `%${like(v)}%`); break;
      case "starts_with": q = q.ilike(col, `${like(v)}%`); break;
      case "gt": q = q.gt(col, v); break;
      case "lt": q = q.lt(col, v); break;
      case "empty": q = q.is(col, null); break;
      case "not_empty": q = q.not(col, "is", null); break;
    }
  }
  return q;
}

function applyOrder(q: Builder, f: NavigatorQuery): Builder {
  // With no sort chosen, filed documents come first (most recently changed on top) and
  // missing-artifact rows, which have no modified date, follow in artifact order.
  if (f.sort) q = q.order(COLUMNS[f.sort.column], { ascending: f.sort.dir === "asc", nullsFirst: false });
  else q = q.order(COLUMNS.modified, { ascending: false, nullsFirst: false }).order(COLUMNS.artifact, { ascending: true });
  return q.order("row_id", { ascending: true });   // stable paging
}

export async function runNavigatorQuery(db: SupabaseClient, study: { org_id: string; study_id: string }, f: NavigatorQuery) {
  // Rows for the requested page.
  let rows = applyFilters(db.from("navigator_items").select(SELECT_COLUMNS, { count: "exact" }), study, f);
  if (f.status) rows = rows.eq("nav_status", f.status);
  rows = applyOrder(rows, f);
  const from = (f.page - 1) * f.page_size;
  rows = rows.range(from, from + f.page_size - 1);

  // Tile counts use the same filters (minus the tile itself), so a tile's count always
  // equals the rows that clicking it returns (NAV-03 acceptance).
  const tileQueries = TILES.map((t) =>
    applyFilters(db.from("navigator_items").select("row_id", { count: "exact", head: true }), study, f).eq("nav_status", t));

  const [page, ...tiles] = await Promise.all([rows, ...tileQueries]);
  if (page.error) throw dbError(page.error);
  for (const t of tiles) if (t.error) throw dbError(t.error);
  const counts = Object.fromEntries(TILES.map((t, i) => [t, tiles[i].count ?? 0])) as Record<(typeof TILES)[number], number>;
  return {
    data: page.data ?? [],
    total: page.count ?? 0,
    page: f.page,
    page_size: f.page_size,
    counts,
    completeness: completeness(counts),
  };
}

/** All matching rows for export (no paging), capped. */
export async function exportRows(db: SupabaseClient, study: { org_id: string; study_id: string }, f: NavigatorQuery, ids: string[] | undefined, cap: number) {
  let q = applyFilters(db.from("navigator_items").select(SELECT_COLUMNS), study, f);
  if (f.status) q = q.eq("nav_status", f.status);
  if (ids?.length) q = q.in("row_id", ids);
  const { data, error } = await applyOrder(q, f).limit(cap);
  if (error) throw dbError(error);
  return data ?? [];
}
