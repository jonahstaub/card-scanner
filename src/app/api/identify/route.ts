import Groq from "groq-sdk";
import { NextRequest, NextResponse } from "next/server";
import type { CardCandidate, IdentifyResponse } from "@/lib/types";

const client = new Groq();

function parseJSON(text: string): unknown {
  const stripped = text.replace(/^```(?:json)?\s*\n?/m, "").replace(/\n?```\s*$/m, "");
  return JSON.parse(stripped.trim());
}

export async function POST(req: NextRequest) {
  try {
    const { ocrText } = await req.json();

    if (!ocrText || typeof ocrText !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid 'ocrText' field" },
        { status: 400 }
      );
    }

    const completion = await client.chat.completions.create({
      model: "groq/compound",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `I scanned a sports card and the OCR read the following text from it:

"${ocrText}"

Based on this text, identify the sports card. Search the web if needed to match the card to a specific product. Return a JSON array of up to 3 candidates ranked by confidence. Each candidate: {playerName: string, year: number, cardSet: string, cardNumber: string, condition: string, confidence: number}. For condition, use "Near Mint" as default since we can't assess condition from text. Confidence should be 0-1. Return ONLY valid JSON array, no other text.`,
        },
      ],
    });

    const text = completion.choices[0]?.message?.content;
    if (!text) {
      return NextResponse.json(
        { error: "No response from Groq" },
        { status: 502 }
      );
    }

    const candidates = parseJSON(text) as CardCandidate[];
    const response: IdentifyResponse = { candidates };
    return NextResponse.json(response);
  } catch (err) {
    console.error("identify error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
