import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import type { PredictResponse } from "@/lib/types";

const client = new Anthropic();

function parseJSON(text: string): unknown {
  const stripped = text.replace(/^```(?:json)?\s*\n?/m, "").replace(/\n?```\s*$/m, "");
  return JSON.parse(stripped.trim());
}

export async function POST(req: NextRequest) {
  try {
    const { playerName, year, cardSet, cardNumber, condition, currentPrice } =
      await req.json();

    if (
      !playerName ||
      !year ||
      !cardSet ||
      !cardNumber ||
      !condition ||
      currentPrice == null
    ) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: playerName, year, cardSet, cardNumber, condition, currentPrice",
        },
        { status: 400 }
      );
    }

    const prompt = `Given ${playerName}'s age, career stats, contract status, team situation, and current card value of $${currentPrice}, estimate this card's value in 1, 3, and 5 years under three scenarios. Bull (top 10% outcome: All-Star, MVP contention, career year). Base (50th percentile: continues current trajectory). Bear (bottom 10%: significant decline, major injury, demotion). Return ONLY valid JSON: {"bull": {"y1": number, "y3": number, "y5": number, "reasoning": string}, "base": {"y1": number, "y3": number, "y5": number, "reasoning": string}, "bear": {"y1": number, "y3": number, "y5": number, "reasoning": string}}.`;

    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
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

    const predictions = parseJSON(textBlock.text) as PredictResponse;
    return NextResponse.json(predictions);
  } catch (err) {
    console.error("predict error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
