import { APPLICATION_RECOMMENDATION_PROMPT } from "@/lib/tailoring/application-recommendation";

export function buildApplicationRecommendationInstructions(
  locale: "en" | "de"
): string {
  const languageHint =
    locale === "de"
      ? "Write all free-text fields in German unless the job or user context clearly requires English."
      : "Write all free-text fields in English unless the job or user context clearly requires German.";

  return `
${APPLICATION_RECOMMENDATION_PROMPT}

${languageHint}

QUALITY ENFORCEMENT

- Be conservative and evidence-based.
- Do not overstate candidate fit.
- If a requirement is central and not evidenced, reflect that clearly in the recommendation.
- Keep advisorMessage calm, respectful, and useful.
- If recommendation is not_recommended, still preserve user autonomy and offer credible fallback support without exaggeration.
- Treat tool mentions intelligently:
  - tools listed without operational context = exposure
  - tools tied to responsibilities = stronger evidence
  - version details like "PeopleSoft 9.2" increase credibility
  - product names may belong to broader ecosystems, for example PeopleSoft under Oracle ERP
- Detect domain-specific role requirements and increase their importance when clearly central to day-to-day success.
- Return valid JSON only.
`.trim();
}