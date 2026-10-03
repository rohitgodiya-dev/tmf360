import { z } from "zod";
import { requirePermission, requireUser } from "@/lib/api/auth";
import { dbError, insertRow } from "@/lib/api/db";
import { handle, parseBody } from "@/lib/api/http";

// People directory: investigators, site staff and other contacts, with or without a login.
export const GET = handle(async (req: Request) => {
  const ctx = await requireUser(req);
  const { data, error } = await ctx.db.from("persons").select("*").order("family_name").order("given_name");
  if (error) throw dbError(error);
  return Response.json({ data });
});

const createSchema = z.object({
  given_name: z.string().trim().min(1).max(200),
  family_name: z.string().trim().min(1).max(200),
  email: z.string().trim().email().nullish(),
  primary_party_id: z.string().uuid().nullish(),
});

export const POST = handle(async (req: Request) => {
  const ctx = await requireUser(req);
  requirePermission(ctx, "manage_directory");
  const body = await parseBody(req, createSchema);
  const person = await insertRow(ctx, "persons", body);
  return Response.json(person, { status: 201 });
});
