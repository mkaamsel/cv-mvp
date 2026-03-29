import OpenAI from "openai";
import { buildReviewPrompt } from "@/lib/prompts/reviewPrompt";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type OutputLanguage = "English" | "German";

type ReviewModuleInput = {
  candidateText: string;
  jobDescriptionText: string;
  outputLanguage: OutputLanguage;
  cvDraft: string;
  coverLetterDraft: string;
};

type ReviewFinding = {
  severity: "high" | "medium" | "low";
  area: "cv" | "cover_letter" | "both";
  issue: string;
  recommendation: string;
};

type ReviewModuleOutput = {
  reviewFindings: ReviewFinding[];
  finalCv: string;
  finalCoverLetter: string;
  profileDiscoverySignals: string[];
};

export async function reviewModule({
  candidateText,
  jobDescriptionText,
  outputLanguage,
  cvDraft,
  coverLetterDraft,
}: ReviewModuleInput): Promise<ReviewModuleOutput> {
  const prompt = buildReviewPrompt({
    candidateText,
    jobDescriptionText,
    outputLanguage,
    cvDraft,
    coverLetterDraft,
  });

  const response = await openai.responses.create({
    model: "gpt-5",
    input: prompt,
    text: {
      format: {
        type: "json_schema",
        name: "review_module_output",
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            reviewFindings: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  severity: {
                    type: "string",
                    enum: ["high", "medium", "low"],
                  },
                  area: {
                    type: "string",
                    enum: ["cv", "cover_letter", "both"],
                  },
                  issue: { type: "string" },
                  recommendation: { type: "string" },
                },
                required: ["severity", "area", "issue", "recommendation"],
              },
            },
            finalCv: { type: "string" },
            finalCoverLetter: { type: "string" },
            profileDiscoverySignals: {
              type: "array",
              items: { type: "string" },
            },
          },
          required: [
            "reviewFindings",
            "finalCv",
            "finalCoverLetter",
            "profileDiscoverySignals",
          ],
        },
      },
    },
  });

  const text = response.output_text;
  return JSON.parse(text) as ReviewModuleOutput;
}