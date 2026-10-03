import { z } from "zod";
import { requireUser } from "@/lib/api/auth";
import { handle, parseBody } from "@/lib/api/http";
import { serviceClient } from "@/lib/api/service";

// The signed-in user's own report preferences. The user and organisation always
// come from the session, never from the request (the old unauthenticated route
// let anyone point another company's report at themselves).

export const GET = handle(async (req: Request) => {
  const ctx = await requireUser(req);
  const { data, error } = await serviceClient().from("notification_preferences")
    .select("report_frequency, expiry_window").eq("user_id", ctx.user.id).maybeSingle();
  if (error) throw error;
  return Response.json(data ?? { report_frequency: "Off", expiry_window: 30 });
});

const schema = z.object({
  report_frequency: z.enum(["Off", "Weekly", "Bi-weekly", "Monthly"]),
  expiry_window: z.number().int().min(1).max(365),
});

export const PUT = handle(async (req: Request) => {
  const ctx = await requireUser(req);
  const body = await parseBody(req, schema);
  const { data, error } = await serviceClient().from("notification_preferences")
    .upsert({ user_id: ctx.user.id, org_id: ctx.orgId, ...body, updated_at: new Date().toISOString() }, { onConflict: "user_id" })
    .select("report_frequency, expiry_window").single();
  if (error) throw error;
  return Response.json(data);
});
