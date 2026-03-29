import { supabaseAdmin } from "@/lib/supabase/admin";

export async function saveInputs(params: {
  runId: string;
  cvSourceType?: string;
  cvFileName?: string | null;
  cvOriginalText: string;
  cvProcessedText: string;
  jobSourceType?: string;
  jobUrl?: string | null;
  jobOriginalText: string;
  jobProcessedText: string;
  extractionWarnings?: unknown[];
}) {
  const { error } = await supabaseAdmin.from("application_inputs").insert({
    run_id: params.runId,
    cv_source_type: params.cvSourceType ?? "pasted-text",
    cv_file_name: params.cvFileName ?? null,
    cv_original_text: params.cvOriginalText,
    cv_processed_text: params.cvProcessedText,
    job_source_type: params.jobSourceType ?? "pasted-text",
    job_url: params.jobUrl ?? null,
    job_original_text: params.jobOriginalText,
    job_processed_text: params.jobProcessedText,
    extraction_warnings: params.extractionWarnings ?? [],
  });

  if (error) {
    throw new Error(`saveInputs failed: ${error.message}`);
  }
}