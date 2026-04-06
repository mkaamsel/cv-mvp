/**
 * Evolution orchestrator.
 *
 * After each tournament:
 * 1. Retire the lowest-scoring variant (from registry + file).
 * 2. Generate a replacement prompt using the winner as a base.
 * 3. Save the replacement to /test-data/prompt-tournament/.
 * 4. Update the registry to include the new variant.
 *
 * This module never runs automatically. It is called by the tournament API
 * route after the judge has delivered its verdict.
 */

import "server-only";

import type { JudgeVerdict } from "@/lib/optimisation/judge/judgePrompt";
import type { VariantOutput } from "@/lib/optimisation/tournament/runTournament";
import {
  readRegistry,
  writeRegistry,
  retireVariant,
  registerNewVariant,
} from "@/lib/optimisation/tournament/variants";
import {
  generateReplacementPrompt,
  saveGeneratedPrompt,
} from "./generateReplacement";
import { buildVariantAInstruction } from "@/lib/optimisation/tournament/prompt-A";
import { buildVariantBInstruction } from "@/lib/optimisation/tournament/prompt-B";
import { buildVariantCInstruction } from "@/lib/optimisation/tournament/prompt-C";
import { buildVariantDInstruction } from "@/lib/optimisation/tournament/prompt-D";
import fs from "fs";
import path from "path";

function getWinnerInstruction(
  winnerVariantId: string,
  outputs: VariantOutput[],
): string {
  const winnerOutput = outputs.find((o) => o.variantId === winnerVariantId);
  if (winnerOutput?.systemInstruction) {
    return winnerOutput.systemInstruction;
  }

  // Fallback to static builders for seed variants
  switch (winnerVariantId) {
    case "A":
      return buildVariantAInstruction();
    case "B":
      return buildVariantBInstruction();
    case "C":
      return buildVariantCInstruction();
    case "D":
      return buildVariantDInstruction();
    default: {
      const generatedPath = path.join(
        process.cwd(),
        "test-data",
        "prompt-tournament",
        `prompt-${winnerVariantId}.txt`,
      );
      if (fs.existsSync(generatedPath)) {
        return fs.readFileSync(generatedPath, "utf-8").trim();
      }
      return "";
    }
  }
}

function getVariantLabel(variantId: string): string {
  const labels: Record<string, string> = {
    A: "Standard Evidence-Guided",
    B: "Zeugnis-First",
    C: "Evidence-Chain Attribution",
    D: "Breadth-First Capture",
  };
  return labels[variantId] ?? `Generated variant ${variantId}`;
}

export type EvolutionResult = {
  retiredVariantId: string;
  newVariantId: string;
  generationNumber: number;
  replacementSaved: boolean;
  registryUpdated: boolean;
  error: string | null;
};

/**
 * Run the evolution step: retire loser, generate replacement, update registry.
 */
export async function runEvolution(
  verdict: JudgeVerdict,
  outputs: VariantOutput[],
  currentGeneration: number,
): Promise<EvolutionResult> {
  const { winner: winnerVariantId, loser: loserVariantId, improvementAdvice } = verdict;

  console.log("[runEvolution] retiring:", loserVariantId, "| winner base:", winnerVariantId);

  // Step 1: Get the winner's instruction for use as the evolution base.
  const winnerInstruction = getWinnerInstruction(winnerVariantId, outputs);

  if (!winnerInstruction) {
    return {
      retiredVariantId: loserVariantId,
      newVariantId: "",
      generationNumber: currentGeneration + 1,
      replacementSaved: false,
      registryUpdated: false,
      error: `Could not find system instruction for winner variant ${winnerVariantId}.`,
    };
  }

  // Step 2: Generate the replacement prompt.
  const replacementInstruction = await generateReplacementPrompt(
    winnerInstruction,
    improvementAdvice,
  );

  if (!replacementInstruction) {
    return {
      retiredVariantId: loserVariantId,
      newVariantId: "",
      generationNumber: currentGeneration + 1,
      replacementSaved: false,
      registryUpdated: false,
      error: "Failed to generate replacement prompt — AI call returned null.",
    };
  }

  // Step 3: Update the registry.
  let registry = readRegistry();
  const loserLabel = getVariantLabel(loserVariantId);

  registry = retireVariant(
    registry,
    loserVariantId,
    loserLabel,
    currentGeneration,
  );

  const { registry: updatedRegistry, newId } = registerNewVariant(registry);
  updatedRegistry.active; // ensure type is correct

  // Step 4: Save the generated prompt to filesystem.
  try {
    saveGeneratedPrompt(newId, replacementInstruction);
  } catch (err) {
    return {
      retiredVariantId: loserVariantId,
      newVariantId: newId,
      generationNumber: currentGeneration + 1,
      replacementSaved: false,
      registryUpdated: false,
      error: `Failed to save replacement prompt: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  // Step 5: Write the updated registry.
  try {
    writeRegistry(updatedRegistry);
  } catch (err) {
    return {
      retiredVariantId: loserVariantId,
      newVariantId: newId,
      generationNumber: currentGeneration + 1,
      replacementSaved: true,
      registryUpdated: false,
      error: `Failed to write registry: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  console.log("[runEvolution] done:", {
    retired: loserVariantId,
    newVariant: newId,
    activeVariants: updatedRegistry.active,
  });

  return {
    retiredVariantId: loserVariantId,
    newVariantId: newId,
    generationNumber: currentGeneration + 1,
    replacementSaved: true,
    registryUpdated: true,
    error: null,
  };
}
