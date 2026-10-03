import { z } from "zod";
import { requirePermission, requireUser } from "@/lib/api/auth";
import { countryCode, dbError, insertRow } from "@/lib/api/db";
import { handle, parseBody } from "@/lib/api/http";

const PARTY_TYPES = ["sponsor", "cro", "site", "vendor", "regulator", "other"] as const;

// Organisations directory (sponsors, CROs, site institutions, vendors, regulators).
export const GET = handle(async (req: Request) => {
  const ctx = await requireUser(req);
  const type = new URL(req.url).searchParams.get("type");
  let q = ctx.db.from("parties").select("*").order("name");
  if (type) q = q.eq("party_type", type);
  const { data, error } = await q;
  if (error) throw dbError(error);
  return Response.json({ data });
});

const createSchema = z.object({
  party_type: z.enum(PARTY_TYPES),
  name: z.string().trim().min(1).max(300),
  parent_party_id: z.string().uuid().nullish(),
  country_code: countryCode.nullish(),
  is_internal: z.boolean().optional(),
});

export const POST = handle(async (req: Request) => {
  const ctx = await requireUser(req);
  requirePermission(ctx, "manage_directory");
  const body = await parseBody(req, createSchema);
  const party = await insertRow(ctx, "parties", body);
  return Response.json(party, { status: 201 });
});
