import { z } from "zod";
import { requirePermission, requireUser } from "@/lib/api/auth";
import { dbError, insertRow, loadStudy } from "@/lib/api/db";
import { hashStoredFile } from "@/lib/api/files";
import { handle, invalidRequest, parseBody } from "@/lib/api/http";
import { serviceClient } from "@/lib/api/service";

// Document Intake (Part 5): files received for a study, waiting to be indexed and filed.

const OPEN = ["received", "indexed"];
const STATUSES = ["received", "indexed", "filed", "rejected"];

export const GET = handle(async (req: Request, { params }: { params: Promise<{ studyId: string }> }) => {
  const ctx = await requireUser(req);
  const study = await loadStudy(ctx, (await params).studyId);
  const wanted = new URL(req.url).searchParams.get("status");
  const statuses = wanted === "all" ? STATUSES : wanted ? wanted.split(",").filter((s) => STATUSES.includes(s)) : OPEN;

  const { data, error } = await ctx.db.from("intake_items").select("*")
    .eq("study_id", study.id).in("status", statuses).order("created_at", { ascending: false });
  if (error) throw dbError(error);
  return Response.json({ data });
});

const createSchema = z.object({
  file_path: z.string().min(1).max(500),
  file_name: z.string().trim().min(1).max(300),
  file_type: z.string().max(200).nullish(),
  file_size_bytes: z.number().int().nonnegative().nullish(),
  file_hash: z.string().regex(/^[0-9a-f]{64}$/, "file_hash must be a lowercase SHA-256 hex digest"),
});

// Registers a file the browser has already stored at <org>/<study code>/<sha256>.<ext>.
// The server re-hashes the stored bytes; only a verified item can be filed.
export const POST = handle(async (req: Request, { params }: { params: Promise<{ studyId: string }> }) => {
  const ctx = await requireUser(req);
  requirePermission(ctx, "upload_document");
  const study = await loadStudy(ctx, (await params).studyId);
  const body = await parseBody(req, createSchema);

  const prefix = `${study.org_id}/${study.study_id}/${body.file_hash}.`;
  if (!body.file_path.startsWith(prefix) || body.file_path.slice(prefix.length).includes("/")) {
    throw invalidRequest("Files must be stored at <organisation>/<study>/<sha256>.<extension>");
  }

  const item = await insertRow<{ id: string }>(ctx, "intake_items", { study_id: study.id, ...body });

  const hash = await hashStoredFile(body.file_path);
  const verification_status = !hash ? "missing" : hash === body.file_hash ? "verified" : "mismatch";
  // Authorised above; only the server may record the check.
  const { error: vErr } = await serviceClient().from("intake_items").update({ verification_status }).eq("id", item.id);
  if (vErr) throw dbError(vErr);

  const { data, error } = await ctx.db.from("intake_items").select("*").eq("id", item.id).single();
  if (error) throw dbError(error);
  return Response.json(data, { status: 201 });
});
