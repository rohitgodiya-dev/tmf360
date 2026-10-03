import { z } from "zod";
import { requirePermission, requireUser } from "@/lib/api/auth";
import { idParam, reason, rowVersion, updateVersioned } from "@/lib/api/db";
import { handle, parseBody } from "@/lib/api/http";

const patchSchema = z.object({
  row_version: rowVersion,
  given_name: z.string().trim().min(1).max(200).optional(),
  family_name: z.string().trim().min(1).max(200).optional(),
  email: z.string().trim().email().nullish(),
  primary_party_id: z.string().uuid().nullish(),
  status: z.enum(["active", "inactive"]).optional(),
  change_reason: reason.optional(),
});

export const PATCH = handle(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const ctx = await requireUser(req);
  requirePermission(ctx, "manage_directory");
  const id = idParam((await params).id);
  const { row_version, ...patch } = await parseBody(req, patchSchema);
  const person = await updateVersioned(ctx, "persons", { id }, row_version, patch);
  return Response.json(person);
});
