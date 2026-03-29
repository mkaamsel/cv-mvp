import OpenAI from "openai";
import { buildCompetencyProfilePrompt } from "@/lib/prompts/competencyProfilePrompt";
import { safeParseJSON } from "@/lib/intelligence/core/safeParseJSON";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export type CompetencyProfileOutput = {
  competencies: any[];
  competencySummary: string;
  underEvidencedButRelevant: string[];
};

type CompetencyProfileModuleInput = {
  candidateText: string;
  jobDescriptionText: string;
};

export async function competencyProfileModule({
  candidateText,
  jobDescriptionText,
}: CompetencyProfileModuleInput): Promise<CompetencyProfileOutput> {
  const prompt = buildCompetencyProfilePrompt({
    candidateText,
    jobDescriptionText,
  });

  const response = await openai.responses.create({
    model: "gpt-5",
    input: prompt,
  });

  const parsed = safeParseJSON<CompetencyProfileOutput>(response.output_text);

  if (!parsed) {
    throw new Error("competencyProfileModule returned invalid JSON.");
  }

  return {
    competencies: Array.isArray(parsed.competencies) ? parsed.competencies : [],
    competencySummary:
      typeof parsed.competencySummary === "string"
        ? parsed.competencySummary
        : "",
    underEvidencedButRelevant: Array.isArray(parsed.underEvidencedButRelevant)
      ? parsed.underEvidencedButRelevant
      : [],
  };
}