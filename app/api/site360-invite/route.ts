// Retired: Site360 invitations stored plain-text tokens that never expired and were
// not audited. Site managers now invite through POST /api/v1/invitations.
export async function POST() {
  return Response.json(
    { error: { code: "gone", message: "This endpoint has been retired. Use /api/v1/invitations." } },
    { status: 410 },
  );
}
