/**
 * Profile chat — conversational assistant for the profile builder page.
 *
 * Handles two concerns:
 *   1. Workflow guidance and profile-building prompts (existing)
 *   2. Profile corrections — user says "remove SAP", "I left voluntarily",
 *      "add Prince2 2019" and the profile is updated and logged immediately.
 *
 * Language: auto-detects from each user message and returns `detectedLanguage`.
 *           The page follows the detected language immediately.
 *
 * Returns `correctedProfile` and `correctionEntry` when a correction is applied.
 * User corrections are logged in CorrectionLog — AI re-extraction never removes them.
 */

import OpenAI from "openai";
import { detectLanguage } from "@/lib/profile/languageDetection";
import type { SupportedLanguage } from "@/lib/profile/languageDetection";
import type { CorrectionLogEntry } from "@/lib/profile/profile-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ── Types ────────────────────────────────────────────────────────────────────

type ProfileChatRequest = {
  locale?: string;
  userMessage: string;
  activePrompt?: string | null;
  pendingPromptCount?: number;
  currentProfile?: unknown;
};

type SuggestedAction =
  | "add_manual_summary"
  | "paste_into_primary_cv"
  | "add_user_note"
  | "click_build_profile"
  | "answer_active_prompt"
  | "correction_applied"
  | "no_action";

type ProfileChatSuccess = {
  ok: true;
  assistantMessage: string;
  answeredActivePrompt: boolean;
  shouldCaptureAsNote: boolean;
  suggestedAction: SuggestedAction;
  detectedLanguage: SupportedLanguage;
  // Correction fields — present when a profile correction was applied
  correctionApplied: boolean;
  correctedProfile: unknown | null;
  correctionEntry: CorrectionLogEntry | null;
};

type ProfileChatError = {
  ok: false;
  error: string;
};

// ── OpenAI client ────────────────────────────────────────────────────────────

const MODEL_PRIORITY = [
  process.env.OPENAI_MODEL_PROFILE_CHAT,
  process.env.OPENAI_MODEL_EXTRACT_CANDIDATE_PROFILE,
  "gpt-4.1-mini",
  "gpt-4o-mini",
].filter(Boolean) as string[];

const CORRECTION_MODEL = "gpt-4o";

function jsonResponse(body: ProfileChatSuccess | ProfileChatError, status = 200): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

function isModelNotAvailableError(error: unknown): boolean {
  const e = error as { message?: string; code?: string } | null;
  if (!e) return false;
  const msg = (e.message ?? "").toLowerCase();
  const code = (e.code ?? "").toLowerCase();
  return (
    msg.includes("does not exist") || msg.includes("not found") ||
    msg.includes("unknown model") || code.includes("model") ||
    (msg.includes("model") && msg.includes("not"))
  );
}

// ── Chat instruction builder ─────────────────────────────────────────────────

function buildChatInstruction(lang: SupportedLanguage): string {
  const languageHint =
    lang === "de"
      ? "Respond in German unless the user clearly switches to another language."
      : lang === "es"
        ? "Respond in Spanish unless the user clearly switches to another language."
        : "Respond in English unless the user clearly switches to another language.";

  return `
You are a helpful assistant inside a candidate profile builder for a job application tool.

Your role has THREE valid functions:
1. Help the user use the profile page and workflow correctly.
2. Help the user build a stronger candidate profile.
3. Apply direct corrections to the user's profile when they request them.

Interpret the user's message as one of these intents:
- workflow_help: asking how to use the page, what to do next, how the process works
- profile_answer: directly answering the current active prompt
- profile_note: adding useful career information that should be retained as a note
- profile_correction: asking to change, add, or remove something in their stored profile
- mixed: message contains multiple intents

CORRECTION DETECTION
Set intent = "profile_correction" when the user's message:
- Removes something: "remove SAP", "delete that entry", "take out the Excel row"
- Corrects a fact: "I left voluntarily", "the date is wrong", "that company name is incorrect"
- Adds something explicitly: "add Prince2 2019", "include IFRS certification", "my title was Senior Analyst"
- Overrides AI text: "that summary is wrong", "rewrite the headline as..."

GENERAL RULES
- Be concise, practical, and specific to this page.
- Do not claim the profile was permanently updated unless correctionApplied = true.
- Prefer concrete next actions over abstract explanations.

WORKFLOW HELP
- Guide the user using the actual workflow: paste CV → add sources → Build profile → correct via chat
- For PDF text extraction issues, suggest OCR or manual note entry
- For multilingual documents, confirm they are acceptable

PROFILE LOGIC
- If intent is profile_answer and the user answers the active prompt, set answeredActivePrompt = true
- If intent is profile_note, set shouldCaptureAsNote = true
- If intent is profile_correction, set correctionApplied accordingly

ACTION SELECTION
- correction: suggestedAction = "correction_applied"
- fallback/summary needed: suggestedAction = "add_manual_summary"
- paste to CV box: suggestedAction = "paste_into_primary_cv"
- add user note: suggestedAction = "add_user_note"
- ready to build: suggestedAction = "click_build_profile"
- answering active prompt: suggestedAction = "answer_active_prompt"
- otherwise: suggestedAction = "no_action"

STYLE
- Keep assistantMessage to 2–5 sentences.
- End with one practical next step or one clarifying question when helpful.
- Avoid repeating the user's message back to them.

Return JSON only in exactly this shape:
{
  "intent": "workflow_help" | "profile_answer" | "profile_note" | "profile_correction" | "mixed",
  "assistantMessage": string,
  "answeredActivePrompt": boolean,
  "shouldCaptureAsNote": boolean,
  "suggestedAction": "add_manual_summary" | "paste_into_primary_cv" | "add_user_note" | "click_build_profile" | "answer_active_prompt" | "correction_applied" | "no_action"
}

${languageHint}
`.trim();
}

// ── Correction instruction builder ───────────────────────────────────────────

function buildCorrectionInstruction(lang: SupportedLanguage): string {
  const langHint =
    lang === "de" ? "Write correctionSummary in German."
    : lang === "es" ? "Write correctionSummary in Spanish."
    : "Write correctionSummary in English.";

  return `
You are a profile correction engine.

The user wants to make a specific change to their candidate profile.
Apply ONLY the change described in the user instruction.
Do not modify any other fields.
Return the complete updated profile plus a one-sentence correctionSummary.

CRITICAL RULES:
1. Apply ONLY the exact change requested. Nothing else.
2. All other profile fields must remain bit-for-bit identical to the input.
3. Do not improve, rewrite, expand, or clean up any untouched fields.
4. If removing: find and delete only the exact item specified.
5. If adding: append the new item to the appropriate array (certifications, tools, coreSkills, etc.).
6. If updating a text field: change only the specific value mentioned.
7. Never remove entries from correctionLog — it is append-only and permanent.
8. Return the corrected profile as a JSON object at key "correctedProfile".
9. Return a one-sentence summary at key "correctionSummary" describing what changed.

Return JSON only:
{
  "correctedProfile": { ...full profile... },
  "correctionSummary": "..."
}

${langHint}
`.trim();
}

// ── Model calls ──────────────────────────────────────────────────────────────

type ChatParsed = {
  intent?: string;
  assistantMessage?: string;
  answeredActivePrompt?: boolean;
  shouldCaptureAsNote?: boolean;
  suggestedAction?: SuggestedAction;
};

async function runChatCall(
  client: OpenAI,
  instructions: string,
  inputText: string,
): Promise<{ parsed: ChatParsed; modelUsed: string }> {
  let lastError: unknown = null;

  for (const model of MODEL_PRIORITY) {
    try {
      const response = await client.responses.create({ model, instructions, input: [{ role: "user", content: [{ type: "input_text", text: inputText }] }] });
      const text = response.output_text?.trim() ?? "";

      let parsed: ChatParsed;
      try {
        const raw = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
        parsed = JSON.parse(raw) as ChatParsed;
      } catch {
        parsed = { assistantMessage: text || "Understood.", answeredActivePrompt: false, shouldCaptureAsNote: false, suggestedAction: "no_action" };
      }

      return { parsed, modelUsed: model };
    } catch (err) {
      if (!isModelNotAvailableError(err)) throw err;
      lastError = err;
    }
  }

  throw lastError ?? new Error("All fallback models failed.");
}

async function runCorrectionCall(
  client: OpenAI,
  currentProfile: unknown,
  userInstruction: string,
  lang: SupportedLanguage,
): Promise<{ correctedProfile: unknown; correctionSummary: string } | null> {
  try {
    const response = await client.chat.completions.create({
      model: CORRECTION_MODEL,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: buildCorrectionInstruction(lang) },
        {
          role: "user",
          content: `Current profile:\n${JSON.stringify(currentProfile)}\n\nUser instruction: ${userInstruction}`,
        },
      ],
    });

    const raw = response.choices[0]?.message?.content ?? "";
    const parsed = JSON.parse(raw) as { correctedProfile?: unknown; correctionSummary?: string };

    if (!parsed.correctedProfile) return null;

    return {
      correctedProfile: parsed.correctedProfile,
      correctionSummary: typeof parsed.correctionSummary === "string" ? parsed.correctionSummary : "Profile updated.",
    };
  } catch (err) {
    console.error("[profile-chat] correction call failed:", err instanceof Error ? err.message : String(err));
    return null;
  }
}

// ── ID generator ─────────────────────────────────────────────────────────────

function generateId(): string {
  return `corr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(request: Request): Promise<Response> {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return jsonResponse({ ok: false, error: "Missing OPENAI_API_KEY." }, 500);
    }

    const body = (await request.json()) as Partial<ProfileChatRequest>;

    if (!body.userMessage?.trim()) {
      return jsonResponse({ ok: false, error: "userMessage is required." }, 400);
    }

    const userMessage = body.userMessage.trim();

    // Auto-detect language from the user's message — follow immediately if they switch
    const detectedLanguage = detectLanguage(userMessage);

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const inputText = `
Page purpose:
This page helps the user build a reusable candidate profile before tailoring jobs and generating CVs or cover letters.

Current active prompt:
${body.activePrompt?.trim() || "None"}

Pending prompt count:
${typeof body.pendingPromptCount === "number" ? body.pendingPromptCount : 0}

Current profile context:
${JSON.stringify(body.currentProfile ?? null)}

User message:
${userMessage}
    `.trim();

    // Step 1: Classify intent and generate assistant message
    const { parsed } = await runChatCall(client, buildChatInstruction(detectedLanguage), inputText);

    const isCorrection = parsed.intent === "profile_correction";
    let correctionApplied = false;
    let correctedProfile: unknown = null;
    let correctionEntry: CorrectionLogEntry | null = null;

    // Step 2: If correction intent and profile provided, apply the correction
    if (isCorrection && body.currentProfile) {
      const correctionResult = await runCorrectionCall(
        client,
        body.currentProfile,
        userMessage,
        detectedLanguage,
      );

      if (correctionResult) {
        correctionApplied = true;
        correctedProfile = correctionResult.correctedProfile;

        correctionEntry = {
          id: generateId(),
          timestamp: new Date().toISOString(),
          field: "profile",
          action: "update",
          value: correctionResult.correctionSummary,
          userInstruction: userMessage,
          sourceType: "user_prompt",
          sourceDetail: `Chat correction: ${userMessage.slice(0, 120)}`,
          language: detectedLanguage,
        };
      }
    }

    const assistantMessage =
      typeof parsed.assistantMessage === "string" && parsed.assistantMessage.trim()
        ? parsed.assistantMessage.trim()
        : correctionApplied
          ? "Done — profile updated."
          : "Understood.";

    return jsonResponse({
      ok: true,
      assistantMessage,
      answeredActivePrompt: Boolean(parsed.answeredActivePrompt),
      shouldCaptureAsNote: Boolean(parsed.shouldCaptureAsNote),
      suggestedAction: correctionApplied
        ? "correction_applied"
        : (parsed.suggestedAction ?? "no_action"),
      detectedLanguage,
      correctionApplied,
      correctedProfile,
      correctionEntry,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown server error.";
    return jsonResponse({ ok: false, error: message }, 500);
  }
}
