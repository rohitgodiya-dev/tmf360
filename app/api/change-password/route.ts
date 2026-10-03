// Retired: this route had no authentication and used the service-role key.
// Use PUT /api/v1/users/{userId}/password.
const gone = () =>
  Response.json(
    { error: { code: "gone", message: "This endpoint has been retired. Use PUT /api/v1/users/{userId}/password." } },
    { status: 410 },
  );

export const GET = gone;
export const POST = gone;
