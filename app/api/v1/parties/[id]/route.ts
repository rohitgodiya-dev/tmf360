import { z } from "zod";
import { requirePermission, requireUser } from "@/lib/api/auth";
import { countryCode, idParam, reason, rowVersion, updateVersioned } from "@/lib/api/db";
import { handle, parseBody } from "@/lib/api/http";

const patchSchema = z.object({
  row_version: rowVersion,
  name: z.string().trim().min(1).max(300).optional(),
  country_code: countryCode.nullish(),
  parent_party_id: z.string().uuid().nullish(),
  status: z.enum(["active", "inactive"]).optional(),
  change_reason: reason.optional(),
});

export const PATCH = handle(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const ctx = await requireUser(req);
  requirePermission(ctx, "manage_directory");
  const id = idParam((await params).id);
  const { row_version, ...patch } = await parseBody(req, patchSchema);
  const party = await updateVersioned(ctx, "parties", { id }, row_version, patch);
  return Response.json(party);
});
