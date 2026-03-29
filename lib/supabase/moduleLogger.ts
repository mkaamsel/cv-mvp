import { supabaseAdmin } from "@/lib/supabase/admin";

export async function logModuleExecution(params: {
  runId: string;
  moduleName: string;
  stage?: string;
  prompt?: string;
  rawResponse?: string;
  parsedJson?: unknown;
  status?: string;
  warnings?: unknown[];
  durationMs?: number;
}) {
  const { error } = await supabaseAdmin
    .from("application_module_logs")
    .insert({
      run_id: params.runId,
      module_name: params.moduleName,
      stage: params.stage ?? null,
      prompt: params.prompt ?? null,
      raw_response: params.rawResponse ?? null,
      parsed_json: params.parsedJson ?? null,
      status: params.status ?? "ok",
      warnings: params.warnings ?? [],
      duration_ms: params.durationMs ?? null,
    });

  if (error) {
    console.error("module log failed:", error.message);
  }
}