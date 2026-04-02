export type PipelineInput = {
  candidateInput: Record<string, unknown> | null;
  jobInput:
    | {
        jobUrl?: string;
        url?: string;
        jobDescriptionText?: string;
        jobDescription?: string;
      }
    | null;
  outputLanguage?: "en" | "de";
  origin?: string;
  cookieHeader?: string;
};

export type PipelineResult = {
  migrated: true;
  message: string;
  nextStep: string;
  input: {
    candidateInput: Record<string, unknown> | null;
    jobInput:
      | {
          jobUrl?: string;
          url?: string;
          jobDescriptionText?: string;
          jobDescription?: string;
        }
      | null;
    outputLanguage: "en" | "de";
    origin?: string;
    cookieHeader?: string;
  };
};

export async function runPipeline({
  candidateInput,
  jobInput,
  outputLanguage = "en",
  origin,
  cookieHeader,
}: PipelineInput): Promise<PipelineResult> {
  return {
    migrated: true,
    message:
      "Legacy sequencing pipeline is retired. Use runTailoringPipeline from lib/orchestration/tailoring/runTailoringPipeline.",
    nextStep: "runTailoringPipeline",
    input: {
      candidateInput,
      jobInput,
      outputLanguage,
      origin,
      cookieHeader,
    },
  };
}