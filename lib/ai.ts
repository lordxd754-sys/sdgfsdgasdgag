const MODEL = "gemini-2.5-flash";

export async function aiComplete(prompt: string, maxTokens = 1024): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: maxTokens },
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!text) throw new Error("Gemini returned empty response");
  return text;
}

// Extracts a JSON object from text that may be wrapped in markdown code fences.
// Gemini 2.5 often returns ```json ... ``` instead of raw JSON.
export function extractJson(text: string): string | null {
  // Try fenced code block first: ```json ... ``` or ``` ... ```
  const fenced = text.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
  if (fenced) {
    const candidate = fenced[1].trim();
    if (candidate.startsWith("{") || candidate.startsWith("[")) return candidate;
  }
  // Fall back to raw JSON object extraction
  const raw = text.match(/\{[\s\S]*\}/);
  return raw ? raw[0] : null;
}
