import { messageSchema, processMessage, verifySignature } from "@/lib/api/inbound";

export const maxDuration = 120;

// Inbound intake email (STG-02/03): called by the mail provider, never by browsers. The HMAC signature
// over "<timestamp>.<body>" proves the call came from the configured provider; nothing else is trusted.
export async function POST(req: Request) {
  const raw = await req.text();
  if (!verifySignature(raw, req.headers.get("x-tmf360-timestamp"), req.headers.get("x-tmf360-signature"))) {
    return Response.json({ error: "Invalid signature" }, { status: 401 });
  }
  let parsed;
  try {
    parsed = messageSchema.parse(JSON.parse(raw));
  } catch {
    return Response.json({ error: "Invalid message" }, { status: 400 });
  }
  try {
    return Response.json({ results: await processMessage(parsed) });
  } catch (e) {
    console.error("Inbound email failed:", e);
    return Response.json({ error: "Processing failed" }, { status: 500 });
  }
}
