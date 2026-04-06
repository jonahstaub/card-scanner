import { NextRequest, NextResponse } from "next/server";
import type { CardCandidate, IdentifyResponse } from "@/lib/types";

function extractJSON(text: string): unknown {
  const match = text.match(/\[[\s\S]*\]/);
  if (match) return JSON.parse(match[0]);
  const stripped = text.replace(/^```(?:json)?\s*\n?/m, "").replace(/\n?```\s*$/m, "");
  return JSON.parse(stripped.trim());
}

async function queryGroq(prompt: string): Promise<string> {
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
    const body = await res.text();
    throw new Error(`${res.status} ${body}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

export async function POST(req: NextRequest) {
  try {
    const { ocrText } = await req.json();

    if (!ocrText || typeof ocrText !== "string") {
      return NextResponse.json({ error: "Missing ocrText" }, { status: 400 });
    }

    const trimmed = ocrText.slice(0, 500).trim();

    const text = await queryGroq(
      `OCR from a sports card: "${trimmed}". Identify it. Return ONLY JSON array: [{"playerName":"","year":0,"cardSet":"","cardNumber":"","condition":"Near Mint","confidence":0.9}]`
    );

    if (!text) {
      return NextResponse.json({ error: "No response" }, { status: 502 });
    }

    const candidates = extractJSON(text) as CardCandidate[];
    const response: IdentifyResponse = { candidates };
    return NextResponse.json(response);
  } catch (err) {
    console.error("identify error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
