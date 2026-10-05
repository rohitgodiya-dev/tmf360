import { NextRequest, NextResponse } from "next/server";
import { studyHealth } from "@/lib/api/health";
import { serviceClient } from "@/lib/api/service";

// Daily: re-run every study's readiness rules and store a health snapshot for the trend view (HLT-06).
// Fails closed without CRON_SECRET.
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || req.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const svc = serviceClient();
  const { data: studies, error } = await svc.from("studies").select("id, study_id, org_id").not("org_id", "is", null);
  if (error) return NextResponse.json({ error: "Could not list studies" }, { status: 500 });

  let ok = 0;
  const failed: string[] = [];
  for (const s of studies ?? []) {
    try {
      const { error: eErr } = await svc.rpc("evaluate_study", { p_study: s.id });
      if (eErr) throw eErr;
      const h = await studyHealth(svc, s);
      const { error: sErr } = await svc.from("health_snapshots").upsert(
        [{ org_id: s.org_id, study_id: s.id, taken_on: new Date().toISOString().slice(0, 10), indicators: h.values }],
        { onConflict: "study_id,taken_on" });
      if (sErr) throw sErr;
      ok++;
    } catch {
      failed.push(s.id);
    }
  }
  return NextResponse.json({ studies: ok, failed: failed.length });
}
