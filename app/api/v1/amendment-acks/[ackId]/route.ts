import { z } from "zod";
import { requireUser } from "@/lib/api/auth";
import { dbError, idParam } from "@/lib/api/db";
import { handle, parseBody } from "@/lib/api/http";

// A site acknowledges a protocol amendment, or records re-consent progress (Part 19). The database checks that the
// caller is a study manager or a current contact at that site, stamps the time and writes the audit trail.
const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("acknowledge"), note: z.string().trim().max(2000).optional() }),
  z.object({ action: z.literal("reconsent"), count: z.number().int().min(0).max(100000), completed: z.boolean() }),
]);

export const POST = handle(async (req: Request, { params }: { params: Promise<{ ackId: string }> }) => {
  const ctx = await requireUser(req);
  const id = idParam((await params).ackId);
  const b = await parseBody(req, schema);
  const { error } = b.action === "acknowledge"
    ? await ctx.db.rpc("acknowledge_amendment", { p_ack: id, p_note: b.note ?? null })
    : await ctx.db.rpc("record_reconsent", { p_ack: id, p_count: b.count, p_completed: b.completed });
  if (error) throw dbError(error);
  const { data } = await ctx.db.from("amendment_site_acknowledgements").select("*").eq("id", id).single();
  return Response.json(data);
});
