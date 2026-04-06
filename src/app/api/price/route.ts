import Groq from "groq-sdk";
import { NextRequest, NextResponse } from "next/server";
import type { PriceResponse } from "@/lib/types";

const client = new Groq();

function extractJSON(text: string): unknown {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]);
  }
  const stripped = text.replace(/^```(?:json)?\s*\n?/m, "").replace(/\n?```\s*$/m, "");
  return JSON.parse(stripped.trim());
}

async function callWithRetry(
  messages: Groq.Chat.ChatCompletionMessageParam[],
  attempt = 0
): Promise<string> {
  try {
    const completion = await client.chat.completions.create({
      model: "groq/compound-mini",
      max_tokens: 512,
      messages,
    });
    return completion.choices[0]?.message?.content || "";
  } catch (e) {
    if (attempt < 2 && e instanceof Error && e.message.includes("429")) {
      await new Promise((r) => setTimeout(r, (attempt + 1) * 10000));
      return callWithRetry(messages, attempt + 1);
    }
    throw e;
  }
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

    const text = await callWithRetry([
      {
        role: "system",
        content:
          "You search for sports card prices and return ONLY raw JSON. No markdown, no explanation, no text before or after the JSON.",
      },
      {
        role: "user",
        content: `Search eBay sold listings for: ${playerName} ${year} ${cardSet} #${cardNumber} ${condition}. Return: {"estimatedPrice":NUMBER,"priceRange":{"low":NUMBER,"high":NUMBER},"sources":[{"source":"STRING","price":NUMBER,"date":"STRING"}]}`,
      },
    ]);

    if (!text) {
      return NextResponse.json({ error: "No response from Groq" }, { status: 502 });
    }

    const priceData = extractJSON(text) as PriceResponse;
    return NextResponse.json(priceData);
  } catch (err) {
    console.error("price error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
