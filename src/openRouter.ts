export type ChatRoleMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export async function callOpenRouter(
  apiKey: string,
  messages: ChatRoleMessage[],
): Promise<string> {
  const model = process.env.OPENROUTER_MODEL?.trim() || "openai/gpt-4o-mini";
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://github.com/grascya/ecris-intelligence",
      "X-Title": "Ecris Intelligence",
    },
    body: JSON.stringify({
      model,
      messages,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    console.error(`[OpenRouter] ${response.status}: ${detail.slice(0, 200)}`);
    throw new Error("AI request failed. Please try again.");
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return data.choices?.[0]?.message?.content ?? "";
}

export function requireApiKey(): string {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "OPENROUTER_API_KEY is not set. Add it to the MCP server environment.",
    );
  }
  return apiKey;
}
