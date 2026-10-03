// Login check for the older (non-/api/v1) routes. They return errors as
// { error: "message" }, which their callers display, so keep that shape.
import { requireUser, type RequestContext } from "./auth";
import { ApiError } from "./http";

export type Guarded = { ctx: RequestContext; denied?: never } | { ctx?: never; denied: Response };

/** Returns the caller's context, or a 401/403 response to send back unchanged. */
export async function signedIn(req: Request): Promise<Guarded> {
  try {
    return { ctx: await requireUser(req) };
  } catch (e) {
    if (e instanceof ApiError) return { denied: Response.json({ error: e.message }, { status: e.status }) };
    throw e;
  }
}
