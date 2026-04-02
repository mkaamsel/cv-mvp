export function safeParseJSON<T>(value: string): T {
  const trimmed = value.trim();

  try {
    return JSON.parse(trimmed) as T;
  } catch {
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);

    if (fenced?.[1]) {
      return JSON.parse(fenced[1]) as T;
    }

    throw new Error("Invalid JSON response.");
  }
}