import { NextRequest, NextResponse } from "next/server";
import type { PredictResponse } from "@/lib/types";
import { groq } from "@/lib/groq";

function extractJSON(text: string): unknown {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
  } catch {
    // fall through
  }
  const stripped = text.replace(/^```(?:json)?\s*\n?/m, "").replace(/\n?```\s*$/m, "");
  return JSON.parse(stripped.trim());
}

async function searchSerper(query: string): Promise<string> {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) return "";

  const res = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: {
      "X-API-KEY": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ q: query, num: 5 }),
  });

  if (!res.ok) return "";

  const data = await res.json();
  const results: string[] = [];
  for (const item of data.organic || []) {
    results.push(`${item.title}: ${item.snippet || ""}`);
  }
  return results.slice(0, 3).join("\n");
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

    // Search for the player's current status
    const playerInfo = await searchSerper(
      `${playerName} baseball 2026 current status retired active team age`
    );

    const prompt = `You are a sports card market analyst. Today's date is April 2026. Estimate the card value in 1, 3, and 5 years.

Player: ${playerName}
Card: ${cardDesc}
Condition: ${condition}
Current value: $${currentPrice}

CURRENT PLAYER INFO (from web search):
${playerInfo || "No search results available. Use your knowledge but note it may be outdated."}

CRITICAL RULES:
- Use the player info above to determine if they are ACTIVE, RETIRED, or near retirement
- If the player IS RETIRED:
  * Say "retired" in your reasoning. Do NOT say "nearing retirement" or "as they approach retirement"
  * Bull case = HOF induction, legacy appreciation, nostalgia wave, documentary/anniversary
  * Base case = gradual collector interest based on career achievements
  * Bear case = fading relevance, oversupply, but prices stay relatively stable (no dramatic crash)
  * There is NO "injury/slump" scenario for retired players
- If the player is ACTIVE and a VETERAN (34+):
  * Acknowledge they may retire soon
  * Similar to retired but with some performance upside remaining
- If the player is a YOUNG STAR or PROSPECT:
  * Much more volatile predictions
  * Bull = breakout, All-Star, MVP type trajectory
  * Bear = bust, injury, decline
- For PARALLEL/NUMBERED cards: scarcity supports value better than base
- Card values don't go to zero for known players

Return ONLY valid JSON:
{"bull": {"y1": number, "y3": number, "y5": number, "reasoning": "one sentence"}, "base": {"y1": number, "y3": number, "y5": number, "reasoning": "one sentence"}, "bear": {"y1": number, "y3": number, "y5": number, "reasoning": "one sentence"}}

Make reasoning specific to THIS player's actual current situation.`;

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
