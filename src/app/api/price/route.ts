import Groq from "groq-sdk";
import { NextRequest, NextResponse } from "next/server";
import type { PriceResponse } from "@/lib/types";

const groq = new Groq();

function parseJSON(text: string): unknown {
  const stripped = text.replace(/^```(?:json)?\s*\n?/m, "").replace(/\n?```\s*$/m, "");
  return JSON.parse(stripped.trim());
}

async function searchSerper(query: string): Promise<string> {
  const res = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: {
      "X-API-KEY": process.env.SERPER_API_KEY!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ q: query, num: 10 }),
  });

  if (!res.ok) {
    throw new Error(`Serper search failed: ${res.status}`);
  }

  const data = await res.json();
  const results: string[] = [];

  if (data.organic) {
    for (const item of data.organic) {
      results.push(`${item.title}: ${item.snippet || ""} (${item.link})`);
    }
  }

  return results.join("\n");
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

    // Search for recent sold prices
    const searchResults = await searchSerper(
      `${cardDesc} card sold price eBay completed site:ebay.com OR site:comc.com OR site:130point.com`
    );

    const prompt = `You are a sports card pricing expert. Based on these real search results for "${cardDesc}" in ${condition} condition, estimate the current market value.

SEARCH RESULTS:
${searchResults}

Analyze the search results to find actual sale prices. If you find specific sold prices, use those. If results are limited, make your best estimate based on what's available.

Return ONLY valid JSON: {"estimatedPrice": number, "priceRange": {"low": number, "high": number}, "sources": [{"source": string, "price": number, "date": string}]}.

For sources, list the actual sales or listings you found with real prices and approximate dates. If a result doesn't have a clear price, skip it.`;

    const completion = await groq.chat.completions.create({
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
