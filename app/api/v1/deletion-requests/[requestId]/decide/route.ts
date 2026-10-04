import { z } from "zod";
import { requireUser } from "@/lib/api/auth";
import { dbError, idParam } from "@/lib/api/db";
import { handle, notFound, parseBody } from "@/lib/api/http";
import { reauthenticate } from "@/lib/api/qc";

const schema = z.object({
  decision: z.enum(["approved", "rejected", "withdrawn"]),
  comment: z.string().trim().max(2000).default(""),
  password: z.string().max(200).optional(),
}).strict().refine((b) => b.decision !== "approved" || !!b.password, { message: "Enter your password to sign the approval", path: ["password"] })
  .refine((b) => b.decision !== "rejected" || b.comment.length >= 3, { message: "Say why the request is rejected", path: ["comment"] });

// Decide a deletion request (OPS-02): approve with an electronic signature ("Deletion approved",
// password re-checked), reject with a comment, or withdraw your own request.
export const POST = handle(async (req: Request, { params }: { params: Promise<{ requestId: string }> }) => {
  const ctx = await requireUser(req);
  const id = idParam((await params).requestId);
  const body = await parseBody(req, schema);
  const { data: r, error } = await ctx.db.from("deletion_requests").select("id, document_id, status").eq("id", id).maybeSingle();
  if (error) throw dbError(error);
  if (!r) throw notFound();
  const proof = body.decision === "approved" ? await reauthenticate(ctx, body.password!, "deletion_approval", r.document_id) : null;
  const { error: rpcErr } = await ctx.db.rpc("decide_deletion", { p_request: id, p_decision: body.decision, p_comment: body.comment, p_reauth: proof });
  if (rpcErr) throw dbError(rpcErr);
  return Response.json({ id, status: body.decision });
});
