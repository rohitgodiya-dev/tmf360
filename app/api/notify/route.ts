// Retired: this unauthenticated route emailed every user in every organisation and
// accepted arbitrary content and recipients. Use POST /api/v1/notifications.
export async function POST() {
  return Response.json(
    { error: { code: "gone", message: "This endpoint has been retired. Use /api/v1/notifications." } },
    { status: 410 },
  );
}
