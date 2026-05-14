import Anthropic from "@anthropic-ai/sdk";

const MODEL = "claude-sonnet-4-5";

let _client: Anthropic | null = null;
function getClient() {
  if (!_client) _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _client;
}

export async function aiComplete(prompt: string, maxTokens = 1024): Promise<string> {
  const client = getClient();
  const message = await client.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    messages: [{ role: "user", content: prompt }],
  });

  const block = message.content[0];
  if (block.type !== "text") throw new Error("Unexpected response type from Claude");
  return block.text.trim();
}
