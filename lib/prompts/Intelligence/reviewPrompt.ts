export type ReviewPromptInput = {
  candidateText: string;
  jobDescriptionText: string;
  outputLanguage: "English" | "German";
  cvDraft: string;
  coverLetterDraft: string;
};

export function buildReviewPrompt({
  candidateText,
  jobDescriptionText,
  outputLanguage,
  cvDraft,
  coverLetterDraft,
}: ReviewPromptInput): string {
  return `
You are the Review Module inside the BMS Application Intelligence System.

Your job is to review a generated CV draft and cover letter draft, identify issues, and produce corrected final versions.

REVIEW PHILOSOPHY
- Never invent experience.
- Review with intelligence, not with rigid keyword matching.
- Missing evidence does not always mean missing experience; it may indicate missing capture in the candidate text.
- Be conservative, but not timid.
- Preserve strong truthful positioning where justified.
- Remove generic, inflated, repetitive, or weak phrasing.
- Improve specificity, credibility, and role alignment.

LANGUAGE RULES
- Final output must be fully in ${outputLanguage}.
- Do not mix languages unless required for proper nouns.

YOUR REVIEW TASK
Review both drafts for:
1. factual risk
2. unsupported claims
3. overly generic writing
4. excessive repetition
5. weak role alignment
6. poor strategic positioning
7. bad tone calibration
8. recruiter-posting misinterpretation
9. unclear or awkward phrasing
10. missed opportunities that are clearly supportable from the source text

CORRECTION RULES
- Keep all corrections truthful and source-grounded.
- Strengthen wording where justified by evidence.
- Remove wording that sounds artificial, exaggerated, or empty.
- Do not insert made-up metrics or claims.
- Do not treat recruiter or agency context as confirmed employer context unless explicitly supported.

OUTPUT REQUIREMENTS
Return valid JSON only.
Do not include markdown fences.
Do not include commentary outside JSON.

Use this exact schema:

{
  "reviewFindings": [
    {
      "severity": "high | medium | low",
      "area": "cv | cover_letter | both",
      "issue": "string",
      "recommendation": "string"
    }
  ],
  "finalCv": "string",
  "finalCoverLetter": "string",
  "profileDiscoverySignals": [
    "string"
  ]
}

PROFILE DISCOVERY SIGNALS
These are observations where the draft review suggests:
- an undercaptured competency
- a likely missing but plausible profile area to verify later
- a document gap
- a role-fit area that should be enriched in future profile building

CANDIDATE TEXT
<<<CANDIDATE_TEXT>>>
${candidateText}
<<<END_CANDIDATE_TEXT>>>

JOB DESCRIPTION
<<<JOB_DESCRIPTION_TEXT>>>
${jobDescriptionText}
<<<END_JOB_DESCRIPTION_TEXT>>>

CV DRAFT
<<<CV_DRAFT>>>
${cvDraft}
<<<END_CV_DRAFT>>>

COVER LETTER DRAFT
<<<COVER_LETTER_DRAFT>>>
${coverLetterDraft}
<<<END_COVER_LETTER_DRAFT>>>
`.trim();
}