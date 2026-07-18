import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

export async function POST(req: NextRequest) {
  try {
    const { message, context } = await req.json();

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: `You are Trinity, an expert TMF (Trial Master File) AI specialist for clinical research. You help TMF Leads, CRAs, Sponsors, and QA teams manage their Trial Master Files in compliance with DIA TMF Reference Model v3.3.1, ICH E6(R3), ISO 14155:2020, and 21 CFR Part 11.

You answer questions about TMF zones, artifacts, regulatory requirements, ICH guidelines, ALCOA+ principles, inspection readiness, and clinical trial documentation best practices.

Always be concise, accurate, and clinically professional. When referencing specific zones or artifacts, use the DIA TMF Reference Model numbering.

${context || ""}`,
      messages: [
        { role: "user", content: message }
      ]
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    return NextResponse.json({ response: text });
  } catch (error: any) {
    console.error("Chat error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
