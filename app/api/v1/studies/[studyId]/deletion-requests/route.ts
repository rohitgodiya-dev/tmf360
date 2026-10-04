import { requireUser } from "@/lib/api/auth";
import { dbError, loadStudy } from "@/lib/api/db";
import { handle } from "@/lib/api/http";
import { docTitle, people } from "@/lib/api/qc";
import { hasPermission } from "@/lib/permissions";

const LABEL: Record<string, string> = { incorrectly_indexed: "Incorrectly Indexed", not_tmf_relevant: "Not TMF Relevant", other: "Other" };

// Deletion requests for a study (OPS-02): pending first, then recent decisions.
export const GET = handle(async (req: Request, { params }: { params: Promise<{ studyId: string }> }) => {
  const ctx = await requireUser(req);
  const study = await loadStudy(ctx, (await params).studyId);
  const { data, error } = await ctx.db.from("deletion_requests")
    .select("id, document_id, reason_code, comment, status, requested_by, requested_at, decided_by, decided_at, decision_comment")
    .eq("study_id", study.id).order("requested_at", { ascending: false }).limit(200);
  if (error) throw dbError(error);
  const ids = [...new Set((data ?? []).map((r) => r.document_id))];
  const { data: docs } = ids.length
    ? await ctx.db.from("documents").select("id, custom_file_name, artifact_name, artifact_num").in("id", ids)
    : { data: [] };
  const docById = new Map((docs ?? []).map((d) => [d.id, d]));
  const who = await people(ctx);
  const name = (id: string | null) => (id ? who.get(id)?.name ?? "Former member" : null);
  const canDecide = hasPermission(ctx.role, "delete_document");
  return Response.json({
    data: (data ?? []).sort((a, b) => Number(b.status === "pending") - Number(a.status === "pending")).map((r) => ({
      ...r, reason: LABEL[r.reason_code] ?? r.reason_code,
      title: docById.has(r.document_id) ? docTitle(docById.get(r.document_id)!) : "Document",
      artifact_num: docById.get(r.document_id)?.artifact_num ?? null,
      requested_by_name: name(r.requested_by), decided_by_name: name(r.decided_by),
      can_decide: r.status === "pending" && canDecide && r.requested_by !== ctx.user.id,
      can_withdraw: r.status === "pending" && r.requested_by === ctx.user.id,
    })),
  });
});
