import { NextRequest, NextResponse } from "next/server";
import type { PriceResponse } from "@/lib/types";

function extractJSON(text: string): unknown {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) return JSON.parse(jsonMatch[0]);
  const stripped = text.replace(/^```(?:json)?\s*\n?/m, "").replace(/\n?```\s*$/m, "");
  return JSON.parse(stripped.trim());
}

async function queryGroq(prompt: string, attempt = 0): Promise<string> {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "groq/compound-mini",
      max_tokens: 256,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    if (attempt < 2 && (res.status === 429 || res.status === 413)) {
      await new Promise((r) => setTimeout(r, (attempt + 1) * 10000));
      return queryGroq(prompt, attempt + 1);
    }
    const body = await res.text();
    throw new Error(`${res.status} ${body}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

export async function POST(req: NextRequest) {
  try {
    const { playerName, year, cardSet, cardNumber, condition } = await req.json();

    if (!playerName || !year || !cardSet || !cardNumber || !condition) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const text = await queryGroq(
      `${playerName} ${year} ${cardSet} #${cardNumber} ${condition} card eBay sold price. Reply ONLY JSON: {"estimatedPrice":0,"priceRange":{"low":0,"high":0},"sources":[{"source":"","price":0,"date":""}]}`
    );

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
