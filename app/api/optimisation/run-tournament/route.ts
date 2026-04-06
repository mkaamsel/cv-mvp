import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { buildRawRecord, runTournament } from "@/lib/optimisation/tournament/runTournament";
import { runJudge } from "@/lib/optimisation/judge/runJudge";
import { persistTournamentRun, detectPlateau } from "@/lib/optimisation/results/leaderboard";
import { runEvolution } from "@/lib/optimisation/evolution/runEvolution";
import { readRegistry } from "@/lib/optimisation/tournament/variants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300; // tournaments run long — allow up to 5 minutes

function generateRunId(): string {
  return `tournament_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function POST(req: NextRequest) {
  console.log("[run-tournament] POST received");

  // Auth guard — tournament is authenticated but not admin-only.
  // Only logged-in users can trigger a run.
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { ok: false, message: "Not authenticated." },
        { status: 401 },
      );
    }
  } catch {
    return NextResponse.json(
      { ok: false, message: "Auth check failed." },
      { status: 401 },
    );
  }

  try {
    // Optional: accept a raw record override in the request body.
    // If not provided, reads from /test-data/profile-inputs/*.txt.
    let rawRecord = "";
    try {
      const body = (await req.json()) as { rawRecord?: string };
      if (typeof body.rawRecord === "string" && body.rawRecord.trim()) {
        rawRecord = body.rawRecord.trim();
        console.log("[run-tournament] using rawRecord from request body:", rawRecord.length, "chars");
      }
    } catch {
      // No body or non-JSON — fine, read from filesystem.
    }

    if (!rawRecord) {
      rawRecord = await buildRawRecord();
      console.log("[run-tournament] built rawRecord from filesystem:", rawRecord.length, "chars");
    }

    if (!rawRecord) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "No candidate documents found. Add .txt, .pdf, or image files to /test-data/profile-inputs/ or pass rawRecord in the request body.",
        },
        { status: 400 },
      );
    }

    // ── Step 1: Run all variants in parallel ────────────────────────────────
    const { outputs } = await runTournament(rawRecord);

    const successfulCount = outputs.filter((o) => o.profile !== null).length;
    console.log(`[run-tournament] ${successfulCount}/${outputs.length} variants succeeded`);

    if (successfulCount === 0) {
      return NextResponse.json(
        {
          ok: false,
          message: "All variant extractions failed. Check OPENAI_API_KEY and raw record format.",
          outputs: outputs.map((o) => ({
            variantId: o.variantId,
            error: o.error,
          })),
        },
        { status: 500 },
      );
    }

    // ── Step 2: Judge all outputs ────────────────────────────────────────────
    const verdict = await runJudge(rawRecord, outputs);

    if (!verdict) {
      return NextResponse.json(
        {
          ok: false,
          message: "Judge AI call failed. Variant outputs were generated but could not be scored.",
          outputs: outputs.map((o) => ({
            variantId: o.variantId,
            profileCaptured: o.profile !== null,
            error: o.error,
          })),
        },
        { status: 500 },
      );
    }

    // ── Step 3: Persist results to Supabase ─────────────────────────────────
    const runId = generateRunId();

    const profileOutputs: Record<string, Record<string, unknown> | null> = {};
    const judgeReasonings: Record<string, string> = {};

    for (const output of outputs) {
      profileOutputs[output.variantId] = output.profile as Record<string, unknown> | null;
    }
    for (const score of verdict.scores) {
      judgeReasonings[score.variantId] = score.reasoning;
    }

    try {
      await persistTournamentRun(
        runId,
        verdict.scores,
        verdict.winner,
        profileOutputs,
        judgeReasonings,
      );
      console.log("[run-tournament] results persisted, runId:", runId);
    } catch (persistError) {
      // Non-blocking — persist failure should not fail the full run response.
      console.error("[run-tournament] persist failed:", persistError);
    }

    // ── Step 4: Check for plateau ────────────────────────────────────────────
    const { plateau, reasoning: plateauReasoning } = await detectPlateau();

    // ── Step 5: Run evolution (retire loser, generate replacement) ───────────
    const registry = readRegistry();
    const currentGeneration = registry.retired.length + 1;

    let evolutionResult = null;

    if (!plateau) {
      evolutionResult = await runEvolution(verdict, outputs, currentGeneration);
      console.log("[run-tournament] evolution:", evolutionResult);
    } else {
      console.log("[run-tournament] plateau detected — skipping evolution. Promote winner to production.");
    }

    // ── Response ─────────────────────────────────────────────────────────────
    return NextResponse.json({
      ok: true,
      runId,
      verdict: {
        winner: verdict.winner,
        loser: verdict.loser,
        summary: verdict.summary,
        improvementAdvice: verdict.improvementAdvice,
        scores: verdict.scores,
      },
      plateau,
      plateauReasoning,
      evolution: evolutionResult,
      variantSummary: outputs.map((o) => ({
        variantId: o.variantId,
        profileCaptured: o.profile !== null,
        durationMs: o.durationMs,
        error: o.error,
      })),
    });
  } catch (error) {
    console.error("[run-tournament] unexpected error:", error);
    return NextResponse.json(
      {
        ok: false,
        message: "Tournament run failed with an unexpected error.",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
