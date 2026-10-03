// Retired with /api/site360-invite; invitation links are checked by /api/v1/invitations/lookup.
export async function GET() {
  return Response.json(
    { error: { code: "gone", message: "This endpoint has been retired. Use /api/v1/invitations." } },
    { status: 410 },
  );
}
