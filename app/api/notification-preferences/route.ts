// Retired: this route had no authentication and used the service-role key.
// Use /api/v1/notification-preferences.
const gone = () =>
  Response.json(
    { error: { code: "gone", message: "This endpoint has been retired. Use /api/v1/notification-preferences." } },
    { status: 410 },
  );

export const GET = gone;
export const POST = gone;
