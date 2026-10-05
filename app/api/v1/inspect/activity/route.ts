import { z } from "zod";
import { handle, parseBody } from "@/lib/api/http";
import { logActivity, requireInspector, scopedDocument } from "@/lib/api/inspect";

const schema = z.object({
  document_id: z.string().uuid(),
  page: z.number().int().min(1).max(100000),
  seconds: z.number().int().min(1).max(86400),
}).strict();

// Page view time (INS-08): the viewer reports how long each page was on screen.
export const POST = handle(async (req: Request) => {
  const s = await requireInspector(req);
  const body = await parseBody(req, schema);
  await scopedDocument(s, body.document_id);
  await logActivity(s, "page_view", body.document_id, { page: body.page, seconds: body.seconds });
  return new Response(null, { status: 204 });
});
