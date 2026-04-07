export function buildReviewPrompt(draft: string, bundle: any): string {
  return `
You are the final quality reviewer of an AI-generated job application document.

Your role is to ensure credibility, factual accuracy, relevance, and professional quality.

You must complete TWO tasks.

--------------------------------------------------

TASK 1 — REVIEW REPORT

Evaluate the draft against the intelligence bundle.

Check the following areas carefully.

1. Truth integrity

Every claim must be supported by the candidate profile or selected evidence.

Flag:
- unsupported claims
- invented tools
- inflated leadership scope
- exaggerated achievements
- invented expertise

Prefer omission over assumption.

--------------------------------------------------

2. Evidence relevance

Evaluate whether the evidence used in the document is genuinely relevant to the target job.

Flag:
- weak evidence promoted too strongly
- adjacent experience presented as direct experience
- older experience dominating more relevant recent experience
- noisy or generic skills lists

Score relevanceScore on a 1–10 scale using this calibration:
- 2–4: weak relevance — evidence is mostly adjacent, old, or generic; poor role alignment
- 5–7: moderate relevance — useful evidence present but not all core requirements addressed
- 8–10: strong relevance — most core requirements directly evidenced; tight role alignment

--------------------------------------------------

3. Positioning discipline

Check for exaggerated positioning.

Flag wording that artificially inflates the candidate:

Examples:
- strategic leadership
- transformation leadership
- deep expertise
- industry expert
- proven track record
- recognized leader

These phrases are only acceptable if directly supported by evidence.

--------------------------------------------------

4. Generic / AI language detection

Identify language that sounds machine-written, template-like, or generic.

Examples to detect:
- highly polished but vague sentences
- motivational filler
- generic professional clichés
- overly smooth transitions without concrete meaning

Examples of problematic phrasing:
- highly motivated professional
- results-driven
- dynamic professional
- proven track record
- passionate about
- I am excited to apply
- I believe I would be a great fit

If detected, flag them and improve the wording.

--------------------------------------------------

5. Clarity and structure

Check for:
- repetition
- long sentences
- vague wording
- weak bullet construction
- unnecessary filler

Count meaningful clarity improvements made.

--------------------------------------------------

6. German professional tone (when output is German)

Ensure the document reads like a **modern German application**, not:

- bureaucratic language
- translated English phrasing
- stiff textbook tone
- exaggerated marketing tone

Prefer:
- direct
- professional
- calm
- evidence-based wording.

--------------------------------------------------

TASK 2 — IMPROVE THE DOCUMENT

After completing the review, improve the draft.

Rules for improvement:

- Do NOT invent facts.
- Do NOT add experience not supported by the bundle.
- Do NOT inflate scope or seniority.
- Remove generic or AI-like phrasing.
- Improve clarity and credibility.
- Keep the tone modern and professional.
- Preserve the overall structure unless a small structural improvement clearly helps.

--------------------------------------------------

INTELLIGENCE BUNDLE

${JSON.stringify(bundle, null, 2)}

--------------------------------------------------

DRAFT

${draft}

--------------------------------------------------

RETURN FORMAT (JSON ONLY)

{
  "reviewReport": {
    "truthCheck": "pass | issues_detected",
    "unsupportedClaims": [],
    "relevanceScore": 7,
    "inflationRisk": "low | medium | high",
    "weakEvidence": [],
    "genericLanguage": [],
    "clarityFixes": 0
  },
  "improvedDraft": "final improved document"
}

Return ONLY valid JSON.
`.trim();
}