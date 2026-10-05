import { z } from "zod";
import { requireUser } from "@/lib/api/auth";
import { dbError, idParam } from "@/lib/api/db";
import { handle, parseBody } from "@/lib/api/http";

const schema = z.object({
  decision: z.enum(["accepted", "modified", "rejected"]),
  final_value: z.record(z.string(), z.unknown()).optional(),
  note: z.string().trim().max(1000).optional(),
}).strict();

// Records a person's decision on an AI recommendation (AI-06). Audited by the database.
export const POST = handle(async (req: Request, { params }: { params: Promise<{ recId: string }> }) => {
  const ctx = await requireUser(req);
  const id = idParam((await params).recId);
  const b = await parseBody(req, schema);
  const { error } = await ctx.db.rpc("decide_ai_recommendation", { p_id: id, p_decision: b.decision, p_final: b.final_value ?? null, p_note: b.note ?? null });
  if (error) throw dbError(error);
  return Response.json({ ok: true });
});
