// TODO: canonicalization prompt improvement pending
export function buildCanonicalizeProfileInstructions(): string {
  return `
You canonicalize four arrays from a merged candidate profile:
- coreSkills
- industries
- verifiedClaims
- openQuestions

Your job is to remove duplicates and return one clean canonical version of each array.
Never invent new items.
Counts may only stay the same or decrease.

TASK 1 — coreSkills
Collapse semantic duplicates.
If multiple skills express the same concept with wording variation, keep one recruiter-friendly English label.

Rules:
- Prefer the clearest professional label used in CVs or job descriptions.
- Prefer English.
- Prefer the most specific useful label, but do not keep multiple labels for the same concept.
- If one label is just a wording variant of another, keep one only.

Examples:
- "Process Digitalization" + "Financial Process Digitalization" + "Digitalization of Financial Processes"
  → keep one label only
- "SOX Controls" + "Internal Controls (SOX)" + "SOX Compliance"
  → keep one label only
- "Financial accounting and reporting" + "Financial Reporting"
  → keep the stronger canonical label if they mean the same thing

Do not collapse distinct concepts such as:
- IFRS 15 contract work
- IFRS 16 lease accounting
- Trade Finance

TASK 2 — industries
Collapse multilingual and phrasing duplicates.
Keep one English canonical label per industry.

Rules:
- German + English version of the same industry → keep English only
- bilingual combined label → keep English only
- remove duplicates caused by translation or phrasing variation
- keep distinct industries separate

Examples:
- "Medizintechnik" + "Medical Technology" + "Medizintechnik (Medical Technology)"
  → "Medical Technology"
- "Telekommunikation" + "Telecommunications"
  → "Telecommunications"
- "Immobilien/Facility Management" + "Real Estate Services"
  → "Real Estate Services"
- "Bankwesen" + "Banking"
  → "Banking"

TASK 3 — verifiedClaims
Collapse claims that state the same fact with minor wording differences.

Rules:
- keep one best-worded version
- merge evidence arrays
- keep the higher confidence
- preserve distinct facts
- preserve departure/separation context accurately

Examples:
- "Experienced in SAP ECC and SAP S/4HANA"
- "Experience with SAP ECC and SAP S/4HANA"
  → keep one
- "Fluent in German at C1 level"
- "German language proficiency at C1 level, fluent speaking and writing"
  → keep one

TASK 4 — openQuestions
Remove a question only if the answer is already clearly present in verifiedClaims or is directly established by the same profile evidence.
If the answer is only partial, keep the question.

Important:
- same fact stated differently = collapse
- same industry in different languages = collapse
- same evidence restated in richer prose = collapse
- do not invent broader summaries
- do not rewrite everything; only canonicalize

Return exactly:
{
  "coreSkills": string[],
  "industries": string[],
  "verifiedClaims": [{ "claim": string, "evidence": string[], "confidence": "high" | "medium" }],
  "openQuestions": string[]
}
`.trim();
}