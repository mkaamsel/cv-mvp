import OpenAI from "openai";
import { buildPositioningBriefPrompt } from "@/lib/prompts/positioningBriefPrompt";
import type { SelectedEvidenceOutput } from "./selectedEvidenceModule";
import type { CompetencyProfileOutput } from "./competencyProfileModule";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export type PositioningBriefOutput = {
  positioningStrength: "measured" | "solid" | "strong";
  positioningTone: "specialist" | "senior_specialist" | "leadership_adjacent";
  coreWhyFit: string[];
  positioningRisks: string[];
  positioningStrategy: string;
  coverLetterAngle: string;
  cvEmphasis: string[];
};

type PositioningBriefModuleInput = {
  candidateText: string;
  jobDescriptionText: string;
  selectedEvidence: SelectedEvidenceOutput;
  competencyProfile: CompetencyProfileOutput;
};

export async function positioningBriefModule({
  candidateText,
  jobDescriptionText,
  selectedEvidence,
  competencyProfile,
}: PositioningBriefModuleInput): Promise<PositioningBriefOutput> {
  const prompt = buildPositioningBriefPrompt({
    candidateText,
    jobDescriptionText,
    selectedEvidenceJson: JSON.stringify(selectedEvidence, null, 2),
    competencyProfileJson: JSON.stringify(competencyProfile, null, 2),
  });

  const response = await openai.responses.create({
    model: "gpt-5",
    input: prompt,
    text: {
      format: {
        type: "json_schema",
        name: "positioning_brief_output",
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            positioningStrength: {
              type: "string",
              enum: ["measured", "solid", "strong"],
            },
            positioningTone: {
              type: "string",
              enum: ["specialist", "senior_specialist", "leadership_adjacent"],
            },
            coreWhyFit: {
              type: "array",
              items: { type: "string" },
            },
            positioningRisks: {
              type: "array",
              items: { type: "string" },
            },
            positioningStrategy: { type: "string" },
            coverLetterAngle: { type: "string" },
            cvEmphasis: {
              type: "array",
              items: { type: "string" },
            },
          },
          required: [
            "positioningStrength",
            "positioningTone",
            "coreWhyFit",
            "positioningRisks",
            "positioningStrategy",
            "coverLetterAngle",
            "cvEmphasis",
          ],
        },
      },
    },
  });

  return JSON.parse(response.output_text) as PositioningBriefOutput;
}