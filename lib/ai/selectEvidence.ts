import type {
  CandidateProfile,
  CompanyContext,
  EvidencePackage,
  JobProfile,
  RequiredProfile,
} from "@/types/evidence";

type BuildPromptArgs = {
  candidateProfile: CandidateProfile;
  jobProfile: JobProfile;
  requiredProfile: RequiredProfile;
  companyContext?: CompanyContext;
  outputLanguage?: string;
};

export function buildEvidenceSelectionPrompt({
  candidateProfile,
  jobProfile,
  requiredProfile,
  companyContext,
  outputLanguage = "de",
}: BuildPromptArgs): string {
  return `
You are the evidence selection engine for a job application assistant.

Your task is NOT to write a CV or cover letter.

Your task is to compare:
1. the CandidateProfile = what the candidate can credibly claim based on evidence,
2. the JobProfile = the extracted job posting,
3. the RequiredProfile = the target profile inferred from the job description,
4. the CompanyContext = the likely company and finance environment.

Your job is to select only the most relevant, verified, and safely usable evidence from the candidate profile for this target role and environment.

You must follow these rules strictly:

1. Use only information present in the CandidateProfile, JobProfile, RequiredProfile, and CompanyContext.
2. Do not invent experience, leadership, ownership, achievements, dates, chronology, systems expertise, industry depth, or language fluency.
3. Distinguish clearly between:
   - direct_match
   - adjacent_match
   - partial_match
   - not_verified
4. Prefer credibility over aggressiveness.
5. For each selected theme, produce:
   - why it matters for the job
   - which candidate evidence supports it
   - a safe claim
   - unsafe claims to avoid
6. Explicitly exclude evidence that is weak, unverified, or likely to cause overstatement.
7. If leadership is not clearly verified, do NOT position the candidate as a people leader.
8. If chronology is unclear, do NOT use phrases like "current role", "most recent role", or "last role".
9. Use CompanyContext only to interpret relevance and positioning. Do NOT use CompanyContext to invent candidate experience.
10. Distinguish clearly between:
    - verified strengths
    - adjacent but usable positioning
    - unsupported requirements
    - environmental synergies
11. Never upgrade adjacent evidence into direct experience.
12. Keep tone conservative, supportive, and professionally useful.
13. Output valid JSON only. No markdown. No explanation.

The output language for all text values should be: ${outputLanguage}

Return JSON in exactly this shape:
{
  "required_profile_summary": {
    "target_title": "string",
    "company": "string",
    "language": "string",
    "seniority_expected": "string",
    "core_requirements": ["string"],
    "secondary_requirements": ["string"],
    "leadership_expectation": "string",
    "critical_gaps": ["string"]
  },
  "company_context_summary": {
    "industry": ["string"],
    "finance_environment": ["string"],
    "regulatory_intensity": "low | medium | high | unknown",
    "international_exposure": "low | medium | high | unknown",
    "positioning_synergies": ["string"]
  },
  "candidate_positioning": {
    "core_profile": "string",
    "positioning_strategy": "string",
    "credibility_level": "high | medium | low",
    "tone": "credible_supportive_conservative"
  },
  "selected_evidence": [
    {
      "theme": "string",
      "relevance_to_job": "high | medium | low",
      "match_type": "direct_match | adjacent_match | partial_match | not_verified",
      "why_it_matters": "string",
      "candidate_evidence": ["string"],
      "safe_claim": "string",
      "unsafe_claims_to_avoid": ["string"]
    }
  ],
  "missing_or_unsupported_requirements": [
    {
      "theme": "string",
      "reason": "string",
      "safe_positioning_if_any": "string"
    }
  ],
  "excluded_evidence": [
    {
      "item": "string",
      "reason": "string"
    }
  ],
  "document_guidance": {
    "cv_focus": ["string"],
    "cover_letter_focus": ["string"],
    "keywords_to_use_if_supported": ["string"],
    "keywords_to_avoid_if_unverified": ["string"],
    "narrative_direction": "string"
  }
}

CandidateProfile:
${JSON.stringify(candidateProfile, null, 2)}

JobProfile:
${JSON.stringify(jobProfile, null, 2)}

RequiredProfile:
${JSON.stringify(requiredProfile, null, 2)}

CompanyContext:
${JSON.stringify(companyContext ?? {}, null, 2)}
`.trim();
}

/**
 * Extracts plain text from the OpenAI Responses API payload.
 * Handles common response shapes safely.
 */
function extractTextFromResponsesApi(data: unknown): string {
  if (!data || typeof data !== "object") {
    throw new Error("Invalid OpenAI response: response is not an object.");
  }

  const maybeData = data as {
    output_text?: string;
    output?: Array<{
      content?: Array<{
        type?: string;
        text?: string;
      }>;
    }>;
  };

  if (
    typeof maybeData.output_text === "string" &&
    maybeData.output_text.trim()
  ) {
    return maybeData.output_text.trim();
  }

  const output = maybeData.output;
  if (!Array.isArray(output)) {
    throw new Error("Invalid OpenAI response: missing output array.");
  }

  const textParts: string[] = [];

  for (const item of output) {
    if (!item?.content || !Array.isArray(item.content)) continue;

    for (const contentItem of item.content) {
      if (
        contentItem?.type === "output_text" &&
        typeof contentItem.text === "string"
      ) {
        textParts.push(contentItem.text);
      }
    }
  }

  const combined = textParts.join("\n").trim();

  if (!combined) {
    throw new Error("OpenAI response did not contain readable text output.");
  }

  return combined;
}

/**
 * Attempts to parse the returned JSON safely.
 * Also strips accidental markdown fences if the model returns them.
 */
export function parseEvidenceSelectionResponse(data: unknown): EvidencePackage {
  const rawText = extractTextFromResponsesApi(data);

  const cleaned = rawText
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned) as EvidencePackage;
  } catch {
    throw new Error(
      `Failed to parse evidence package JSON. Raw response was: ${cleaned}`
    );
  }
}