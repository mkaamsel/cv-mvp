import { supabaseAdmin } from "@/lib/supabase/admin";

type ClarificationItemInput = {
  itemKey: string;
  itemGroup: string;
  prompt: string;
  detectedFrom: string;
  importance: "high" | "medium" | "low";
  suggestedValue?: string;
  mapsToProfileKey?: string;
};

export async function createClarificationSession(params: {
  userId: string;
  runId: string;
  clarificationPayload: unknown;
}) {
  const { data, error } = await supabaseAdmin
    .from("application_clarification_sessions")
    .insert({
      user_id: params.userId,
      run_id: params.runId,
      status: "open",
      clarification_payload: params.clarificationPayload,
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(`createClarificationSession failed: ${error.message}`);
  }

  return data.id as string;
}

export async function saveClarificationItems(params: {
  sessionId: string;
  userId: string;
  runId: string;
  items: ClarificationItemInput[];
}) {
  if (params.items.length === 0) {
    return;
  }

  const payload = params.items.map((item) => ({
    session_id: params.sessionId,
    user_id: params.userId,
    run_id: params.runId,
    item_key: item.itemKey,
    item_group: item.itemGroup,
    prompt: item.prompt,
    detected_from: item.detectedFrom,
    importance: item.importance,
    status: "pending",
    suggested_value: item.suggestedValue ?? null,
    maps_to_profile_key: item.mapsToProfileKey ?? null,
    source_type: "clarification",
  }));

  const { error } = await supabaseAdmin
    .from("application_clarification_items")
    .insert(payload);

  if (error) {
    throw new Error(`saveClarificationItems failed: ${error.message}`);
  }
}