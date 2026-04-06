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
  return results.slice(0, 5).join("\n");
}

export async function POST(req: NextRequest) {
  try {
    const { playerName, year, cardSet, cardNumber, condition } = await req.json();

    if (!playerName || !year || !cardSet || !cardNumber || !condition) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const cardDesc = `${playerName} ${year} ${cardSet} #${cardNumber}`;

    // Search for real prices
    const searchResults = await searchSerper(
      `${cardDesc} card sold price eBay completed`
    );

    const prompt = searchResults
      ? `Based on these search results for "${cardDesc}" in ${condition} condition, estimate the price.\n\nRESULTS:\n${searchResults}\n\nReturn ONLY JSON: {"estimatedPrice":0,"priceRange":{"low":0,"high":0},"sources":[{"source":"","price":0,"date":""}]}`
      : `Estimate the price for ${cardDesc} in ${condition} condition based on your knowledge of the card market. Return ONLY JSON: {"estimatedPrice":0,"priceRange":{"low":0,"high":0},"sources":[{"source":"","price":0,"date":""}]}`;

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
