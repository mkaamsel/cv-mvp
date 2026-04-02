export function buildPolishPrompt(reviewedDraft: string): string {
  return `
You are polishing the language of a job application document.

Your task is to improve style only.

RULES
- Do not add new facts.
- Do not remove important evidence.
- Do not change the meaning.
- Improve readability, flow, and sentence rhythm.
- Use modern, professional, credible language.
- Remove awkward or robotic phrasing.
- Keep the document ATS-friendly and clear.

DOCUMENT
${reviewedDraft}

Return the polished document as plain text only.
`;
}