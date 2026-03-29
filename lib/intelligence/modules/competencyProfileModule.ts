import OpenAI from "openai";
import { buildCompetencyProfilePrompt } from "@/lib/prompts/competencyProfilePrompt";

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

  return JSON.parse(response.output_text);
}