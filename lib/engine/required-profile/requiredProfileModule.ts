import OpenAI from "openai";
import { buildRequiredProfileInstructions } from "@/lib/prompts/requiredProfilePrompt";

export type StructuredJob = {
  companyName: string;
  jobTitle: string;
  location: string;
  responsibilities: string[];
  requirements: string[];
  summary: string;
};

export type RequiredProfile = {
  targetSeniority: "junior" | "mid" | "senior" | "mixed";
  requiredCompetencies: Array<{
    competency: string;
    category:
      | "domain"
      | "technical"
      | "tool"
      | "education"
      | "language"
      | "behavioural"
      | "stakeholder";
    importance: "core" | "supporting" | "preferred";
    interpretation: string;
  }>;
  requiredExperienceSignals: string[];
  requiredTools: string[];
  requiredLanguages: string[];
  requiredEducation: string[];
  behaviouralSignals: string[];
  stakeholderSignals: string[];
  summary: string;
};

export type RequiredProfileModuleInput = {
  locale?: "en" | "de";
  structuredJob: StructuredJob;
  extractedText?: string;
  companyContextSummary?: string;
  marketSignalsSummary?: string;
};

const MODEL_PRIORITY = [
  process.env.OPENAI_MODEL_REQUIRED_PROFILE,
  process.env.OPENAI_MODEL_APPLICATION_RECOMMENDATION,
  process.env.OPENAI_MODEL_COMPANY_CONTEXT,
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

function normalizeEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T
): T {
  return typeof value === "string" && allowed.includes(value as T)
    ? (value as T)
    : fallback;
}

export async function requiredProfileModule({
  locale = "en",
  structuredJob,
  extractedText = "",
  companyContextSummary = "",
  marketSignalsSummary = "",
}: RequiredProfileModuleInput): Promise<{
  requiredProfile: RequiredProfile;
  meta: {
    model: string;
    locale: "en" | "de";
  };
}> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("Missing OPENAI_API_KEY environment variable.");
  }

  if (MODEL_PRIORITY.length === 0) {
    throw new Error("No OpenAI models configured for required profile.");
  }

  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const inputText = `
Structured job:
${JSON.stringify(structuredJob, null, 2)}

Extracted job text:
${extractedText.trim()}

Company context summary:
${companyContextSummary.trim()}

Market signals summary:
${marketSignalsSummary.trim()}
`.trim();

  const { response, modelUsed } = await callModelWithFallback(
    client,
    buildRequiredProfileInstructions(locale),
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
    targetSeniority?: unknown;
    requiredCompetencies?: unknown;
    requiredExperienceSignals?: unknown;
    requiredTools?: unknown;
    requiredLanguages?: unknown;
    requiredEducation?: unknown;
    behaviouralSignals?: unknown;
    stakeholderSignals?: unknown;
    summary?: unknown;
  }>(outputText);

  const competencies = Array.isArray(parsed.requiredCompetencies)
    ? parsed.requiredCompetencies
        .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
        .map((item) => ({
          competency:
            typeof item.competency === "string" ? item.competency.trim() : "",
          category: normalizeEnum(
            item.category,
            [
              "domain",
              "technical",
              "tool",
              "education",
              "language",
              "behavioural",
              "stakeholder",
            ] as const,
            "technical"
          ),
          importance: normalizeEnum(
            item.importance,
            ["core", "supporting", "preferred"] as const,
            "supporting"
          ),
          interpretation:
            typeof item.interpretation === "string"
              ? item.interpretation.trim()
              : "",
        }))
        .filter((item) => item.competency)
    : [];

  return {
    requiredProfile: {
      targetSeniority: normalizeEnum(
        parsed.targetSeniority,
        ["junior", "mid", "senior", "mixed"] as const,
        "mixed"
      ),
      requiredCompetencies: competencies,
      requiredExperienceSignals: normalizeStringArray(parsed.requiredExperienceSignals),
      requiredTools: normalizeStringArray(parsed.requiredTools),
      requiredLanguages: normalizeStringArray(parsed.requiredLanguages),
      requiredEducation: normalizeStringArray(parsed.requiredEducation),
      behaviouralSignals: normalizeStringArray(parsed.behaviouralSignals),
      stakeholderSignals: normalizeStringArray(parsed.stakeholderSignals),
      summary:
        typeof parsed.summary === "string" && parsed.summary.trim()
          ? parsed.summary.trim()
          : locale === "de"
            ? "Das Anforderungsprofil wurde konservativ aus der Stellenbeschreibung interpretiert."
            : "The required profile was conservatively interpreted from the job description.",
    },
    meta: {
      model: modelUsed,
      locale,
    },
  };
}