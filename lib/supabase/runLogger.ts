import { supabaseAdmin } from "@/lib/supabase/admin";

export async function createRun(params: {
  mode: string;
  outputLanguage: string;
  modelName?: string;
}) {
  const { data, error } = await supabaseAdmin
    .from("application_runs")
    .insert({
      mode: params.mode,
      output_language: params.outputLanguage,
      status: "running",
      current_stage: "input_prepared",
      model_name: params.modelName ?? "gpt-5",
      warnings: [],
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(`createRun failed: ${error.message}`);
  }

  return data.id as string;
}

export async function updateRunStage(params: {
  runId: string;
  currentStage: string;
  status?: string;
  warnings?: unknown[];
}) {
  const updatePayload: Record<string, unknown> = {
    current_stage: params.currentStage,
  };

  if (params.status) updatePayload.status = params.status;
  if (params.warnings) updatePayload.warnings = params.warnings;

  const { error } = await supabaseAdmin
    .from("application_runs")
    .update(updatePayload)
    .eq("id", params.runId);

  if (error) {
    throw new Error(`updateRunStage failed: ${error.message}`);
  }
}

export async function completeRun(params: {
  runId: string;
  durationMs: number;
  warnings?: unknown[];
}) {
  const { error } = await supabaseAdmin
    .from("application_runs")
    .update({
      status: "completed",
      current_stage: "done",
      duration_ms: params.durationMs,
      warnings: params.warnings ?? [],
    })
    .eq("id", params.runId);

  if (error) {
    throw new Error(`completeRun failed: ${error.message}`);
  }
}

export async function failRun(params: {
  runId: string;
  errorText: string;
  warnings?: unknown[];
}) {
  const { error } = await supabaseAdmin
    .from("application_runs")
    .update({
      status: "failed",
      error_text: params.errorText,
      warnings: params.warnings ?? [],
    })
    .eq("id", params.runId);

  if (error) {
    throw new Error(`failRun failed: ${error.message}`);
  }
}