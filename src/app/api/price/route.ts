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

    const prompt = `You are a sports card pricing expert. Estimate the current market value for this card based on your knowledge of recent sales, eBay completed listings, and card market trends:

Player: ${playerName}
Year: ${year}
Set: ${cardSet}
Card Number: #${cardNumber}
Condition: ${condition}

Provide your best estimate of the current market value. Be realistic based on the player's status, card rarity, and condition. Return ONLY valid JSON: {"estimatedPrice": number, "priceRange": {"low": number, "high": number}, "sources": [{"source": string, "price": number, "date": string}]}.

For sources, list the marketplaces/price guides you're basing your estimate on (e.g. "eBay recent sales", "COMC", "PSA price guide") with estimated prices from each. Use approximate recent dates.`;

    const completion = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: prompt,
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
