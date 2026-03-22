type ChatMessage = {
  role: "system" | "user";
  content: string;
};

const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;
const OPENAI_MODEL = "gpt-4o-mini";

export async function callOpenAI(
  messages: ChatMessage[],
  temperature = 0.3
): Promise<string> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages,
      temperature,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("OpenAI API error:", data);
    throw new Error(data?.error?.message || "OpenAI request failed");
  }

  const content = data?.choices?.[0]?.message?.content;

  if (!content || typeof content !== "string") {
    console.error("OpenAI empty content:", data);
    throw new Error("No response content from OpenAI.");
  }

  return content
    .replace(/^```json\s*/i, "")
    .replace(/^```markdown\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}