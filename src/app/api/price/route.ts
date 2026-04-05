import Groq from "groq-sdk";
import { NextRequest, NextResponse } from "next/server";
import type { PriceResponse } from "@/lib/types";

const client = new Groq();

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

    const cardDesc = `${playerName} ${year} ${cardSet} #${cardNumber}`;

    const completion = await client.chat.completions.create({
      model: "groq/compound",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `Search the web for recent sold prices of this sports card: ${cardDesc} in ${condition} condition. Look for eBay completed/sold listings, COMC prices, and card price guides. Find actual dollar amounts from real sales.

Return ONLY valid JSON: {"estimatedPrice": number, "priceRange": {"low": number, "high": number}, "sources": [{"source": string, "price": number, "date": string}]}.

Use real prices you find from your search. For sources, list the actual sales or listings with real prices and dates.`,
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

    const priceData = parseJSON(text) as PriceResponse;
    return NextResponse.json(priceData);
  } catch (err) {
    console.error("price error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
