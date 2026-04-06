/**
 * Leaderboard — reads tournament history from Supabase.
 *
 * Writes happen in the API route. This module provides read utilities
 * for inspecting the running leaderboard and detecting score plateau.
 */

import "server-only";

import { supabaseAdmin } from "@/lib/supabase/admin";
import type { JudgeVariantScore } from "@/lib/optimisation/judge/judgePrompt";

export type TournamentResultRow = {
  id: string;
  run_id: string;
  prompt_variant: string;
  richness_score: number;
  accuracy_score: number;
  zeugnis_score: number;
  total_score: number;
  judge_reasoning: string | null;
  profile_output: Record<string, unknown> | null;
  winner_of_run: boolean;
  created_at: string;
};

export type LeaderboardEntry = {
  variantId: string;
  runCount: number;
  avgTotal: number;
  avgRichness: number;
  avgAccuracy: number;
  avgZeugnis: number;
  winsCount: number;
};

/** Write all scores from a single tournament run to Supabase. */
export async function persistTournamentRun(
  runId: string,
  scores: JudgeVariantScore[],
  winnerVariantId: string,
  profileOutputs: Record<string, Record<string, unknown> | null>,
  judgeReasonings: Record<string, string>,
): Promise<void> {
  const rows = scores.map((score) => ({
    run_id: runId,
    prompt_variant: score.variantId,
    richness_score: score.richness,
    accuracy_score: score.accuracy,
    zeugnis_score: score.zeugnisWeight,
    total_score: score.total,
    judge_reasoning: judgeReasonings[score.variantId] ?? null,
    profile_output: profileOutputs[score.variantId] ?? null,
    winner_of_run: score.variantId === winnerVariantId,
  }));

  const { error } = await supabaseAdmin
    .from("prompt_tournament_results")
    .insert(rows);

  if (error) {
    console.error("[leaderboard] failed to persist tournament run:", error.message);
    throw new Error(`Leaderboard write failed: ${error.message}`);
  }
}

/** Read the aggregate leaderboard across all stored runs. */
export async function readLeaderboard(): Promise<LeaderboardEntry[]> {
  const { data, error } = await supabaseAdmin
    .from("prompt_tournament_results")
    .select("prompt_variant, richness_score, accuracy_score, zeugnis_score, total_score, winner_of_run")
    .order("created_at", { ascending: true });

  if (error || !data) {
    console.error("[leaderboard] failed to read:", error?.message);
    return [];
  }

  const grouped = new Map<
    string,
    {
      totals: number[];
      richness: number[];
      accuracy: number[];
      zeugnis: number[];
      wins: number;
    }
  >();

  for (const row of data) {
    const existing = grouped.get(row.prompt_variant) ?? {
      totals: [],
      richness: [],
      accuracy: [],
      zeugnis: [],
      wins: 0,
    };
    existing.totals.push(row.total_score);
    existing.richness.push(row.richness_score);
    existing.accuracy.push(row.accuracy_score);
    existing.zeugnis.push(row.zeugnis_score);
    if (row.winner_of_run) existing.wins++;
    grouped.set(row.prompt_variant, existing);
  }

  const avg = (arr: number[]) =>
    arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

  return Array.from(grouped.entries())
    .map(([variantId, stats]) => ({
      variantId,
      runCount: stats.totals.length,
      avgTotal: avg(stats.totals),
      avgRichness: avg(stats.richness),
      avgAccuracy: avg(stats.accuracy),
      avgZeugnis: avg(stats.zeugnis),
      winsCount: stats.wins,
    }))
    .sort((a, b) => b.avgTotal - a.avgTotal);
}

/**
 * Detect plateau: if the top variant's average score has not improved
 * by more than `threshold` points across the last `windowSize` runs,
 * the optimisation is considered complete.
 */
export async function detectPlateau(
  windowSize = 3,
  threshold = 1.0,
): Promise<{ plateau: boolean; reasoning: string }> {
  const { data, error } = await supabaseAdmin
    .from("prompt_tournament_results")
    .select("run_id, prompt_variant, total_score, winner_of_run, created_at")
    .eq("winner_of_run", true)
    .order("created_at", { ascending: false })
    .limit(windowSize);

  if (error || !data || data.length < windowSize) {
    return {
      plateau: false,
      reasoning: `Insufficient data for plateau detection — need ${windowSize} runs, have ${data?.length ?? 0}.`,
    };
  }

  const scores = data.map((r) => r.total_score);
  const maxScore = Math.max(...scores);
  const minScore = Math.min(...scores);
  const spread = maxScore - minScore;

  if (spread <= threshold) {
    return {
      plateau: true,
      reasoning: `Winner scores over the last ${windowSize} runs: ${scores.join(", ")}. Spread of ${spread.toFixed(1)} is within plateau threshold of ${threshold}. Optimisation complete — promote the current winner to production.`,
    };
  }

  return {
    plateau: false,
    reasoning: `Winner scores over the last ${windowSize} runs: ${scores.join(", ")}. Spread of ${spread.toFixed(1)} exceeds threshold — continue optimising.`,
  };
}
