import Groq from "groq-sdk";

export const groq = new Groq();

/**
 * Corrects player name spelling using Groq.
 * Returns the corrected name, or the original if it can't be corrected.
 */
export async function correctPlayerName(name: string): Promise<string> {
  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 50,
      messages: [
        {
          role: "user",
          content: `Correct the spelling of this baseball/sports player name. Reply with ONLY the corrected name, nothing else. If the spelling is already correct, reply with the same name.\n\nName: ${name}`,
        },
      ],
    });
    const corrected = completion.choices[0]?.message?.content?.trim();
    if (corrected && corrected.length < 100) {
      return corrected;
    }
    return name;
  } catch {
    return name;
  }
}
