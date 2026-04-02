import OpenAI from "openai";

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

type CompanyContextSuccess = {
  ok: true;
  companyContext: {
    industry: string[];
    financeEnvironment: string[];
    reportingEnvironment: string[];
    leadershipScope: string[];
    operatingSignals: string[];
    cultureSignals: string[];
    summary: string;
  };
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

function buildInstructions(locale: "en" | "de"): string {
  const languageHint =
    locale === "de"
      ? "Write the summary in German unless the context clearly requires English."
      : "Write the summary in English unless the context clearly requires German.";

  return `
You are the company-context inference layer inside an AI job application system.

Your task is to infer the likely company and role environment from:
- the structured job
- the extracted job text

Do NOT browse the web.
Do NOT invent facts not reasonably supported by the job text.
Be conservative and infer only what is useful for tailoring and recommendation logic.

Your output should help answer:
- What type of finance environment is this?
- What operating environment is this role embedded in?
- What reporting / governance context likely matters?
- What leadership or stakeholder context is implied?
- What cultural or operating signals matter for positioning?

Infer the following fields:

1. industry
Examples:
- manufacturing
- industrial technology
- shared services
- SaaS
- retail
- logistics
- pharma
Only include items that are reasonably supported.

2. financeEnvironment
Examples:
- operational finance
- plant finance
- controlling-heavy
- accounting-led
- business partnering
- international matrix environment
- group reporting environment

3. reportingEnvironment
Examples:
- HGB
- IFRS
- US GAAP
- SOX
- SEC-linked reporting
- statutory reporting
- internal controls environment

4. leadershipScope
Examples:
- local finance leadership
- people management
- leadership team participation
- cross-border stakeholder management
- HQ coordination

5. operatingSignals
Examples:
- standard costing
- inventory focus
- capex support
- pricing analysis
- process standardization
- ERP / systems optimization
- change management

6. cultureSignals
Examples:
- safety culture
- excellence
- respect
- continuous improvement
- accountability

7. summary
A short practical summary of the company/role environment for later matching and positioning.
Keep it concise and useful.

Rules:
- Return JSON only.
- Do not repeat the whole job description.
- Do not over-infer.
- If something is only weakly implied, leave it out.
- Prefer practical finance interpretation over marketing language.

Return exactly this shape:
{
  "industry": string[],
  "financeEnvironment": string[],
  "reportingEnvironment": string[],
  "leadershipScope": string[],
  "operatingSignals": string[],
  "cultureSignals": string[],
  "summary": string
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

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
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
              ? "Der Unternehmens- und Rollen-Kontext wurde aus der Stellenbeschreibung abgeleitet."
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