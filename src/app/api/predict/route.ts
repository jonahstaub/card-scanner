import { NextRequest, NextResponse } from "next/server";
import type { PredictResponse } from "@/lib/types";
import { groq } from "@/lib/groq";

function extractJSON(text: string): unknown {
  // Try direct parse first
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
  } catch {
    // If direct parse fails, try stripping markdown
  }
  const stripped = text.replace(/^```(?:json)?\s*\n?/m, "").replace(/\n?```\s*$/m, "");
  try {
    return JSON.parse(stripped.trim());
  } catch {
    // Last resort: try to fix common JSON issues (unescaped quotes in strings)
    const fixed = stripped.trim().replace(/(?<=:\s*"[^"]*)"(?=[^"]*"[,}])/g, '\\"');
    return JSON.parse(fixed);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { playerName, year, cardSet, cardNumber, condition, currentPrice, parallel } =
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
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const cardType = parallel && parallel !== "Base" ? parallel : "base";
    const cardDesc = `${year} ${cardSet} #${cardNumber} ${cardType}`;

    const prompt = `You are a sports card market analyst. Today's date is April 2026. Estimate the card value in 1, 3, and 5 years.

Player: ${playerName}
Card: ${cardDesc}
Condition: ${condition}
Current value: $${currentPrice}

CRITICAL RULES FOR REALISTIC PREDICTIONS:
- First determine the player's CAREER STAGE: prospect, young star, prime, veteran, or retired/near-retirement
- For VETERANS (age 34+) and RETIRED players:
  * Their cards are driven by LEGACY and NOSTALGIA, not future performance
  * Bull case = Hall of Fame induction, jersey retirement, milestone anniversary, renewed collector interest
  * Bear case = forgotten by collectors, oversupply, but NOT "injury/slump" since they're done playing
  * Prices are relatively STABLE compared to young players. A $13 card doesn't drop to $3 just because the player retires
  * If already retired, "becomes elite" makes NO sense. Use "Legacy grows" instead
- For YOUNG PLAYERS and PROSPECTS:
  * Much more volatile. Bull case can be 5-10x current for breakout stars
  * Bear case can drop significantly if they bust
- For PARALLEL/NUMBERED cards: they hold value better than base cards due to scarcity
- Card values generally don't go to zero. Even common cards of known players have a floor

Return ONLY valid JSON:
{"bull": {"y1": number, "y3": number, "y5": number, "reasoning": "one sentence"}, "base": {"y1": number, "y3": number, "y5": number, "reasoning": "one sentence"}, "bear": {"y1": number, "y3": number, "y5": number, "reasoning": "one sentence"}}

Make the reasoning specific to THIS player's actual situation. No generic responses.`;

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const text = completion.choices[0]?.message?.content;
    if (!text) {
      return NextResponse.json({ error: "No response" }, { status: 502 });
    }

    const predictions = extractJSON(text) as PredictResponse;
    return NextResponse.json(predictions);
  } catch (err) {
    console.error("predict error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
