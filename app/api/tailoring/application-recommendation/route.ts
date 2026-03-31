import OpenAI from "openai";
import { buildApplicationRecommendationInstructions } from "@/lib/prompts/applicationRecommendationPrompt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CandidateRole = {
  title: string;
  company: string | null;
  startDate: string | null;
  endDate: string | null;
  isCurrent: boolean;
  location: string | null;
  achievements: string[];
};

type CandidateLanguage = {
  language: string;
  proficiency: string | null;
};

type CandidateEducation = {
  degree: string;
  field: string | null;
  institution: string | null;
  endDate: string | null;
};

type CandidateCertification = {
  name: string;
  issuer: string | null;
  date: string | null;
};

type VerifiedClaim = {
  claim: string;
  evidence: string[];
  confidence: "high" | "medium";
};

type CandidateProfile = {
  fullName: string | null;
  headline: string | null;
  summary: string | null;
  roles: CandidateRole[];
  coreSkills: string[];
  tools: string[];
  standards: string[];
  industries: string[];
  languages: CandidateLanguage[];
  education: CandidateEducation[];
  certifications: CandidateCertification[];
  leadershipSignals: string[];
  strengths: string[];
  constraints: string[];
  verifiedClaims: VerifiedClaim[];
  openQuestions: string[];
};

type StructuredJob = {
  companyName: string;
  jobTitle: string;
  location: string;
  responsibilities: string[];
  requirements: string[];
  summary: string;
};

type CompanyContext = {
  industry?: string[];
  financeEnvironment?: string[];
  reportingEnvironment?: string[];
  leadershipScope?: string[];
  operatingSignals?: string[];
  cultureSignals?: string[];
  summary?: string;
} | null;

type ApplicationRecommendationRequest = {
  locale?: "en" | "de";
  targetLanguage?: string;
  candidateProfile?: CandidateProfile;
  structuredJob?: StructuredJob;
  companyContext?: CompanyContext;
  extractedText?: string;
};

type RequirementAnalysisItem = {
  requirement: string;
  importance: "blocker" | "core" | "supporting" | "preferred";
  matchStatus: "matched" | "adjacent" | "weak" | "missing";
  notes: string;
};

type ApplicationRecommendationSuccess = {
  ok: true;
  applicationRecommendation:
    | "apply_confidently"
    | "apply_with_care"
    | "borderline"
    | "not_recommended";
  reasoningSummary: string;
  advisorMessage: string;
  strongMatches: string[];
  stretchMatches: string[];
  riskAreas: string[];
  blockers: string[];
  positioningStrategy: string;
  requirementsAnalysis: RequirementAnalysisItem[];
  meta: {
    model: string;
    locale: "en" | "de";
  };
};

type ApplicationRecommendationError = {
  ok: false;
  error: string;
};

const MODEL_PRIORITY = [
  process.env.OPENAI_MODEL_APPLICATION_RECOMMENDATION,
  process.env.OPENAI_MODEL_TAILORING,
  process.env.OPENAI_MODEL_PROFILE_CHAT,
  "gpt-4.1-mini",
  "gpt-4o-mini",
].filter(Boolean) as string[];

function jsonResponse(
  body: ApplicationRecommendationSuccess | ApplicationRecommendationError,
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

function normalizeRecommendation(
  value: unknown
): ApplicationRecommendationSuccess["applicationRecommendation"] {
  if (
    value === "apply_confidently" ||
    value === "apply_with_care" ||
    value === "borderline" ||
    value === "not_recommended"
  ) {
    return value;
  }

  return "borderline";
}

function normalizeImportance(
  value: unknown
): RequirementAnalysisItem["importance"] {
  if (
    value === "blocker" ||
    value === "core" ||
    value === "supporting" ||
    value === "preferred"
  ) {
    return value;
  }

  return "supporting";
}

function normalizeMatchStatus(
  value: unknown
): RequirementAnalysisItem["matchStatus"] {
  if (
    value === "matched" ||
    value === "adjacent" ||
    value === "weak" ||
    value === "missing"
  ) {
    return value;
  }

  return "weak";
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeRequirementsAnalysis(value: unknown): RequirementAnalysisItem[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;

      const row = item as {
        requirement?: unknown;
        importance?: unknown;
        matchStatus?: unknown;
        notes?: unknown;
      };

      const requirement =
        typeof row.requirement === "string" ? row.requirement.trim() : "";
      const notes = typeof row.notes === "string" ? row.notes.trim() : "";

      if (!requirement) return null;

      return {
        requirement,
        importance: normalizeImportance(row.importance),
        matchStatus: normalizeMatchStatus(row.matchStatus),
        notes,
      } satisfies RequirementAnalysisItem;
    })
    .filter((item): item is RequirementAnalysisItem => Boolean(item));
}

function normalizeLocale(body: Partial<ApplicationRecommendationRequest>): "en" | "de" {
  if (body.locale === "de" || body.locale === "en") {
    return body.locale;
  }

  const targetLanguage =
    typeof body.targetLanguage === "string"
      ? body.targetLanguage.trim().toLowerCase()
      : "";

  if (
    targetLanguage === "de" ||
    targetLanguage === "german" ||
    targetLanguage === "deutsch"
  ) {
    return "de";
  }

  return "en";
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
          error: "No OpenAI models configured for application recommendation.",
        },
        500
      );
    }

    const body = (await request.json()) as Partial<ApplicationRecommendationRequest>;

    if (!body.candidateProfile) {
      return jsonResponse(
        {
          ok: false,
          error: "candidateProfile is required.",
        },
        400
      );
    }

    if (!body.structuredJob) {
      return jsonResponse(
        {
          ok: false,
          error: "structuredJob is required.",
        },
        400
      );
    }

    const locale = normalizeLocale(body);

    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const inputText = `
Candidate profile:
${JSON.stringify(body.candidateProfile, null, 2)}

Structured job:
${JSON.stringify(body.structuredJob, null, 2)}

Company context:
${JSON.stringify(body.companyContext ?? null, null, 2)}

Extracted job text:
${typeof body.extractedText === "string" ? body.extractedText.trim() : ""}
`.trim();

    const { response, modelUsed } = await callModelWithFallback(
      client,
      buildApplicationRecommendationInstructions(locale),
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
      applicationRecommendation?: unknown;
      reasoningSummary?: unknown;
      advisorMessage?: unknown;
      strongMatches?: unknown;
      stretchMatches?: unknown;
      riskAreas?: unknown;
      blockers?: unknown;
      positioningStrategy?: unknown;
      requirementsAnalysis?: unknown;
    }>(outputText);

    return jsonResponse({
      ok: true,
      applicationRecommendation: normalizeRecommendation(
        parsed.applicationRecommendation
      ),
      reasoningSummary:
        typeof parsed.reasoningSummary === "string" &&
        parsed.reasoningSummary.trim()
          ? parsed.reasoningSummary.trim()
          : locale === "de"
            ? "Die Rolle wurde anhand des Kandidatenprofils und der Stellenanforderungen bewertet."
            : "The role was evaluated against the candidate profile and job requirements.",
      advisorMessage:
        typeof parsed.advisorMessage === "string" && parsed.advisorMessage.trim()
          ? parsed.advisorMessage.trim()
          : locale === "de"
            ? "Auf Basis der vorliegenden Informationen wurde eine vorsichtige Empfehlung erstellt."
            : "A cautious recommendation was created based on the available information.",
      strongMatches: normalizeStringArray(parsed.strongMatches),
      stretchMatches: normalizeStringArray(parsed.stretchMatches),
      riskAreas: normalizeStringArray(parsed.riskAreas),
      blockers: normalizeStringArray(parsed.blockers),
      positioningStrategy:
        typeof parsed.positioningStrategy === "string" &&
        parsed.positioningStrategy.trim()
          ? parsed.positioningStrategy.trim()
          : "",
      requirementsAnalysis: normalizeRequirementsAnalysis(
        parsed.requirementsAnalysis
      ),
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