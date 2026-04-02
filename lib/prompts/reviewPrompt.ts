export function buildReviewPrompt(draft: string, bundle: any): string {
  return `
You are reviewing a generated job application document.

Your task is to improve quality without changing the factual basis.

RULES
- Do not invent any new facts.
- Do not add experience, qualifications, tools, or achievements not supported by the bundle.
- Remove exaggeration.
- Remove repetition.
- Improve clarity and credibility.
- Keep the tone professional and modern.
- Preserve the overall structure of the draft unless a small structural improvement is clearly beneficial.

CHECK FOR
- unsupported claims
- vague or inflated wording
- repetitive bullets or sentences
- weak phrasing
- factual inconsistency with the bundle

INTELLIGENCE BUNDLE
${JSON.stringify(bundle, null, 2)}

DRAFT
${draft}

Return the improved document as plain text only.
`;
}