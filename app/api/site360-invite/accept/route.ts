// Retired with /api/site360-invite; invitations are accepted through /api/v1/invitations/accept.
export async function POST() {
  return Response.json(
    { error: { code: "gone", message: "This endpoint has been retired. Use /api/v1/invitations." } },
    { status: 410 },
  );
}
