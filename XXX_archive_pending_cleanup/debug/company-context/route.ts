import OpenAI from "openai";
import { buildCompanyContextInstructions } from "@/lib/prompts/companyContextPrompt";

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

type CompanyContextRequest = {
  locale?: "en" | "de";
  structuredJob?: StructuredJob;
  extractedText?: string;
};

type CompanyContext = {
  industry: string[];
  financeEnvironment: string[];
  reportingEnvironment: string[];
  leadershipScope: string[];
  operatingSignals: string[];
  cultureSignals: string[];
  summary: string;
};

type CompanyContextSuccess = {
  ok: true;
  companyContext: CompanyContext;
  meta: {
    model: string;
    locale: "en" | "de";
  };
};

type CompanyContextError = {
  ok: false;
  error: string;
};

const MODEL_PRIORITY = [
  process.env.OPENAI_MODEL_COMPANY_CONTEXT,
  process.env.OPENAI_MODEL_APPLICATION_RECOMMENDATION,
  process.env.OPENAI_MODEL_TAILORING,
  "gpt-4.1-mini",
  "gpt-4o-mini",
].filter(Boolean) as string[];

function jsonResponse(
  body: CompanyContextSuccess | CompanyContextError,
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
          error: "No OpenAI models configured for company context.",
        },
        500
      );
    }

    const body = (await request.json()) as Partial<CompanyContextRequest>;

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
`.trim();

    const { response, modelUsed } = await callModelWithFallback(
      client,
      buildCompanyContextInstructions(locale),
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
      industry?: unknown;
      financeEnvironment?: unknown;
      reportingEnvironment?: unknown;
      leadershipScope?: unknown;
      operatingSignals?: unknown;
      cultureSignals?: unknown;
      summary?: unknown;
    }>(outputText);

    return jsonResponse({
      ok: true,
      companyContext: {
        industry: normalizeStringArray(parsed.industry),
        financeEnvironment: normalizeStringArray(parsed.financeEnvironment),
        reportingEnvironment: normalizeStringArray(parsed.reportingEnvironment),
        leadershipScope: normalizeStringArray(parsed.leadershipScope),
        operatingSignals: normalizeStringArray(parsed.operatingSignals),
        cultureSignals: normalizeStringArray(parsed.cultureSignals),
        summary:
          typeof parsed.summary === "string" && parsed.summary.trim()
            ? parsed.summary.trim()
            : locale === "de"
              ? "Der Unternehmens- und Rollenkontext wurde aus der Stellenbeschreibung abgeleitet."
              : "The company and role context was inferred from the job description.",
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