export function safeParseJSON<T>(raw: string): T | null {
  if (!raw || typeof raw !== "string") {
    return null;
  }

  const trimmed = raw.trim();

  const candidates = [
    trimmed,
    trimmed.replace(/```json/gi, "").replace(/```/g, "").trim(),
  ];

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate) as T;
    } catch {
      // continue
    }
  }

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const sliced = trimmed.slice(firstBrace, lastBrace + 1);

    try {
      return JSON.parse(sliced) as T;
    } catch {
      // continue
    }
  }

  return null;
}