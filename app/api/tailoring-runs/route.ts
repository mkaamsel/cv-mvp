import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

type TailoringRunPayload = {
  clientRunId?: string;
  jobUrl?: string;
  jobDescriptionInput?: string;
  normalizedUrl?: string;
  outputLanguage?: string;
  structuredJobJson?: Record<string, unknown> | null;
  extractedText?: string;
  extractionSource?: string;
  warningsJson?: string[];
  companyContextJson?: Record<string, unknown> | null;
  marketSignalsJson?: Record<string, unknown> | null;
  companyResearchJson?: Record<string, unknown> | null;
  applicationRecommendationJson?: Record<string, unknown> | null;
  finalCvText?: string;
  finalCoverLetterText?: string;
  inputType?: string;
  runOutcome?: string;
  degradedReasonsJson?: string[];
  telemetryJson?: Record<string, unknown> | null;
  stageStatusesJson?: Record<string, unknown> | null;
  stageDurationsJson?: Record<string, unknown> | null;
  jobGeography?: string | null;
};

function asTrimmedString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function asObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    route: "tailoring-runs",
    method: "GET",
    message: "Tailoring runs route is live. Use POST to create or update a run.",
  });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as TailoringRunPayload;

    const clientRunId = asTrimmedString(body.clientRunId);

    if (!clientRunId) {
      return NextResponse.json(
        { ok: false, error: "Missing clientRunId." },
        { status: 400 }
      );
    }

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

    const payload = {
      user_id: user.id,
      client_run_id: clientRunId,
      job_url: asTrimmedString(body.jobUrl),
      job_description_input: asTrimmedString(body.jobDescriptionInput),
      normalized_url: asTrimmedString(body.normalizedUrl),
      output_language: asTrimmedString(body.outputLanguage),
      structured_job_json: asObject(body.structuredJobJson),
      extracted_text: asTrimmedString(body.extractedText),
      extraction_source: asTrimmedString(body.extractionSource),
      warnings_json: asStringArray(body.warningsJson),
      company_context_json: asObject(body.companyContextJson),
      market_signals_json: asObject(body.marketSignalsJson),
      company_research_json: asObject(body.companyResearchJson),
      application_recommendation_json: asObject(body.applicationRecommendationJson),
      final_cv_text: asTrimmedString(body.finalCvText),
      final_cover_letter_text: asTrimmedString(body.finalCoverLetterText),
      input_type: asTrimmedString(body.inputType),
      run_outcome: asTrimmedString(body.runOutcome),
      degraded_reasons_json: asStringArray(body.degradedReasonsJson),
      telemetry_json: asObject(body.telemetryJson) ?? {},
      stage_statuses_json: asObject(body.stageStatusesJson) ?? {},
      stage_durations_json: asObject(body.stageDurationsJson) ?? {},
      job_geography: asTrimmedString(body.jobGeography),
      updated_at: new Date().toISOString(),
    };

    const { data: existing, error: existingError } = await supabaseAdmin
      .from("tailoring_runs")
      .select("id, client_run_id, run_outcome, created_at, updated_at")
      .eq("user_id", user.id)
      .eq("client_run_id", clientRunId)
      .maybeSingle();

    if (existingError) {
      return NextResponse.json(
        { ok: false, error: existingError.message },
        { status: 500 }
      );
    }

    if (existing?.id) {
      const { data, error } = await supabaseAdmin
        .from("tailoring_runs")
        .update(payload)
        .eq("id", existing.id)
        .select("id, client_run_id, run_outcome, created_at, updated_at")
        .single();

      if (error) {
        return NextResponse.json(
          { ok: false, error: error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        ok: true,
        mode: "updated",
        message: "Tailoring run updated successfully.",
        run: data,
      });
    }

    const { data, error } = await supabaseAdmin
      .from("tailoring_runs")
      .insert(payload)
      .select("id, client_run_id, run_outcome, created_at, updated_at")
      .single();

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      mode: "inserted",
      message: "Tailoring run created successfully.",
      run: data,
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