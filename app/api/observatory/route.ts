import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

type TailoringRunRow = {
  id: string;
  user_id: string;
  client_run_id: string | null;
  output_language: string | null;
  input_type: string | null;
  run_outcome: string | null;
  degraded_reasons_json: string[] | null;
  created_at: string;
  stage_statuses_json: Record<string, string> | null;
  stage_durations_json: Record<string, number | null> | null;
  job_geography: string | null;
};

type FeedbackRow = {
  id: number;
  run_id: string | null;
  user_id: string | null;
  stage: string;
  stars: number;
  comment: string | null;
  created_at: string;
  page: string | null;
};

function isSameUtcDay(iso: string, now: Date): boolean {
  const d = new Date(iso);
  return (
    d.getUTCFullYear() === now.getUTCFullYear() &&
    d.getUTCMonth() === now.getUTCMonth() &&
    d.getUTCDate() === now.getUTCDate()
  );
}

function daysAgoIso(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString();
}

function average(values: number[]): number {
  if (!values.length) return 0;
  return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1));
}

function normalizeLanguage(value: string | null): string {
  if (!value) return "Unknown";
  const v = value.toLowerCase();
  if (v === "en" || v === "english") return "English";
  if (v === "de" || v === "german" || v === "deutsch") return "German";
  return value;
}

function normalizeOutcome(value: string | null): string {
  if (value === "completed") return "Completed";
  if (value === "completed_with_limitations") return "With limitations";
  if (value === "failed") return "Failed";
  return "Pending";
}

export async function GET() {
  try {
    const runsSince = daysAgoIso(30);

    const [{ data: runs, error: runsError }, { data: feedback, error: feedbackError }] =
      await Promise.all([
        supabaseAdmin
          .from("tailoring_runs")
          .select(
            "id,user_id,client_run_id,output_language,input_type,run_outcome,degraded_reasons_json,created_at,stage_statuses_json,stage_durations_json,job_geography"
          )
          .gte("created_at", runsSince)
          .order("created_at", { ascending: false })
          .limit(500),
        supabaseAdmin
          .from("user_feedback")
          .select("id,run_id,user_id,stage,stars,comment,created_at,page")
          .gte("created_at", runsSince)
          .order("created_at", { ascending: false })
          .limit(500),
      ]);

    if (runsError) {
      return NextResponse.json({ ok: false, error: runsError.message }, { status: 500 });
    }

    if (feedbackError) {
      return NextResponse.json({ ok: false, error: feedbackError.message }, { status: 500 });
    }

    const runRows = (runs || []) as TailoringRunRow[];
    const feedbackRows = (feedback || []) as FeedbackRow[];
    const now = new Date();

    const totalRuns = runRows.length;
    const runsToday = runRows.filter((row) => isSameUtcDay(row.created_at, now)).length;
    const completedRuns = runRows.filter((row) => row.run_outcome === "completed").length;
    const limitedRuns = runRows.filter(
      (row) => row.run_outcome === "completed_with_limitations"
    ).length;
    const failedRuns = runRows.filter((row) => row.run_outcome === "failed").length;

    const allStageDurations = runRows.flatMap((row) =>
      Object.values(row.stage_durations_json || {}).filter(
        (value): value is number => typeof value === "number" && Number.isFinite(value)
      )
    );

    const avgStageDurationMs = Math.round(average(allStageDurations));
    const successRate = totalRuns ? Math.round((completedRuns / totalRuns) * 100) : 0;

    const qualityScores = feedbackRows.map((row) => row.stars).filter((v) => typeof v === "number");
    const avgStars = average(qualityScores);
    const lowRatedCount = feedbackRows.filter((row) => row.stars <= 3).length;
    const highRatedCount = feedbackRows.filter((row) => row.stars >= 8).length;

    const userIds = new Set(runRows.map((row) => row.user_id).filter(Boolean));
    const activeUsers30d = userIds.size;
    const activeUsersToday = new Set(
      runRows.filter((row) => isSameUtcDay(row.created_at, now)).map((row) => row.user_id)
    ).size;

    const byLanguage = Object.entries(
      runRows.reduce<Record<string, number>>((acc, row) => {
        const key = normalizeLanguage(row.output_language);
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {})
    )
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count);

    const byInputType = Object.entries(
      runRows.reduce<Record<string, number>>((acc, row) => {
        const key = row.input_type || "unknown";
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {})
    )
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count);

    const degradedReasons = Object.entries(
      runRows.reduce<Record<string, number>>((acc, row) => {
        (row.degraded_reasons_json || []).forEach((reason) => {
          acc[reason] = (acc[reason] || 0) + 1;
        });
        return acc;
      }, {})
    )
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    const stageReliability = Object.entries(
      runRows.reduce<Record<string, { success: number; partial: number; error: number }>>(
        (acc, row) => {
          const stages = row.stage_statuses_json || {};
          Object.entries(stages).forEach(([stage, status]) => {
            if (!acc[stage]) {
              acc[stage] = { success: 0, partial: 0, error: 0 };
            }

            if (status === "success") acc[stage].success += 1;
            else if (status === "partial" || status === "unavailable") acc[stage].partial += 1;
            else if (status === "error") acc[stage].error += 1;
          });
          return acc;
        },
        {}
      )
    )
      .map(([stage, values]) => ({
        stage,
        ...values,
      }))
      .sort((a, b) => a.stage.localeCompare(b.stage));

    const runsPerDayMap = runRows.reduce<Record<string, number>>((acc, row) => {
      const day = row.created_at.slice(0, 10);
      acc[day] = (acc[day] || 0) + 1;
      return acc;
    }, {});

    const runsPerDay = Object.entries(runsPerDayMap)
      .map(([day, count]) => ({ day, count }))
      .sort((a, b) => a.day.localeCompare(b.day))
      .slice(-14);

    const reviewQueue = runRows.slice(0, 20).map((row) => {
      const linkedFeedback = feedbackRows.find((entry) => entry.run_id === row.client_run_id);
      return {
        createdAt: row.created_at,
        runId: row.client_run_id || row.id,
        outcome: normalizeOutcome(row.run_outcome),
        inputType: row.input_type || "unknown",
        language: normalizeLanguage(row.output_language),
        geography: row.job_geography || "-",
        degradedReasons: row.degraded_reasons_json || [],
        stars: linkedFeedback?.stars ?? null,
        comment: linkedFeedback?.comment ?? null,
      };
    });

    const latestFeedback = feedbackRows.slice(0, 12).map((row) => ({
      createdAt: row.created_at,
      runId: row.run_id || "-",
      stage: row.stage,
      stars: row.stars,
      comment: row.comment || "",
    }));

    return NextResponse.json({
      ok: true,
      summary: {
        totalRuns,
        runsToday,
        completedRuns,
        limitedRuns,
        failedRuns,
        successRate,
        avgStageDurationMs,
        avgStars,
        lowRatedCount,
        highRatedCount,
        activeUsers30d,
        activeUsersToday,
      },
      technical: {
        degradedReasons,
        stageReliability,
      },
      quality: {
        latestFeedback,
      },
      market: {
        byLanguage,
        byInputType,
        runsPerDay,
      },
      reviewQueue,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unexpected observatory error.",
      },
      { status: 500 }
    );
  }
}