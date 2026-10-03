// Shared HTTP conventions for /api/v1 (Plan Section 13: consistent error model).
//
// Every error response has the shape { error: { code, message, details? } }.
// "Not found" and "not permitted" are deliberately indistinguishable for records
// (AZB-07): use notFound() for both.
import { ZodError, type ZodType } from "zod";

export type ErrorCode =
  | "unauthenticated"
  | "forbidden"
  | "not_found"
  | "invalid_request"
  | "conflict"
  | "internal";

const STATUS: Record<ErrorCode, number> = {
  unauthenticated: 401,
  forbidden: 403,
  not_found: 404,
  invalid_request: 400,
  conflict: 409,
  internal: 500,
};

export class ApiError extends Error {
  constructor(public code: ErrorCode, message: string, public details?: unknown) {
    super(message);
  }
  get status() {
    return STATUS[this.code];
  }
}

export const unauthenticated = (message = "Sign in required") => new ApiError("unauthenticated", message);
export const forbidden = (message = "You do not have permission for this action") => new ApiError("forbidden", message);
export const notFound = (message = "Not found") => new ApiError("not_found", message);
export const invalidRequest = (message: string, details?: unknown) => new ApiError("invalid_request", message, details);
export const conflict = (message: string) => new ApiError("conflict", message);

export function errorResponse(err: unknown): Response {
  if (err instanceof ApiError) {
    const body: { error: { code: ErrorCode; message: string; details?: unknown } } = {
      error: { code: err.code, message: err.message },
    };
    if (err.details !== undefined) body.error.details = err.details;
    return Response.json(body, { status: err.status });
  }
  // Never leak internals (stack traces, SQL) to the client.
  console.error("Unhandled API error:", err);
  return Response.json({ error: { code: "internal", message: "Something went wrong" } }, { status: 500 });
}

// Wraps a route handler so thrown ApiErrors (and anything else) become proper responses.
export function handle<Args extends unknown[]>(fn: (...args: Args) => Promise<Response>) {
  return async (...args: Args): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (err) {
      return errorResponse(err);
    }
  };
}

// Parses and validates a JSON body; validation failures become 400 with field details.
export async function parseBody<T>(req: Request, schema: ZodType<T>): Promise<T> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw invalidRequest("Request body must be valid JSON");
  }
  try {
    return schema.parse(raw);
  } catch (e) {
    if (e instanceof ZodError) {
      throw invalidRequest(
        "Request body is invalid",
        e.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
      );
    }
    throw e;
  }
}
