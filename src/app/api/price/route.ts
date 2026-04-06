import Groq from "groq-sdk";
import { NextRequest, NextResponse } from "next/server";
import type { PriceResponse } from "@/lib/types";

const groq = new Groq();

function extractJSON(text: string): unknown {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) return JSON.parse(jsonMatch[0]);
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
    body: JSON.stringify({ q: query, num: 10 }),
  });

  if (!res.ok) return "";

  const data = await res.json();
  const results: string[] = [];
  for (const item of data.organic || []) {
    results.push(`${item.title}: ${item.snippet || ""}`);
  }
  return results.join("\n");
}

export async function POST(req: NextRequest) {
  try {
    const { playerName, year, cardSet, cardNumber, condition } = await req.json();

    if (!playerName || !year || !cardSet || !cardNumber || !condition) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const cardDesc = `${playerName} ${year} ${cardSet} #${cardNumber}`;

    // Run two searches: one for sold prices, one for price guides
    const [soldResults, guideResults] = await Promise.all([
      searchSerper(`"${cardDesc}" base card sold eBay -parallel -refractor -auto -numbered`),
      searchSerper(`${cardDesc} base card price guide value ${condition} raw ungraded`),
    ]);

    const allResults = [soldResults, guideResults].filter(Boolean).join("\n\n");

    const prompt = allResults
      ? `You are a sports card pricing expert. I need the price for this SPECIFIC card:

Card: ${cardDesc}
Condition: ${condition} (raw/ungraded)
Type: BASE card only (NOT parallels, refractors, autos, or numbered cards)

Search results:
${allResults}

IMPORTANT:
- Only use prices for the BASE version of this card (not parallels, refractors, autos, numbered, or special inserts)
- Focus on RAW/UNGRADED prices unless the condition suggests graded
- If search results show mostly graded prices (PSA, BGS, SGC), estimate the raw price which is typically 30-60% of a PSA 9
- Use the most recent sales you can find
- Common base cards of non-star players are usually $0.25-$3
- Common base cards of stars are usually $1-$10
- Rookie cards of hyped prospects can be $5-$50+ base

Return ONLY JSON: {"estimatedPrice":0,"priceRange":{"low":0,"high":0},"sources":[{"source":"","price":0,"date":""}]}`
      : `Estimate the price for ${cardDesc} BASE card (not parallel) in ${condition} condition, raw/ungraded. Common base cards are usually $0.25-$5 unless it's a major star or hyped rookie. Return ONLY JSON: {"estimatedPrice":0,"priceRange":{"low":0,"high":0},"sources":[{"source":"","price":0,"date":""}]}`;

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 512,
      messages: [{ role: "user", content: prompt }],
    });

    const text = completion.choices[0]?.message?.content;
    if (!text) {
      return NextResponse.json({ error: "No response" }, { status: 502 });
    }

    const priceData = extractJSON(text) as PriceResponse;
    return NextResponse.json(priceData);
  } catch (err) {
    console.error("price error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
