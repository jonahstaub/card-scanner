import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import type { PriceResponse } from "@/lib/types";

const client = new Anthropic();

function parseJSON(text: string): unknown {
  const stripped = text.replace(/^```(?:json)?\s*\n?/m, "").replace(/\n?```\s*$/m, "");
  return JSON.parse(stripped.trim());
}

export async function POST(req: NextRequest) {
  try {
    const { playerName, year, cardSet, cardNumber, condition } = await req.json();

    if (!playerName || !year || !cardSet || !cardNumber || !condition) {
      return NextResponse.json(
        { error: "Missing required fields: playerName, year, cardSet, cardNumber, condition" },
        { status: 400 }
      );
    }

    const prompt = `Find the most recent completed sale prices for ${playerName} ${year} ${cardSet} #${cardNumber} in ${condition} condition. Search eBay completed listings, COMC, and card price guides. Return ONLY valid JSON: {"estimatedPrice": number, "priceRange": {"low": number, "high": number}, "sources": [{"source": string, "price": number, "date": string}]}.`;

    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      tools: [
        {
          type: "web_search_20250305",
          name: "web_search",
          max_uses: 5,
        },
      ],
      messages: [
        {
          role: "user",
          content: prompt,
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

    const priceData = parseJSON(textBlock.text) as PriceResponse;
    return NextResponse.json(priceData);
  } catch (err) {
    console.error("price error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
