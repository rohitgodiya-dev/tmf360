import { z } from "zod";
import { handle, parseBody } from "@/lib/api/http";
import { requireInspector } from "@/lib/api/inspect";
import { serviceClient } from "@/lib/api/service";

const schema = z.object({
  kind: z.enum(["document", "clarification", "out_of_scope"]),
  subject: z.string().trim().min(3, "Write a subject of at least 3 characters").max(300),
  detail: z.string().trim().max(4000).optional(),
  document_id: z.string().uuid().optional(),
}).strict();

// The inspector's request queue (INS-07): their own requests with the study team's responses.
export const GET = handle(async (req: Request) => {
  const s = await requireInspector(req);
  const { data, error } = await serviceClient().from("inspection_requests")
    .select("id, kind, subject, detail, document_id, status, response, response_document_id, created_at, responded_at")
    .eq("session_id", s.id).order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return Response.json({ data: data ?? [] });
});

export const POST = handle(async (req: Request) => {
  const s = await requireInspector(req);
  const body = await parseBody(req, schema);
  const { data, error } = await serviceClient().rpc("inspection_request", {
    p_session: s.id, p_kind: body.kind, p_subject: body.subject, p_detail: body.detail ?? null, p_document: body.document_id ?? null,
  });
  if (error) throw new Error(`Request failed: ${error.message}`);
  return Response.json({ id: data }, { status: 201 });
});
