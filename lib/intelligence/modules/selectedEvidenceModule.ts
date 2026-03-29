import OpenAI from "openai";
import { buildSelectedEvidencePrompt } from "@/lib/prompts/selectedEvidencePrompt";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export type SelectedEvidenceItem = {
  headline: string;
  evidenceType:
    | "core_experience"
    | "domain_experience"
    | "technical_accounting"
    | "systems"
    | "reporting"
    | "controls"
    | "leadership_signal"
    | "project_experience"
    | "stakeholder_exposure"
    | "language"
    | "qualification"
    | "other";
  strength: "high" | "medium" | "light";
  relevanceReason: string;
  sourceSupport: string;
};

export type SelectedEvidenceOutput = {
  selectedEvidence: SelectedEvidenceItem[];
  evidenceGaps: string[];
  evidenceSummary: string;
};

type SelectedEvidenceModuleInput = {
  candidateText: string;
  jobDescriptionText: string;
};

export async function selectedEvidenceModule({
  candidateText,
  jobDescriptionText,
}: SelectedEvidenceModuleInput): Promise<SelectedEvidenceOutput> {
  const prompt = buildSelectedEvidencePrompt({
    candidateText,
    jobDescriptionText,
  });

  const response = await openai.responses.create({
    model: "gpt-5",
    input: prompt,
    text: {
      format: {
        type: "json_schema",
        name: "selected_evidence_output",
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            selectedEvidence: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  headline: { type: "string" },
                  evidenceType: {
                    type: "string",
                    enum: [
                      "core_experience",
                      "domain_experience",
                      "technical_accounting",
                      "systems",
                      "reporting",
                      "controls",
                      "leadership_signal",
                      "project_experience",
                      "stakeholder_exposure",
                      "language",
                      "qualification",
                      "other",
                    ],
                  },
                  strength: {
                    type: "string",
                    enum: ["high", "medium", "light"],
                  },
                  relevanceReason: { type: "string" },
                  sourceSupport: { type: "string" },
                },
                required: [
                  "headline",
                  "evidenceType",
                  "strength",
                  "relevanceReason",
                  "sourceSupport",
                ],
              },
            },
            evidenceGaps: {
              type: "array",
              items: { type: "string" },
            },
            evidenceSummary: { type: "string" },
          },
          required: ["selectedEvidence", "evidenceGaps", "evidenceSummary"],
        },
      },
    },
  });

  return JSON.parse(response.output_text) as SelectedEvidenceOutput;
}