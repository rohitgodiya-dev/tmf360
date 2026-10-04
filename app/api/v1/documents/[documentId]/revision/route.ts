import { z } from "zod";
import { requireUser } from "@/lib/api/auth";
import { dbError, idParam, isoDate } from "@/lib/api/db";
import { handle, parseBody } from "@/lib/api/http";
import { reauthenticate } from "@/lib/api/qc";

const schema = z.object({
  rationale: z.enum(["metadata_update", "content_and_metadata_update", "filing_error", "other"]),
  description: z.string().trim().min(3, "Describe the revision").max(4000),
  proposed_revision: z.string().trim().max(40).optional(),
  process: z.enum(["file_as_final", "collaboration"]),
  changes: z.object({
    custom_file_name: z.string().trim().min(1).max(300).optional(),
    version: z.string().trim().max(40).optional(),
    owner: z.string().trim().max(200).optional(),
    effective_date: isoDate.optional(),
    expiry_date: isoDate.optional(),
  }).strict().default({}),
  password: z.string().max(200).optional(),
}).strict()
  .refine((b) => b.process === "collaboration" || !!b.password, { message: "Enter your password to approve the revision", path: ["password"] })
  .refine((b) => !(b.process === "file_as_final" && b.rationale === "content_and_metadata_update"), { message: "A content change needs a new file: choose Start collaboration", path: ["process"] });

// Revision request on a Final document (OPS-05). "File as Final" applies metadata corrections
// at once with an attestation ("Revision approved"); "Start collaboration" returns the document to
// Draft with the proposed revision, for a new file and QC. Prior versions stay in the history.
export const POST = handle(async (req: Request, { params }: { params: Promise<{ documentId: string }> }) => {
  const ctx = await requireUser(req);
  const id = idParam((await params).documentId);
  const body = await parseBody(req, schema);
  const proof = body.process === "file_as_final" ? await reauthenticate(ctx, body.password!, "revision", id) : null;
  const { data, error } = await ctx.db.rpc("request_revision", {
    p_document: id, p_rationale: body.rationale, p_description: body.description, p_revision: body.proposed_revision ?? null,
    p_process: body.process, p_changes: body.changes, p_reauth: proof,
  });
  if (error) throw dbError(error);
  return Response.json({ id, status: data });
});
