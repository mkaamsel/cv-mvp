import { supabaseAdmin } from "@/lib/supabase/admin";

export async function saveOutputs(params: {
  runId: string;
  draftCv?: string | null;
  draftCoverLetter?: string | null;
  finalCv?: string | null;
  finalCoverLetter?: string | null;
  reviewFindings?: unknown[];
  discoverySignals?: unknown[];
}) {
  const { error } = await supabaseAdmin.from("application_outputs").insert({
    run_id: params.runId,
    draft_cv: params.draftCv ?? null,
    draft_cover_letter: params.draftCoverLetter ?? null,
    final_cv: params.finalCv ?? null,
    final_cover_letter: params.finalCoverLetter ?? null,
    review_findings: params.reviewFindings ?? [],
    discovery_signals: params.discoverySignals ?? [],
  });

  if (error) {
    throw new Error(`saveOutputs failed: ${error.message}`);
  }
}