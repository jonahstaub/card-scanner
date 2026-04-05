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

    // Truncate OCR text to avoid request size limits
    const trimmed = ocrText.slice(0, 1000).trim();

    const completion = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 512,
      messages: [
        {
          role: "user",
          content: `OCR text from a sports card scan:\n"${trimmed}"\n\nIdentify this card. Return JSON array of up to 3 candidates: [{playerName, year, cardSet, cardNumber, condition: "Near Mint", confidence}]. JSON only.`,
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
