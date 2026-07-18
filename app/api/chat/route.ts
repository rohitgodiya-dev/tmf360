import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

export async function POST(req: NextRequest) {
  try {
    const { message, context } = await req.json();
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      system: `You are Trinity, a TMF AI specialist. You ONLY answer using the study data provided below. NEVER invent, assume, or hallucinate document names, artifact numbers, or study details. If asked about missing documents, list ONLY what is in the context provided. Do not use your training data to fill in gaps.

STUDY DATA:
${context || "No study data provided."}`,
      messages: [{ role: "user", content: message }]
    });
    const text = response.content[0].type === "text" ? response.content[0].text : "";
    return NextResponse.json({ response: text });
  } catch (error: any) {
    console.error("Chat error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

