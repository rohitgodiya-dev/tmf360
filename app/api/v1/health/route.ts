// Liveness check for the v1 API. Intentionally public and data-free.
export async function GET() {
  return Response.json({ status: "ok", api: "v1" });
}
