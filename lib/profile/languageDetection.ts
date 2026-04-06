/**
 * Language detection utilities.
 *
 * Supports DE, EN, ES only.
 * Uses lightweight heuristics — no external dependencies.
 * Good enough for profile documents and chat messages.
 */

export type SupportedLanguage = "de" | "en" | "es";

const SUPPORTED: SupportedLanguage[] = ["de", "en", "es"];

// Word sets that are highly diagnostic per language.
// Short common words that won't appear frequently in other languages.
const DE_MARKERS = [
  "der", "die", "das", "und", "ich", "wir", "haben", "sind", "werden",
  "mit", "für", "auf", "bei", "von", "zu", "im", "ist", "war", "wurde",
  "einer", "eine", "einen", "hat", "sich", "nicht", "auch", "nach", "über",
];
const ES_MARKERS = [
  "los", "las", "que", "para", "con", "por", "una", "esta", "como",
  "pero", "más", "tengo", "del", "sus", "son", "fue", "ser", "los",
  "entre", "también", "sobre", "cual", "cuando", "donde", "tiene",
];

/**
 * Detect the primary language of a text string.
 * Returns "en" when ambiguous or too short.
 */
export function detectLanguage(text: string): SupportedLanguage {
  if (!text || text.trim().length < 20) return "en";

  const lower = ` ${text.toLowerCase()} `;

  // Character-level signals (strong indicators)
  const hasUmlauts = /[äöüÄÖÜß]/.test(text);
  const hasSpanishChars = /[ñáéíóúÁÉÍÓÚ¿¡]/.test(text);

  // Word-frequency scoring
  const deScore =
    DE_MARKERS.filter((w) => lower.includes(` ${w} `)).length +
    (hasUmlauts ? 4 : 0);

  const esScore =
    ES_MARKERS.filter((w) => lower.includes(` ${w} `)).length +
    (hasSpanishChars ? 4 : 0);

  if (deScore >= 3 && deScore >= esScore * 1.5) return "de";
  if (esScore >= 3 && esScore >= deScore * 1.5) return "es";
  if (deScore >= 5 && deScore > esScore) return "de";
  if (esScore >= 5 && esScore > deScore) return "es";

  return "en";
}

/**
 * Detect languages from multiple document texts.
 * Returns a deduplicated list of all detected languages, most common first.
 */
export function detectInputLanguages(texts: string[]): SupportedLanguage[] {
  const counts: Record<SupportedLanguage, number> = { de: 0, en: 0, es: 0 };

  for (const text of texts) {
    counts[detectLanguage(text)] += 1;
  }

  return (Object.entries(counts) as [SupportedLanguage, number][])
    .filter(([, count]) => count > 0)
    .sort(([, a], [, b]) => b - a)
    .map(([lang]) => lang);
}

/**
 * Normalise a raw language string to a SupportedLanguage.
 * Returns null if not recognised.
 */
export function normalizeLang(raw: string | null | undefined): SupportedLanguage | null {
  if (!raw) return null;
  const lower = raw.toLowerCase().slice(0, 2);
  return SUPPORTED.includes(lower as SupportedLanguage) ? (lower as SupportedLanguage) : null;
}

/**
 * Resolve the output language to use for document generation.
 *
 * Priority hierarchy (descending):
 *   1. User explicit override (stored in profile.outputLanguageLockedByUser)
 *   2. Job description language
 *   3. Primary CV language
 *   4. Interaction language
 *   5. Default: "en"
 */
export function resolveOutputLanguage(opts: {
  userOverride?: string | null;
  jdLanguage?: string | null;
  cvLanguage?: string | null;
  interactionLanguage?: string | null;
}): SupportedLanguage {
  const { userOverride, jdLanguage, cvLanguage, interactionLanguage } = opts;

  return (
    normalizeLang(userOverride) ??
    normalizeLang(jdLanguage) ??
    normalizeLang(cvLanguage) ??
    normalizeLang(interactionLanguage) ??
    "en"
  );
}
