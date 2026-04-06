/**
 * Tournament runner.
 *
 * Runs all active prompt variants against the same raw candidate record
 * in parallel. Returns each variant's extracted CandidateProfile output.
 *
 * Never touches the production pipeline.
 *
 * Document ingestion supports:
 *   .txt  — read directly
 *   .pdf  — text extracted via pdf-parse
 *   .jpg / .jpeg / .png — text extracted via OpenAI Vision (gpt-4o)
 */

import "server-only";

import OpenAI from "openai";
import { PDFParse } from "pdf-parse";
import type { CandidateProfile } from "@/lib/contracts/candidateProfile";
import { buildVariantAInstruction } from "./prompt-A";
import { buildVariantBInstruction } from "./prompt-B";
import { buildVariantCInstruction } from "./prompt-C";
import { buildVariantDInstruction } from "./prompt-D";
import { readRegistry } from "./variants";
import fs from "fs";
import path from "path";

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

const OPENAI_MODEL = "gpt-4o";

const TEST_DATA_DIR = path.join(process.cwd(), "test-data", "profile-inputs");

export type VariantOutput = {
  variantId: string;
  systemInstruction: string;
  profile: CandidateProfile | null;
  rawResponse: string;
  durationMs: number;
  error: string | null;
};

// ── Document text extraction ─────────────────────────────────────────────────

// Scanned PDFs yield very little text from pdf-parse — below this threshold we
// fall back to vision extraction instead.
const SCANNED_PDF_CHAR_THRESHOLD = 500;

async function extractTextFromPdf(filePath: string): Promise<string> {
  const buffer = fs.readFileSync(filePath);

  // First attempt: native text extraction.
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  const result = await parser.getText();
  const extracted = (result.text ?? "").trim();

  if (extracted.length >= SCANNED_PDF_CHAR_THRESHOLD) {
    return extracted;
  }

  // Fallback: scanned PDF — send raw bytes to gpt-4o as a file content part.
  console.log(
    `[buildRawRecord] ${path.basename(filePath)}: only ${extracted.length} chars from pdf-parse — falling back to vision`,
  );
  return extractTextFromPdfVision(filePath, buffer);
}

async function extractTextFromPdfVision(
  filePath: string,
  buffer: Buffer,
): Promise<string> {
  if (!openai) return "";
  const base64 = buffer.toString("base64");
  const filename = path.basename(filePath);

  // The OpenAI SDK v6 supports { type: "file", file: { file_data, filename } }
  // as a content part in user messages. Cast via unknown to satisfy strict TS.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filePart: any = {
    type: "file",
    file: { file_data: `data:application/pdf;base64,${base64}`, filename },
  };

  const response = await openai.chat.completions.create({
    model: OPENAI_MODEL,
    max_tokens: 4000,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Extract all text from this document. Return only the extracted text, preserving structure where possible. Do not add any commentary.",
          },
          filePart,
        ],
      },
    ],
  });
  return (response.choices[0]?.message?.content ?? "").trim();
}

async function extractTextFromImage(filePath: string): Promise<string> {
  if (!openai) return "";
  const buffer = fs.readFileSync(filePath);
  const base64 = buffer.toString("base64");
  const ext = path.extname(filePath).toLowerCase().slice(1);
  const mimeType = ext === "jpg" || ext === "jpeg" ? "image/jpeg" : "image/png";

  const response = await openai.chat.completions.create({
    model: OPENAI_MODEL,
    max_tokens: 2000,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Extract all text from this document image. Return only the extracted text, preserving structure where possible. Do not add any commentary.",
          },
          {
            type: "image_url",
            image_url: { url: `data:${mimeType};base64,${base64}` },
          },
        ],
      },
    ],
  });
  return (response.choices[0]?.message?.content ?? "").trim();
}

async function extractText(filePath: string): Promise<string> {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".txt") {
    return fs.readFileSync(filePath, "utf-8").trim();
  }
  if (ext === ".pdf") {
    return extractTextFromPdf(filePath);
  }
  if (ext === ".jpg" || ext === ".jpeg" || ext === ".png") {
    return extractTextFromImage(filePath);
  }
  return ""; // unsupported format — skip silently
}

// ── Raw record builder ───────────────────────────────────────────────────────

/**
 * Read all supported documents from /test-data/profile-inputs/ and concatenate
 * them into one raw record. This is the "dumb append" step — no filtering or
 * AI processing at this stage beyond text extraction.
 *
 * Supported: .txt, .pdf, .jpg, .jpeg, .png
 * Skipped:   .gitkeep and any other extension
 */
export async function buildRawRecord(): Promise<string> {
  if (!fs.existsSync(TEST_DATA_DIR)) {
    return "";
  }

  const SUPPORTED = new Set([".txt", ".pdf", ".jpg", ".jpeg", ".png"]);

  const files = fs
    .readdirSync(TEST_DATA_DIR)
    .filter((f) => SUPPORTED.has(path.extname(f).toLowerCase()))
    .sort(); // deterministic order

  if (files.length === 0) {
    return "";
  }

  console.log(`[buildRawRecord] ingesting ${files.length} files:`, files);

  const parts: string[] = [];

  for (const file of files) {
    const filePath = path.join(TEST_DATA_DIR, file);
    try {
      const text = await extractText(filePath);
      if (text) {
        parts.push(`--- ${file} ---\n${text}`);
        console.log(`[buildRawRecord] ${file}: ${text.length} chars`);
      } else {
        console.warn(`[buildRawRecord] ${file}: empty after extraction — skipped`);
      }
    } catch (err) {
      console.error(`[buildRawRecord] ${file}: extraction failed —`, err instanceof Error ? err.message : String(err));
    }
  }

  return parts.join("\n\n");
}

// ── Variant runner ───────────────────────────────────────────────────────────

/**
 * Map a variant ID to its system instruction builder.
 * Custom/evolved variants (E, F, G, ...) are loaded from the
 * prompt-tournament directory as plain text files.
 */
function getSystemInstruction(variantId: string): string {
  switch (variantId) {
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
        `prompt-${variantId}.txt`,
      );
      if (fs.existsSync(generatedPath)) {
        return fs.readFileSync(generatedPath, "utf-8").trim();
      }
      throw new Error(`No system instruction found for variant ${variantId}`);
    }
  }
}

/** Run a single variant against the raw record. */
async function runVariant(
  variantId: string,
  rawRecord: string,
): Promise<VariantOutput> {
  const startMs = Date.now();

  if (!openai) {
    return {
      variantId,
      systemInstruction: "",
      profile: null,
      rawResponse: "",
      durationMs: 0,
      error: "OpenAI client not initialised — check OPENAI_API_KEY.",
    };
  }

  let systemInstruction = "";
  try {
    systemInstruction = getSystemInstruction(variantId);
  } catch (err) {
    return {
      variantId,
      systemInstruction: "",
      profile: null,
      rawResponse: "",
      durationMs: Date.now() - startMs,
      error: err instanceof Error ? err.message : String(err),
    };
  }

  try {
    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      temperature: 0.1,
      messages: [
        { role: "system", content: systemInstruction },
        {
          role: "user",
          content: `Extract the CandidateProfile from the following candidate documents. Return JSON only.\n\n${rawRecord}`,
        },
      ],
      response_format: { type: "json_object" },
    });

    const rawResponse = response.choices[0]?.message?.content ?? "";

    let profile: CandidateProfile | null = null;
    try {
      profile = JSON.parse(rawResponse) as CandidateProfile;
    } catch {
      return {
        variantId,
        systemInstruction,
        profile: null,
        rawResponse,
        durationMs: Date.now() - startMs,
        error: "Failed to parse JSON response from AI.",
      };
    }

    return {
      variantId,
      systemInstruction,
      profile,
      rawResponse,
      durationMs: Date.now() - startMs,
      error: null,
    };
  } catch (err) {
    return {
      variantId,
      systemInstruction,
      profile: null,
      rawResponse: "",
      durationMs: Date.now() - startMs,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/** Run all active variants in parallel against the same raw record. */
export async function runTournament(rawRecord: string): Promise<{
  outputs: VariantOutput[];
  rawRecord: string;
}> {
  const registry = readRegistry();

  if (registry.active.length === 0) {
    throw new Error("No active variants in registry.");
  }

  console.log("[runTournament] starting with active variants:", registry.active);
  console.log("[runTournament] raw record length:", rawRecord.length, "chars");

  const outputs = await Promise.all(
    registry.active.map((variantId) => runVariant(variantId, rawRecord)),
  );

  const successCount = outputs.filter((o) => o.profile !== null).length;
  console.log(
    `[runTournament] completed: ${successCount}/${outputs.length} variants succeeded`,
  );

  return { outputs, rawRecord };
}
