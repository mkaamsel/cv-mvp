import OpenAI from "openai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ProfileChatRequest = {
  locale?: "en" | "de";
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
  | "no_action";

type ProfileChatSuccess = {
  ok: true;
  assistantMessage: string;
  answeredActivePrompt: boolean;
  shouldCaptureAsNote: boolean;
  suggestedAction: SuggestedAction;
};

type ProfileChatError = {
  ok: false;
  error: string;
};

const MODEL_PRIORITY = [
  process.env.OPENAI_MODEL_PROFILE_CHAT,
  process.env.OPENAI_MODEL_EXTRACT_CANDIDATE_PROFILE,
  "gpt-4.1-mini",
  "gpt-4o-mini",
].filter(Boolean) as string[];

function jsonResponse(
  body: ProfileChatSuccess | ProfileChatError,
  status = 200
): Response {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

function isModelNotAvailableError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;

  const maybeError = error as {
    message?: unknown;
    code?: unknown;
  };

  const message =
    typeof maybeError.message === "string"
      ? maybeError.message.toLowerCase()
      : "";

  const code =
    typeof maybeError.code === "string" ? maybeError.code.toLowerCase() : "";

  return (
    message.includes("does not exist") ||
    message.includes("not found") ||
    message.includes("unknown model") ||
    code.includes("model") ||
    (message.includes("model") && message.includes("not"))
  );
}

async function callModelWithFallback(
  client: OpenAI,
  instructions: string,
  input: Array<{
    role: "user";
    content: Array<{ type: "input_text"; text: string }>;
  }>
): Promise<{ response: OpenAI.Responses.Response; modelUsed: string }> {
  let lastError: unknown = null;

  for (const model of MODEL_PRIORITY) {
    try {
      const response = await client.responses.create({
        model,
        instructions,
        input,
      });

      return { response, modelUsed: model };
    } catch (error) {
      if (!isModelNotAvailableError(error)) {
        throw error;
      }
      lastError = error;
    }
  }

  throw lastError ?? new Error("All fallback models failed.");
}

function buildInstructions(locale: "en" | "de"): string {
  const languageHint =
    locale === "de"
      ? "Respond in German unless the user clearly uses another language."
      : "Respond in English unless the user clearly uses another language.";

  return `
You are a helpful assistant inside a candidate profile builder for a job application tool.

Your role has TWO valid functions:
1. Help the user use the profile page and workflow correctly.
2. Help the user build a stronger candidate profile.

You are NOT a generic chatbot.

First, interpret the user's message as one of these intents:
- workflow_help: the user is asking how to use the page, what to do next, where to paste information, how to handle files, or how the process works
- profile_answer: the user is directly answering the current active prompt
- profile_note: the user is adding useful career/profile information that should be retained as a note
- mixed: the message contains both workflow help and profile content

Your behavior rules:

GENERAL
- Be concise, practical, and specific to this page.
- Do not give generic filler advice.
- Do not sound robotic.
- Do not claim the profile was permanently updated unless that is explicitly true.
- Prefer concrete next actions over abstract explanations.

WORKFLOW HELP
- If the user asks how to use the page, explain using the actual workflow on this page:
  - paste the main CV text into the Primary CV source box
  - add extra sources like Arbeitszeugnisse, certificates, additional CVs, or notes using the source buttons
  - click Build profile after adding enough source text
  - use the conversation box for clarifications, corrections, and answering follow-up prompts
- If the user asks where to click, guide them using the page sections visible in the app, not generic browser advice.
- If the user has a PDF with non-copyable or image-based content, explain that they should extract the text first using OCR or manual transcription, or add a short manual summary/note until the text is available.
- If the user says they do not have text available, give a practical fallback. Tell them to add a short manual summary using the most important facts they know, such as:
  - full name
  - target role
  - key employers
  - date ranges if known
  - main accounting responsibilities
  - systems like SAP
  - standards like HGB, IFRS, US GAAP
  - qualifications or certifications
- If the user asks where to find information, suggest likely sources such as CVs, Arbeitszeugnisse, certificates, LinkedIn, contracts, old applications, or memory-based notes if exact wording is unavailable.
- If the user asks about multilingual documents, say they are acceptable.

PROFILE LOGIC
- If there is an active prompt and the user's message clearly answers it, set answeredActivePrompt = true.
- If the user's message partially answers the active prompt, acknowledge that and explain what is still missing.
- If the user provides career facts, experience, qualifications, systems, standards, industries, languages, leadership scope, or achievements, set shouldCaptureAsNote = true.
- If the user gives partial but useful information, acknowledge it and say what would help next.
- If there is an active prompt, try to reference it naturally in the reply when helpful, for example by saying that the message answers or partly answers the current question.

ACTION SELECTION
- If the user has no extractable text and needs a fallback, use suggestedAction = "add_manual_summary"
- If the user should paste text into the main CV box, use suggestedAction = "paste_into_primary_cv"
- If the user should add freeform facts or temporary details, use suggestedAction = "add_user_note"
- If the user has enough source material and should proceed, use suggestedAction = "click_build_profile"
- If the user is clearly answering the current question, use suggestedAction = "answer_active_prompt"
- Otherwise use suggestedAction = "no_action"

STYLE
- Keep assistantMessage to a short helpful paragraph, usually 2 to 5 sentences.
- If useful, end with one practical next step or one clarifying question.
- Avoid repeating the entire user message back to them.
- Avoid sounding like customer support macros.

Return JSON only in exactly this shape:
{
  "intent": "workflow_help" | "profile_answer" | "profile_note" | "mixed",
  "assistantMessage": string,
  "answeredActivePrompt": boolean,
  "shouldCaptureAsNote": boolean,
  "suggestedAction": "add_manual_summary" | "paste_into_primary_cv" | "add_user_note" | "click_build_profile" | "answer_active_prompt" | "no_action"
}

${languageHint}
`.trim();
}

function safeParseJson<T>(text: string): T {
  const trimmed = text.trim();

  try {
    return JSON.parse(trimmed) as T;
  } catch {
    const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (fenceMatch?.[1]) {
      return JSON.parse(fenceMatch[1]) as T;
    }
    throw new Error("Model returned invalid JSON.");
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return jsonResponse(
        {
          ok: false,
          error: "Missing OPENAI_API_KEY environment variable.",
        },
        500
      );
    }

    if (MODEL_PRIORITY.length === 0) {
      return jsonResponse(
        {
          ok: false,
          error: "No OpenAI models configured for profile chat.",
        },
        500
      );
    }

    const body = (await request.json()) as Partial<ProfileChatRequest>;

    if (!body.userMessage || !body.userMessage.trim()) {
      return jsonResponse(
        {
          ok: false,
          error: "userMessage is required.",
        },
        400
      );
    }

    const locale = body.locale === "de" ? "de" : "en";

    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const inputText = `
Page purpose:
This page helps the user build a reusable candidate profile before tailoring jobs and generating CVs or cover letters.

Visible page workflow:
- Source documents section for pasting CV text and other source text
- Conversation section for questions, clarifications, and prompt answers
- Build profile button to generate or update the candidate profile
- Stored roles and stored claims panels showing extracted profile content

Current active prompt:
${body.activePrompt?.trim() || "None"}

Pending prompt count:
${typeof body.pendingPromptCount === "number" ? body.pendingPromptCount : 0}

Current profile context:
${JSON.stringify(body.currentProfile ?? null)}

User message:
${body.userMessage.trim()}
    `.trim();

    const { response } = await callModelWithFallback(
      client,
      buildInstructions(locale),
      [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: inputText,
            },
          ],
        },
      ]
    );

    const outputText = response.output_text?.trim();

    if (!outputText) {
      return jsonResponse(
        {
          ok: false,
          error: "Model did not return any output text.",
        },
        502
      );
    }

    const parsed = safeParseJson<{
      intent?: "workflow_help" | "profile_answer" | "profile_note" | "mixed";
      assistantMessage?: string;
      answeredActivePrompt?: boolean;
      shouldCaptureAsNote?: boolean;
      suggestedAction?: SuggestedAction;
    }>(outputText);

    return jsonResponse({
      ok: true,
      assistantMessage:
        typeof parsed.assistantMessage === "string" &&
        parsed.assistantMessage.trim()
          ? parsed.assistantMessage.trim()
          : "Thank you.",
      answeredActivePrompt: Boolean(parsed.answeredActivePrompt),
      shouldCaptureAsNote: Boolean(parsed.shouldCaptureAsNote),
      suggestedAction: parsed.suggestedAction ?? "no_action",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown server error.";

    return jsonResponse(
      {
        ok: false,
        error: message,
      },
      500
    );
  }
}