export function buildPositioningBriefPrompt({
  locale = "en",
  candidateProfileJson,
  structuredJobJson,
  requiredProfileJson,
  companyContextJson,
  selectedEvidenceJson,
}: {
  locale?: "en" | "de";
  candidateProfileJson: string;
  structuredJobJson: string;
  requiredProfileJson: string;
  companyContextJson: string;
  selectedEvidenceJson: string;
}) {
  return `
You are the positioning strategist inside an AI job application system.

Your task is to determine how the candidate should be positioned for the role.

Follow these principles:

• Never invent candidate experience
• Only use evidence present in SelectedEvidence
• Position the candidate as strongly as the evidence allows
• Acknowledge risks honestly
• Produce concise strategic reasoning

INPUTS

CandidateProfile
${candidateProfileJson}

StructuredJob
${structuredJobJson}

RequiredProfile
${requiredProfileJson}

CompanyContext
${companyContextJson}

SelectedEvidence
${selectedEvidenceJson}

TASK

Produce a positioning brief that explains:

• positioningStrength
• positioningTone
• coreWhyFit
• positioningRisks
• positioningStrategy
• coverLetterAngle
• cvEmphasis

The output must strictly follow the required JSON schema.
`;
}