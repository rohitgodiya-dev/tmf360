import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

export async function POST(req: NextRequest) {
  try {
    const { pdfBase64, fileName, activeZONES, activeTMF } = await req.json();
    if (!pdfBase64) return NextResponse.json({ error: "No PDF data" }, { status: 400 });

    const zonesContext = activeZONES.map((z: any) => `Zone ${z.z}: ${z.zn}`).join("\n");
    const artifactsContext = activeTMF.map((a: any) => `${a.a} - ${a.an} (Zone ${a.z}, ${a.cl})`).join("\n");

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [{
        role: "user",
        content: [
          { type: "document", source: { type: "base64", media_type: "application/pdf", data: pdfBase64 } },
          { type: "text", text: `You are a clinical trial TMF document classification specialist with expertise in DIA TMF Reference Model v3.3.1.

Analyze this document and classify it.

Available zones:
${zonesContext}

Available artifacts:
${artifactsContext}

Respond ONLY with this JSON format, no other text:
{
  "zone_num": "5",
  "zone_name": "Site Management",
  "artifact_num": "05.02.04",
  "artifact_name": "Principal Investigator Curriculum Vitae",
  "confidence": 94,
  "reasoning": "Brief explanation of why this classification was chosen",
  "issues": ["issue1 if any"],
  "missing_fields": ["missing field if any"]
}

issues = problems found in the document (expired, missing signature, etc)
missing_fields = required fields not present
If no issues, use empty arrays.` }
        ]
      }]
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const clean = text.replace(/```json|```/g, "").trim();
    const result = JSON.parse(clean);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Classify error:", error);
    return NextResponse.json({ error: error.message || "Classification failed" }, { status: 500 });
  }
}
