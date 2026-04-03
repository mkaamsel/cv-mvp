export function buildPolishPrompt(reviewedDraft: string): string {
  return `
You are polishing the language of a job application document.

Your task is to improve expression, readability, rhythm, and professionalism
without changing facts, scope, or meaning.

--------------------------------------------------

CORE RULES

1. Do not add new facts.
2. Do not remove important evidence.
3. Do not change the meaning.
4. Do not increase seniority, ownership, leadership, or tool depth unless already explicit.
5. Do not turn adjacent evidence into direct evidence.
6. Remove robotic, repetitive, vague, or awkward phrasing.
7. Prefer modern, credible, commercially realistic language.
8. Keep the document clear and ATS-friendly.
9. Preserve the structure unless a very small structural improvement clearly helps.
10. Return plain text only.

--------------------------------------------------

POLISHING GOALS

Improve:
- sentence flow
- readability
- conciseness
- rhythm
- clarity
- professional tone

Reduce:
- repetition
- clutter
- inflated wording
- generic AI-sounding phrasing
- weak sentence openings
- unnecessary filler

--------------------------------------------------

IMPORTANT

This is a language-polish step, not a rewriting-from-scratch step.

If a sentence is already strong and credible, keep it close to the original.

--------------------------------------------------

DOCUMENT
${reviewedDraft}

Return the polished document as plain text only.
`.trim();
}