import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import type { CardCandidate, IdentifyResponse } from "@/lib/types";

const client = new Anthropic();

function parseJSON(text: string): unknown {
  // Strip markdown code blocks if present
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

    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: "image/jpeg",
                data: image,
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

    const textBlock = message.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json(
        { error: "No text response from Claude" },
        { status: 502 }
      );
    }

    const candidates = parseJSON(textBlock.text) as CardCandidate[];

    const response: IdentifyResponse = { candidates };
    return NextResponse.json(response);
  } catch (err) {
    console.error("identify error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
