/**
 * Language & Tone Context builder.
 *
 * Produces a structured string block that is injected into the CV and cover letter
 * generation prompts. It tells the model which JD keywords to maximise and — when
 * available — how to mirror the company's own writing style.
 *
 * This module is intentionally domain-agnostic (CONSTRAINT 1) and language-agnostic
 * (CONSTRAINT 4). It does not hardcode any vocabulary, domain terms, or language
 * strings. All keyword extraction is based on frequency and length heuristics only.
 */

// Common single-character and very short stopwords are excluded by the min-length
// guard (≥5 chars) and the common-word block list below.
// The block list covers the most frequent English and German function words only —
// it is NOT domain-specific vocabulary.
const FUNCTION_WORDS = new Set([
  "about", "above", "after", "again", "against", "also", "among", "and",
  "another", "around", "as", "at", "back", "be", "been", "before",
  "being", "below", "between", "both", "but", "by", "come", "could",
  "did", "do", "does", "doing", "done", "down", "during", "each",
  "either", "else", "even", "every", "few", "for", "from", "get",
  "given", "go", "had", "has", "have", "having", "he", "her", "here",
  "him", "his", "how", "if", "in", "including", "into", "is", "it",
  "its", "just", "like", "make", "me", "more", "most", "much", "must",
  "my", "no", "not", "now", "of", "off", "on", "once", "only", "or",
  "other", "our", "out", "over", "own", "part", "per", "plus",
  "rather", "re", "same", "she", "should", "since", "so", "some",
  "such", "than", "that", "the", "their", "them", "then", "there",
  "these", "they", "this", "those", "through", "to", "together",
  "too", "under", "until", "up", "us", "use", "used", "using",
  "very", "via", "was", "we", "well", "were", "what", "when", "where",
  "which", "while", "who", "will", "with", "within", "without",
  "would", "you", "your",
  // Common German function words
  "aber", "alle", "allem", "allen", "als", "also", "am", "an", "andere",
  "anderen", "anderem", "anderer", "anderes", "auf", "aus", "bei",
  "beim", "bis", "bitte", "da", "damit", "dann", "das", "dass",
  "dem", "den", "der", "des", "die", "diese", "diesem", "diesen",
  "dieser", "dieses", "durch", "ein", "eine", "einem", "einen",
  "einer", "eines", "einige", "er", "es", "etwas", "für", "gegen",
  "haben", "hat", "hier", "ihm", "ihn", "ihnen", "ihr", "ihre",
  "ihrem", "ihren", "ihrer", "ihres", "im", "in", "ist", "ja",
  "jede", "jedem", "jeden", "jeder", "jedes", "kann", "kein",
  "keine", "keinem", "keinen", "keiner", "keines", "man", "mehr",
  "mich", "mir", "mit", "nach", "nicht", "noch", "nun", "ob",
  "oder", "ohne", "schon", "sehr", "sich", "sie", "sind", "so",
  "über", "um", "und", "uns", "unter", "vom", "von", "vor", "war",
  "was", "wenn", "wer", "wie", "wird", "wo", "wir", "wurde", "wurden",
  "zu", "zum", "zur", "zwischen",
]);

/**
 * Extract the top N most significant words from a block of text.
 * Significance is scored by frequency × word length (longer words tend to be more specific).
 * Function words and very short words are excluded.
 */
function extractTopKeywords(text: string, maxKeywords = 20): string[] {
  const freq = new Map<string, number>();

  const words = text
    .toLowerCase()
    .replace(/[^a-z\u00c0-\u024f\s-]/g, " ")
    .split(/\s+/);

  for (const raw of words) {
    const word = raw.replace(/^[-]+|[-]+$/g, "");
    if (word.length < 4) continue;
    if (FUNCTION_WORDS.has(word)) continue;
    freq.set(word, (freq.get(word) ?? 0) + 1);
  }

  return Array.from(freq.entries())
    .map(([word, count]) => ({ word, score: count * Math.log(word.length + 1) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, maxKeywords)
    .map((entry) => entry.word);
}

/**
 * Build the language context block that is injected into generation prompts.
 *
 * @param jdText - Combined responsibilities and requirements text from the job description
 * @param companyPageSnippet - Optional short snippet (~400 chars) from the company's public homepage.
 *   Used only for writing-style mirroring, never as factual evidence.
 */
export function buildLanguageContext(
  jdText: string,
  companyPageSnippet?: string | null,
): string {
  if (!jdText.trim()) return "";

  const keywords = extractTopKeywords(jdText, 20);

  const keywordBlock =
    keywords.length > 0
      ? `JD KEYWORD SIGNALS (use these where evidence supports — maximise their natural presence in the output):
${keywords.join(", ")}`
      : "";

  const toneBlock = companyPageSnippet?.trim()
    ? `COMPANY LANGUAGE SAMPLE (mirror this organisation's writing style — tone, formality level, vocabulary register — without copying it verbatim):
"${companyPageSnippet.trim().slice(0, 400)}"`
    : `TONE GUIDANCE: Infer the appropriate register (formal/conversational, technical/narrative) from the job description text and apply it consistently throughout the output.`;

  return [
    "LANGUAGE & STYLE CONTEXT",
    "",
    keywordBlock,
    "",
    toneBlock,
    "",
    "Apply these signals to make the output feel like the candidate already speaks the company's language — naturally, not mechanically.",
  ]
    .filter((line) => line !== undefined)
    .join("\n")
    .trim();
}
