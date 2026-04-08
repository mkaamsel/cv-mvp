import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function asTrimmedString(value: string | null): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export async function GET(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      return NextResponse.json(
        { ok: false, error: authError.message },
        { status: 401 }
      );
    }

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "User not authenticated." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const outcome = asTrimmedString(searchParams.get("outcome"));
    const inputType = asTrimmedString(searchParams.get("inputType"));
    const outputLanguage = asTrimmedString(searchParams.get("outputLanguage"));

    let query = supabaseAdmin
      .from("tailoring_runs")
      .select(
        [
          "id",
          "user_id",
          "client_run_id",
          "run_outcome",
          "updated_at",
          "created_at",
          "job_url",
          "normalized_url",
          "input_type",
          "output_language",
          "job_geography",
          "structured_job_json",
          "extracted_text",
          "extraction_source",
          "warnings_json",
          "company_context_json",
          "market_signals_json",
          "company_research_json",
          "application_recommendation_json",
          "required_profile_json",
          "selected_evidence_json",
          "positioning_brief_json",
          "telemetry_json",
          "stage_statuses_json",
          "stage_durations_json",
          "final_cv_text",
          "final_cover_letter_text",
          "degraded_reasons_json",
          "candidate_profile_json",
        ].join(", ")
      )
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(200);

    if (outcome) {
      query = query.eq("run_outcome", outcome);
    }

    if (inputType) {
      query = query.eq("input_type", inputType);
    }

    if (outputLanguage) {
      query = query.eq("output_language", outputLanguage);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    const runs = Array.isArray(data)
      ? data.map((row: any) => {
          const { user_id, ...run } = row;
          return run;
        })
      : [];

    return NextResponse.json({
      ok: true,
      runs,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unexpected error.",
      },
      { status: 500 }
    );
  }
}
