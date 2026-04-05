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
    const { image } = await req.json();

    if (!image || typeof image !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid 'image' field (expected base64 JPEG string)" },
        { status: 400 }
      );
    }

    const completion = await client.chat.completions.create({
      model: "llama-3.2-90b-vision-preview",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${image}`,
              },
            },
            {
              type: "text",
              text: "Identify this sports card (primarily baseball). Return a JSON array of up to 3 candidates ranked by confidence. Each candidate: {playerName, year, cardSet, cardNumber, condition, confidence}. Use raw condition descriptors: Gem Mint, Mint, Near Mint, Excellent, Very Good, Good, Fair, Poor. Return ONLY valid JSON, no markdown.",
            },
          ],
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
