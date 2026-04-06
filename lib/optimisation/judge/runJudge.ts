/**
 * Judge runner.
 *
 * Sends all variant outputs to the AI judge and returns a scored verdict.
 * The judge sees the source documents and all outputs but does not know
 * which prompt strategy produced each output.
 */

import "server-only";

import OpenAI from "openai";
import type { VariantOutput } from "@/lib/optimisation/tournament/runTournament";
import { buildJudgeInstruction, type JudgeVerdict } from "./judgePrompt";

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

const OPENAI_MODEL = "gpt-4o";

function buildJudgePayload(
  rawRecord: string,
  outputs: VariantOutput[],
): string {
  const successfulOutputs = outputs.filter((o) => o.profile !== null);

  const outputSections = successfulOutputs
    .map((o) => {
      return [
        `=== Variant ${o.variantId} ===`,
        JSON.stringify(o.profile, null, 2),
      ].join("\n");
    })
    .join("\n\n");

  return [
    "SOURCE DOCUMENTS (raw concatenated record — same input for all variants):",
    rawRecord,
    "",
    "EXTRACTED OUTPUTS (one per variant):",
    outputSections,
  ].join("\n");
}

export async function runJudge(
  rawRecord: string,
  outputs: VariantOutput[],
): Promise<JudgeVerdict | null> {
  if (!openai) {
    console.error("[runJudge] OpenAI client not initialised.");
    return null;
  }

  const successfulOutputs = outputs.filter((o) => o.profile !== null);

  if (successfulOutputs.length === 0) {
    console.error("[runJudge] No successful variant outputs to judge.");
    return null;
  }

  if (successfulOutputs.length === 1) {
    // Can't rank a single output — return trivial verdict.
    const only = successfulOutputs[0];
    return {
      scores: [
        {
          variantId: only.variantId,
          richness: 5,
          accuracy: 5,
          zeugnisWeight: 5,
          total: 15,
          reasoning: "Only one variant ran successfully — no comparative scoring possible.",
        },
      ],
      winner: only.variantId,
      loser: only.variantId,
      summary: "Only one variant produced output. No tournament ranking possible.",
      improvementAdvice: "Investigate why other variants failed before running again.",
    };
  }

  const systemInstruction = buildJudgeInstruction();
  const userPayload = buildJudgePayload(rawRecord, outputs);

  console.log("[runJudge] calling judge AI with", successfulOutputs.length, "variant outputs");

  try {
    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      temperature: 0.1,
      messages: [
        { role: "system", content: systemInstruction },
        {
          role: "user",
          content: `Score all variant outputs. Return JSON only.\n\n${userPayload}`,
        },
      ],
      response_format: { type: "json_object" },
    });

    const raw = response.choices[0]?.message?.content ?? "";

    try {
      const verdict = JSON.parse(raw) as JudgeVerdict;
      console.log("[runJudge] verdict:", {
        winner: verdict.winner,
        loser: verdict.loser,
        scores: verdict.scores.map((s) => ({
          variantId: s.variantId,
          total: s.total,
        })),
      });
      return verdict;
    } catch {
      console.error("[runJudge] failed to parse judge verdict JSON:", raw.slice(0, 200));
      return null;
    }
  } catch (err) {
    console.error("[runJudge] AI call failed:", err instanceof Error ? err.message : String(err));
    return null;
  }
}
