// Retired: this unauthenticated route could reset any user's password and grant
// any role. Invitations now go through POST /api/v1/invitations.
export async function POST() {
  return Response.json(
    { error: { code: "gone", message: "This endpoint has been retired. Use /api/v1/invitations." } },
    { status: 410 },
  );
}
