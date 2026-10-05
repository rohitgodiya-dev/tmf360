import { handle } from "@/lib/api/http";
import { logActivity, requireInspector } from "@/lib/api/inspect";
import { serviceClient } from "@/lib/api/service";

type Row = { id: string; artifact_num: string | null; artifact_name: string | null; title: string; zone_num: string | null; zone_name: string | null;
  section_num: string | null; section_name: string | null; status: string; version: string | null; effective_date: string | null; expiry_date: string | null;
  country_code: string | null; site_number: string | null; site_name: string | null; file_name: string | null; file_type: string | null;
  has_file: boolean; updated_at: string; extra: boolean };

// The documents in the session's scope (INS-02/04), for taxonomy navigation and search.
// ?q= searches title, artifact name/number, site and country; each search is logged (INS-08).
export const GET = handle(async (req: Request) => {
  const s = await requireInspector(req);
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim().slice(0, 200);
  const { data, error } = await serviceClient().rpc("inspection_documents", { p_session: s.id });
  if (error) throw new Error(`Inspection documents failed: ${error.message}`);
  let rows = (data ?? []) as Row[];
  if (q) {
    const needle = q.toLowerCase();
    rows = rows.filter((r) => [r.title, r.artifact_name, r.artifact_num, r.site_number, r.site_name, r.country_code, r.file_name]
      .some((v) => (v ?? "").toLowerCase().includes(needle)));
    await logActivity(s, "search", null, { query: q, results: rows.length });
  }
  rows.sort((a, b) => (a.artifact_num ?? "").localeCompare(b.artifact_num ?? "") || a.title.localeCompare(b.title));
  return Response.json({ data: rows.map(({ ...r }) => r) });
});
