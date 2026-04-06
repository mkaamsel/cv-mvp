/**
 * Replacement prompt generator.
 *
 * Uses the current winner's system instruction and the judge's improvement
 * advice to generate a new prompt variant. The replacement is designed to
 * inherit the winner's strengths while targeting the identified weaknesses.
 *
 * The generated prompt is saved as a plain .txt file in
 * /test-data/prompt-tournament/ so it can be loaded at runtime.
 */

import "server-only";

import OpenAI from "openai";
import fs from "fs";
import path from "path";
import { CANDIDATE_PROFILE_SCHEMA } from "@/lib/contracts/candidateProfile";

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

const OPENAI_MODEL = "gpt-4o";

const GENERATED_PROMPTS_DIR = path.join(
  process.cwd(),
  "test-data",
  "prompt-tournament",
);

function buildEvolutionInstruction(): string {
  return `
ROLE

You are an expert prompt engineer specialising in structured data extraction from professional documents.

Your task is to generate a new system instruction for an AI that extracts CandidateProfile objects from candidate documents.


INPUT

You will receive:
1. The current best-performing system instruction (the winner).
2. The judge's improvement advice — specific weaknesses identified in the winner's outputs.
3. The CandidateProfile schema the output must conform to.


YOUR TASK

Generate a new system instruction that:
1. Preserves the core strengths of the winner.
2. Directly addresses the improvement advice — add, restructure, or replace the sections identified as weak.
3. Introduces ONE targeted variation beyond the improvement advice — an experiment to test a new extraction hypothesis.
4. Remains a complete, self-contained system instruction (no references to "the winner" or this process).


RULES

- The output must be a system instruction string only — no explanation, no commentary.
- The instruction must include the schema verbatim at the end.
- The instruction must include "Return JSON only." in the output format section.
- Do not introduce domain-specific finance or legal vocabulary. The extractor is domain-agnostic.
- The instruction must be in English.


SCHEMA TO EMBED AT THE END OF YOUR OUTPUT

${CANDIDATE_PROFILE_SCHEMA}
`.trim();
}

function buildEvolutionPayload(
  winnerInstruction: string,
  improvementAdvice: string,
): string {
  return [
    "CURRENT WINNER INSTRUCTION:",
    winnerInstruction,
    "",
    "JUDGE IMPROVEMENT ADVICE:",
    improvementAdvice,
    "",
    "Generate the new system instruction now. Output the instruction text only.",
  ].join("\n");
}

/**
 * Generate a replacement prompt using the winner as a base and
 * the judge's improvement advice as the mutation target.
 *
 * Returns the generated instruction string.
 */
export async function generateReplacementPrompt(
  winnerInstruction: string,
  improvementAdvice: string,
): Promise<string | null> {
  if (!openai) {
    console.error("[generateReplacement] OpenAI client not initialised.");
    return null;
  }

  console.log("[generateReplacement] generating replacement from winner + advice");

  try {
    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      temperature: 0.6, // slightly higher temp for creative variation
      messages: [
        {
          role: "system",
          content: buildEvolutionInstruction(),
        },
        {
          role: "user",
          content: buildEvolutionPayload(winnerInstruction, improvementAdvice),
        },
      ],
    });

    const generated = response.choices[0]?.message?.content?.trim() ?? "";

    if (!generated) {
      console.error("[generateReplacement] AI returned empty response.");
      return null;
    }

    console.log("[generateReplacement] generated instruction:", generated.length, "chars");
    return generated;
  } catch (err) {
    console.error(
      "[generateReplacement] AI call failed:",
      err instanceof Error ? err.message : String(err),
    );
    return null;
  }
}

/**
 * Save a generated prompt instruction to /test-data/prompt-tournament/
 * as a plain text file. The tournament runner loads these at runtime.
 */
export function saveGeneratedPrompt(
  variantId: string,
  instruction: string,
): void {
  if (!fs.existsSync(GENERATED_PROMPTS_DIR)) {
    fs.mkdirSync(GENERATED_PROMPTS_DIR, { recursive: true });
  }

  const filePath = path.join(GENERATED_PROMPTS_DIR, `prompt-${variantId}.txt`);
  fs.writeFileSync(filePath, instruction, "utf-8");
  console.log("[generateReplacement] saved prompt to:", filePath);
}
