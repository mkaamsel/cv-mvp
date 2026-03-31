import OpenAI from "openai";
import { buildCompanyResearchInstructions } from "@/lib/prompts/companyResearchPrompt";

export type CompanyResearch = {
  companySummary: string;
  recentSignals: string[];
  strategicThemes: string[];
  positiveHooks: string[];
  riskSignals: string[];
  whyThisCompanyAngles: string[];
};

export type CompanyResearchModuleInput = {
  locale?: "en" | "de";
  companyName: string;
  jobTitle?: string;
  searchNotes?: string;
};

const MODEL_PRIORITY = [
  process.env.OPENAI_MODEL_COMPANY_CONTEXT,
  process.env.OPENAI_MODEL_APPLICATION_RECOMMENDATION,
  process.env.OPENAI_MODEL_TAILORING,
  "gpt-4.1-mini",
  "gpt-4o-mini",
].filter(Boolean) as string[];

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

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
    )
  );
}

export async function companyResearchModule({
  locale = "en",
  companyName,
  jobTitle = "",
  searchNotes = "",
}: CompanyResearchModuleInput): Promise<{
  companyResearch: CompanyResearch;
  meta: {
    model: string;
    locale: "en" | "de";
  };
}> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("Missing OPENAI_API_KEY environment variable.");
  }

  if (MODEL_PRIORITY.length === 0) {
    throw new Error("No OpenAI models configured for company research.");
  }

  if (!companyName.trim()) {
    throw new Error("companyName is required.");
  }

  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const inputText = `
Company name:
${companyName.trim()}

Job title:
${jobTitle.trim()}

Search notes:
${searchNotes.trim()}
`.trim();

  const { response, modelUsed } = await callModelWithFallback(
    client,
    buildCompanyResearchInstructions(locale),
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
    throw new Error("Model did not return any output text.");
  }

  const parsed = safeParseJson<{
    companySummary?: unknown;
    recentSignals?: unknown;
    strategicThemes?: unknown;
    positiveHooks?: unknown;
    riskSignals?: unknown;
    whyThisCompanyAngles?: unknown;
  }>(outputText);

  return {
    companyResearch: {
      companySummary:
        typeof parsed.companySummary === "string" && parsed.companySummary.trim()
          ? parsed.companySummary.trim()
          : locale === "de"
            ? "Es wurde eine konservative Unternehmensrecherche aus den verfügbaren Hinweisen erstellt."
            : "A conservative company research summary was created from the available signals.",
      recentSignals: normalizeStringArray(parsed.recentSignals),
      strategicThemes: normalizeStringArray(parsed.strategicThemes),
      positiveHooks: normalizeStringArray(parsed.positiveHooks),
      riskSignals: normalizeStringArray(parsed.riskSignals),
      whyThisCompanyAngles: normalizeStringArray(parsed.whyThisCompanyAngles),
    },
    meta: {
      model: modelUsed,
      locale,
    },
  };
}