import { runTailoringPipeline } from "@/lib/orchestration/tailoring/runTailoringPipeline";

export async function runApplicationPipeline(input: {
  candidateInput: Record<string, unknown> | null;
  jobInput: {
    jobUrl?: string;
    url?: string;
    jobDescriptionText?: string;
    jobDescription?: string;
  } | null;
  outputLanguage?: "en" | "de" | "es";
  origin?: string;
  cookieHeader?: string;
}) {
  const result = await runTailoringPipeline({
    origin: input.origin ?? "http://localhost:3000",
    cookieHeader: input.cookieHeader ?? "",
    jobUrl: input.jobInput?.jobUrl ?? input.jobInput?.url ?? "",
    jobDescriptionText:
      input.jobInput?.jobDescriptionText ?? input.jobInput?.jobDescription ?? "",
    outputLanguage: input.outputLanguage ?? "en",
    candidateProfile: input.candidateInput,
  });

  return result;
}
