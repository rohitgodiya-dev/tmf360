import { handle } from "@/lib/api/http";
import { requireInspector, sessionView } from "@/lib/api/inspect";
import { serviceClient } from "@/lib/api/service";

// Inspector login (INS-01): checks the link token and access code and records the login.
// Returns what the inspector may do in this session; nothing about other sessions or studies.
export const POST = handle(async (req: Request) => {
  const s = await requireInspector(req, true);
  const { data: study } = await serviceClient().from("studies").select("study_id, protocol, sponsor").eq("id", s.study_id).maybeSingle();
  return Response.json({ session: sessionView(s), study: { code: study?.study_id ?? "", protocol: study?.protocol ?? null, sponsor: study?.sponsor ?? null } });
});
