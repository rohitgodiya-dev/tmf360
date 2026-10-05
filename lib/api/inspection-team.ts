// Part 11a: shared helpers for the study team's inspection screens.
import type { RequestContext } from "./auth";

/** "Title (artifact)" for each document id the caller can read. */
export async function docTitles(ctx: RequestContext, ids: (string | null | undefined)[]): Promise<Map<string, string>> {
  const unique = [...new Set(ids.filter((x): x is string => !!x))];
  if (!unique.length) return new Map();
  const { data, error } = await ctx.db.from("documents").select("id, artifact_num, artifact_name, custom_file_name").in("id", unique);
  if (error) throw error;
  return new Map((data ?? []).map((d) => [d.id, `${(d.custom_file_name || "").trim() || d.artifact_name} (${d.artifact_num})`]));
}

export const ACTIVITY_LABEL: Record<string, string> = {
  login: "Signed in", failed_code: "Wrong access code", locked: "Session locked", search: "Search", view: "Opened document",
  page_view: "Page view time", download: "Download", print: "Print", request: "Request",
  audit_view: "Viewed audit trail", versions_view: "Viewed version history",
};

/** One line describing an activity's details, for the live view and the exported log. */
export function activityDetail(kind: string, d: Record<string, unknown>): string {
  switch (kind) {
    case "search": return `"${d.query}": ${d.results} result${d.results === 1 ? "" : "s"}`;
    case "page_view": return `Page ${d.page}: ${d.seconds} s`;
    case "download":
    case "print": return `${d.watermarked ? "Watermarked copy" : "Original file"}${d.version_no ? `, version ${d.version_no}` : ""}`;
    case "request": return `${String(d.kind).replace(/_/g, " ")}: ${d.subject}`;
    case "failed_code":
    case "locked": return `Attempt ${d.attempt}`;
    default: return "";
  }
}
