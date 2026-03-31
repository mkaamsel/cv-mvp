import OpenAI from "openai";
import { buildMarketSignalsInstructions } from "@/lib/prompts/marketSignalsPrompt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type StructuredJob = {
  companyName: string;
  jobTitle: string;
  location: string;
  responsibilities: string[];
  requirements: string[];
  summary: string;
};

type MarketSignalsRequest = {
  locale?: "en" | "de";
  structuredJob?: StructuredJob;
  extractedText?: string;
  companyContextSummary?: string;
};

type MarketSignals = {
  seniorityTarget: "junior" | "mid" | "senior" | "mixed";
  roleNature: "operational" | "advisory" | "strategic" | "mixed";
  businessModelSignals: string[];
  hiringSignals: string[];
  candidateRiskSignals: string[];
  communicationSignals: string[];
  deliverySignals: string[];
  summary: string;
};

type MarketSignalsSuccess = {
  ok: true;
  marketSignals: MarketSignals;
  meta: {
    model: string;
    locale: "en" | "de";
  };
};

type MarketSignalsError = {
  ok: false;
  error: string;
};

const MODEL_PRIORITY = [
  process.env.OPENAI_MODEL_APPLICATION_RECOMMENDATION,
  process.env.OPENAI_MODEL_COMPANY_CONTEXT,
  process.env.OPENAI_MODEL_TAILORING,
  "gpt-4.1-mini",
  "gpt-4o-mini",
].filter(Boolean) as string[];

function jsonResponse(
  body: MarketSignalsSuccess | MarketSignalsError,
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

function safeParseJson<T>(text: string): T {
  const trimmed = text.trim();

  try {
    return JSON.parse(trimmed) as T;
  } catch {
    const fenceMatch = trimmed.match(/```(?:json)?\\s*([\\s\\S]*?)\\s*```/i);
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
          error: "No OpenAI models configured for market signals.",
        },
        500
      );
    }

    const body = (await request.json()) as Partial<MarketSignalsRequest>;

    if (!body.structuredJob) {
      return jsonResponse(
        {
          ok: false,
          error: "structuredJob is required.",
        },
        400
      );
    }

    const locale = body.locale === "de" ? "de" : "en";

    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const inputText = `
Structured job:
${JSON.stringify(body.structuredJob, null, 2)}

Extracted job text:
${typeof body.extractedText === "string" ? body.extractedText.trim() : ""}

Company context summary:
${typeof body.companyContextSummary === "string" ? body.companyContextSummary.trim() : ""}
`.trim();

    const { response, modelUsed } = await callModelWithFallback(
      client,
      buildMarketSignalsInstructions(locale),
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
      seniorityTarget?: unknown;
      roleNature?: unknown;
      businessModelSignals?: unknown;
      hiringSignals?: unknown;
      candidateRiskSignals?: unknown;
      communicationSignals?: unknown;
      deliverySignals?: unknown;
      summary?: unknown;
    }>(outputText);

    return jsonResponse({
      ok: true,
      marketSignals: {
        seniorityTarget: normalizeEnum(parsed.seniorityTarget, ["junior", "mid", "senior", "mixed"] as const, "mixed"),
        roleNature: normalizeEnum(parsed.roleNature, ["operational", "advisory", "strategic", "mixed"] as const, "mixed"),
        businessModelSignals: normalizeStringArray(parsed.businessModelSignals),
        hiringSignals: normalizeStringArray(parsed.hiringSignals),
        candidateRiskSignals: normalizeStringArray(parsed.candidateRiskSignals),
        communicationSignals: normalizeStringArray(parsed.communicationSignals),
        deliverySignals: normalizeStringArray(parsed.deliverySignals),
        summary:
          typeof parsed.summary === "string" && parsed.summary.trim()
            ? parsed.summary.trim()
            : locale === "de"
              ? "Die Marktsignale wurden konservativ aus der Stellensprache abgeleitet."
              : "The market signals were conservatively inferred from the job wording.",
      },
      meta: {
        model: modelUsed,
        locale,
      },
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