export function clampText(text: string, maxLength: number): string {
  if (!text) return "";

  if (text.length <= maxLength) {
    return text;
  }

  return text.slice(0, maxLength);
}

export function normalizeWhitespace(text: string): string {
  if (!text) return "";

  return text
    .replace(/\r/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+/g, " ")
    .trim();
}

export function guardDocumentsInput(
  documents: unknown
): { text: string; sourceCount: number } {
  if (!Array.isArray(documents)) {
    return { text: "", sourceCount: 0 };
  }

  const texts: string[] = [];

  for (const doc of documents) {
    if (!doc) continue;

    if (typeof doc === "string") {
      texts.push(doc);
      continue;
    }

    if (typeof doc === "object" && "text" in doc) {
      const value = (doc as any).text;

      if (typeof value === "string") {
        texts.push(value);
      }
    }
  }

  const combined = texts.join("\n\n");

  return {
    text: combined,
    sourceCount: texts.length,
  };
}