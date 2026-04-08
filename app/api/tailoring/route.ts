import { NextRequest, NextResponse } from "next/server";
import { runTailoringPipeline } from "@/lib/orchestration/tailoring/runTailoringPipeline";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type TailoringRequest = {
  jobUrl?: string;
  url?: string;
  jobDescriptionText?: string;
  jobDescription?: string;
  outputLanguage?: "en" | "de" | string;
  candidateProfile?: Record<string, unknown> | null;
};

function asString(value: unknown): string | null {
  return typeof value === "string" ? value.trim() : null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function deriveStageStatuses(trace: string[]): Record<string, string> {
  const starts = new Set<string>();
  const dones = new Set<string>();
  const fallbacks = new Set<string>();

  for (const entry of trace) {
    const colonIdx = entry.indexOf(": ");
    if (colonIdx === -1) continue;
    const layerId = entry.slice(0, colonIdx);
    const rest = entry.slice(colonIdx + 2);
    if (rest.endsWith(":start")) {
      starts.add(layerId);
    } else if (
      rest.endsWith(":done") ||
      rest.endsWith(":improved") ||
      rest.endsWith(":report") ||
      rest.endsWith(":no-change") ||  // Layer9C validation — no contradiction found
      rest.endsWith(":upgraded")      // Layer9C validation — recommendation upgraded
    ) {
      dones.add(layerId);
    } else if (rest.endsWith(":fallback")) {
      fallbacks.add(layerId);
    }
  }

  const statuses: Record<string, string> = {};
  for (const layerId of starts) {
    if (dones.has(layerId)) {
      statuses[layerId] = "success";
    } else if (fallbacks.has(layerId)) {
      statuses[layerId] = "partial";
    } else {
      statuses[layerId] = "error";
    }
  }
  return statuses;
}

// Derive true pipeline degradation events from the trace.
// These are entries where a layer crashed (:error:caught) or the AI track
// returned nothing and the rule fallback fired (:ai:fallback).
// This replaces the previous misuse of result.insights.riskAreas (application
// risk areas) which had nothing to do with pipeline health.
function deriveDegradedEvents(trace: string[]): string[] {
  return trace.filter(
    (entry) =>
      entry.includes(":error:caught") || entry.includes(":ai:fallback"),
  );
}

export async function POST(req: NextRequest) {
  console.log("[/api/tailoring] POST received", { url: req.url, origin: req.nextUrl.origin });
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      return NextResponse.json(
        { ok: false, message: authError.message },
        { status: 401 }
      );
    }

    if (!user) {
      return NextResponse.json(
        { ok: false, message: "User not authenticated." },
        { status: 401 }
      );
    }

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const { count: dailyRunCount, error: dailyRunError } = await supabase
      .from("tailoring_runs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", startOfDay.toISOString());

    if (dailyRunError) {
      return NextResponse.json(
        { ok: false, message: dailyRunError.message },
        { status: 500 }
      );
    }

    if (process.env.NODE_ENV !== "development" && (dailyRunCount ?? 0) >= 10) {
      return NextResponse.json(
        { ok: false, message: "You've used all your analysis runs for today. Your allowance resets at midnight — come back tomorrow and we'll keep going." },
        { status: 429 }
      );
    }

    const body = (await req.json()) as TailoringRequest;

    const jobUrl = asString(body.jobUrl) ?? asString(body.url) ?? "";
    const jobDescriptionText =
      asString(body.jobDescriptionText) ?? asString(body.jobDescription) ?? "";

    console.log("[/api/tailoring] body parsed:", {
      hasJobUrl: Boolean(jobUrl),
      jobDescriptionTextLength: jobDescriptionText.length,
      outputLanguage: body.outputLanguage,
      hasCandidateProfile: Boolean(body.candidateProfile),
    });

    const result = await runTailoringPipeline({
      origin: req.nextUrl.origin,
      cookieHeader: req.headers.get("cookie") ?? "",
      jobUrl,
      jobDescriptionText,
      outputLanguage: body.outputLanguage,
      candidateProfile: asRecord(body.candidateProfile),
    });

    if (!result.ok) {
      console.error("[/api/tailoring] pipeline returned error:", {
        status: result.status,
        message: result.message,
      });
      return NextResponse.json(
        {
          ok: false,
          message: result.message,
          details: result.details ?? null,
        },
        { status: result.status }
      );
    }

    console.log("[/api/tailoring] pipeline succeeded:", {
      runId: result.runId,
      hasInsights: Boolean(result.insights),
      hasFinalDrafts: Boolean(result.finalDrafts),
      hasJobProfile: Boolean(result.jobProfile),
    });

    // Persist run to Supabase for observatory/telemetry
    try {
      const bundle = asRecord(result.insights.bundle);
      const stageStatuses = deriveStageStatuses(result.telemetry.pipelineTrace);
      const degradedEvents = deriveDegradedEvents(result.telemetry.pipelineTrace);

      await supabaseAdmin.from("tailoring_runs").insert({
        user_id: user.id,
        client_run_id: result.runId,
        job_url: jobUrl || null,
        job_description_input: jobDescriptionText || null,
        normalized_url: asString(result.jobProfile.normalizedUrl) ?? null,
        output_language: result.jobProfile.outputLanguage ?? "en",
        structured_job_json: result.structuredJob,
        extracted_text: asString(result.jobProfile.extractedText) ?? null,
        extraction_source: asString(result.jobProfile.extractionSource) ?? null,
        warnings_json: asStringArray(result.jobProfile.warnings),
        company_context_json: asRecord(bundle?.companyContext) ?? null,
        market_signals_json: asRecord(bundle?.marketSignals) ?? null,
        company_research_json: asRecord(bundle?.companyResearch) ?? null,
        application_recommendation_json: asRecord(bundle?.recommendation) ?? null,
        candidate_profile_json: asRecord(bundle?.candidateProfile) ?? null,
        required_profile_json: asRecord(bundle?.requiredProfile) ?? null,
        selected_evidence_json: asRecord(bundle?.selectedEvidence) ?? null,
        positioning_brief_json: asRecord(bundle?.positioningBrief) ?? null,
        final_cv_text: asString(result.finalDrafts.finalCv) ?? null,
        final_cover_letter_text: asString(result.finalDrafts.finalCoverLetter) ?? null,
        input_type: jobUrl ? "url" : "text",
        run_outcome: result.telemetry.outcome,
        degraded_reasons_json: degradedEvents,
        telemetry_json: result.telemetry,
        stage_statuses_json: stageStatuses,
        stage_durations_json: {},
        job_geography: asString(result.jobProfile.location) ?? null,
        observation_points_json: result.observationPoints ?? [],
        jd_quality_analysis_json: result.jdQualityAnalysis ?? null,
        jd_quality_gate_json: result.jdQualityGate ?? null,
        updated_at: new Date().toISOString(),
      });
    } catch (persistError) {
      // Non-blocking — a persistence failure must not fail the user's run
      console.error("Failed to persist tailoring run:", persistError);
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Tailoring route failed:", error);

    return NextResponse.json(
      { ok: false, message: "The canonical tailoring pipeline failed." },
      { status: 500 }
    );
  }
}
