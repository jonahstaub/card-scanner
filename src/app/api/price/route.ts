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
    const { playerName, year, cardSet, cardNumber, condition, parallel } = await req.json();

    if (!playerName || !year || !cardSet || !cardNumber || !condition) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const cardType = parallel && parallel !== "Base" ? parallel : "base";
    const isBase = cardType === "base";
    const cardDesc = `${playerName} ${year} ${cardSet} #${cardNumber}`;
    const fullDesc = isBase ? `${cardDesc} base` : `${cardDesc} ${cardType}`;

    // Tailor search queries to the card type
    const searchExclusions = isBase ? "-parallel -refractor -auto -numbered" : "";
    const [soldResults, guideResults] = await Promise.all([
      searchSerper(`"${cardDesc}" ${cardType} card sold eBay ${searchExclusions}`),
      searchSerper(`${cardDesc} ${cardType} card price guide value ${condition}`),
    ]);

    const allResults = [soldResults, guideResults].filter(Boolean).join("\n\n");

    const typeInstruction = isBase
      ? `Type: BASE card only (NOT parallels, refractors, autos, or numbered cards)

IMPORTANT:
- Only use prices for the BASE version (not parallels, refractors, autos, numbered, or special inserts)
- Common base cards of non-star players are usually $0.25-$3
- Common base cards of stars are usually $1-$10
- Rookie cards of hyped prospects can be $5-$50+ base`
      : `Type: ${cardType} parallel/variant

IMPORTANT:
- Only use prices for the ${cardType} version specifically
- Parallels are typically worth more than base cards
- Numbered parallels (/25, /50, /99, etc.) are worth significantly more
- Refractors typically 2-10x base value depending on color and rarity`;

    const prompt = allResults
      ? `You are a sports card pricing expert. I need the price for this SPECIFIC card:

Card: ${fullDesc}
Condition: ${condition} (raw/ungraded)
${typeInstruction}

Search results:
${allResults}

- Focus on RAW/UNGRADED prices unless the condition suggests graded
- If search results show mostly graded prices (PSA, BGS, SGC), estimate the raw price which is typically 30-60% of a PSA 9
- Use the most recent sales you can find

Return ONLY JSON: {"estimatedPrice":0,"priceRange":{"low":0,"high":0},"sources":[{"source":"","price":0,"date":""}]}`
      : `Estimate the price for ${fullDesc} in ${condition} condition, raw/ungraded. ${isBase ? "Common base cards are usually $0.25-$5 unless it's a major star or hyped rookie." : `This is a ${cardType} parallel which is typically worth more than base.`} Return ONLY JSON: {"estimatedPrice":0,"priceRange":{"low":0,"high":0},"sources":[{"source":"","price":0,"date":""}]}`;

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
