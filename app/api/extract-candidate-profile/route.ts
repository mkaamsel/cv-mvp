import OpenAI from "openai";
import { withTimeout } from "@/lib/intelligence/core/withTimeout";
import {
  clampText,
  guardDocumentsInput,
  normalizeWhitespace,
} from "@/lib/intelligence/core/routeGuards";
import { buildExtractCandidateProfileInstructions } from "@/lib/prompts/extractCandidateProfilePrompt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SourceKind =
  | "primary_cv"
  | "additional_cv"
  | "arbeitszeugnis"
  | "certificate"
  | "user_note";

type InputDocument = {
  id?: string;
  fileName: string;
  kind: SourceKind;
  text: string;
  isPrimary?: boolean;
};

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

type ExtractCandidateProfileRequest = {
  documents: InputDocument[];
  locale?: "en" | "de";
};

type ApiSuccess = {
  ok: true;
  profile: CandidateProfile;
  meta: {
    model: string;
    documentCount: number;
    sourceKinds: SourceKind[];
    warnings: string[];
    metrics: {
      documentCount: number;
      totalChars: number;
      estimatedTokens: number;
    };
  };
};

type ApiError = {
  ok: false;
  error: string;
  details?: unknown;
};

const MODEL_PRIORITY = [
  process.env.OPENAI_MODEL_EXTRACT_CANDIDATE_PROFILE,
  "gpt-4.1-mini",
  "gpt-4o-mini",
].filter(Boolean) as string[];

const MAX_DOCUMENTS = 12;
const MAX_TEXT_CHARS_PER_DOCUMENT = 35_000;
const SOFT_TEXT_CHARS_PER_DOCUMENT = 20_000;
const MAX_TOTAL_TEXT_CHARS = 120_000;
const MAX_TOTAL_ESTIMATED_TOKENS = 30_000;

function jsonResponse(body: ApiSuccess | ApiError, status = 200): Response {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function uniqueStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const raw of values) {
    const value = raw.trim();
    const key = value.toLowerCase();

    if (!value || seen.has(key)) continue;
    seen.add(key);
    result.push(value);
  }

  return result;
}

function sanitizeDocument(
  doc: InputDocument,
  warnings: string[]
): InputDocument {
  const normalizedText = normalizeWhitespace(doc.text);
  const clamped = clampText(normalizedText, MAX_TEXT_CHARS_PER_DOCUMENT);

  if (clamped.truncated) {
    warnings.push(
      `Document ${doc.fileName} exceeded ${MAX_TEXT_CHARS_PER_DOCUMENT} characters and was truncated for safety.`
    );
  }

  return {
    id: doc.id?.trim(),
    fileName: doc.fileName.trim(),
    kind: doc.kind,
    isPrimary: Boolean(doc.isPrimary),
    text: clamped.text,
  };
}

function validateRequestBody(body: unknown): ExtractCandidateProfileRequest {
  if (!body || typeof body !== "object") {
    throw new Error("Request body must be a JSON object.");
  }

  const maybeBody = body as Partial<ExtractCandidateProfileRequest>;

  if (!Array.isArray(maybeBody.documents) || maybeBody.documents.length === 0) {
    throw new Error("documents[] is required and must contain at least one item.");
  }

  if (maybeBody.documents.length > MAX_DOCUMENTS) {
    throw new Error(`documents[] cannot contain more than ${MAX_DOCUMENTS} items.`);
  }

  for (const [index, doc] of maybeBody.documents.entries()) {
    if (!doc || typeof doc !== "object") {
      throw new Error(`documents[${index}] must be an object.`);
    }

    const typedDoc = doc as Partial<InputDocument>;

    if (!isNonEmptyString(typedDoc.fileName)) {
      throw new Error(`documents[${index}].fileName is required.`);
    }

    if (
      typedDoc.kind !== "primary_cv" &&
      typedDoc.kind !== "additional_cv" &&
      typedDoc.kind !== "arbeitszeugnis" &&
      typedDoc.kind !== "certificate" &&
      typedDoc.kind !== "user_note"
    ) {
      throw new Error(
        `documents[${index}].kind must be one of: primary_cv, additional_cv, arbeitszeugnis, certificate, user_note.`
      );
    }

    if (!isNonEmptyString(typedDoc.text)) {
      throw new Error(`documents[${index}].text is required.`);
    }
  }

  const locale =
    maybeBody.locale === "de" || maybeBody.locale === "en"
      ? maybeBody.locale
      : "en";

  return {
    documents: maybeBody.documents as InputDocument[],
    locale,
  };
}

function buildDocumentBundle(documents: InputDocument[]): string {
  let total = 0;
  const chunks: string[] = [];

  for (const doc of documents) {
    const remaining = MAX_TOTAL_TEXT_CHARS - total;
    if (remaining <= 0) break;

    const text = doc.text.slice(0, remaining);
    total += text.length;

    chunks.push(
      [
        `### SOURCE`,
        `fileName: ${doc.fileName}`,
        `kind: ${doc.kind}`,
        `isPrimary: ${doc.isPrimary ? "true" : "false"}`,
        `---BEGIN TEXT---`,
        text,
        `---END TEXT---`,
      ].join("\n")
    );
  }

  return chunks.join("\n\n");
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

function coerceString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function coerceStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return uniqueStrings(value.filter((v): v is string => typeof v === "string"));
}

function normalizeProfile(raw: unknown): CandidateProfile {
  const input = (raw ?? {}) as Record<string, unknown>;

  const roles: CandidateRole[] = Array.isArray(input.roles)
    ? input.roles
        .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
        .map((item) => ({
          title: coerceString(item.title) || "Unknown role",
          company: coerceString(item.company),
          startDate: coerceString(item.startDate),
          endDate: coerceString(item.endDate),
          isCurrent: Boolean(item.isCurrent),
          location: coerceString(item.location),
          achievements: coerceStringArray(item.achievements),
        }))
    : [];

  const languages: CandidateLanguage[] = Array.isArray(input.languages)
    ? input.languages
        .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
        .map((item) => ({
          language: coerceString(item.language) || "Unknown",
          proficiency: coerceString(item.proficiency),
        }))
    : [];

  const education: CandidateEducation[] = Array.isArray(input.education)
    ? input.education
        .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
        .map((item) => ({
          degree: coerceString(item.degree) || "Unknown",
          field: coerceString(item.field),
          institution: coerceString(item.institution),
          endDate: coerceString(item.endDate),
        }))
    : [];

  const certifications: CandidateCertification[] = Array.isArray(input.certifications)
    ? input.certifications
        .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
        .map((item) => ({
          name: coerceString(item.name) || "Unknown",
          issuer: coerceString(item.issuer),
          date: coerceString(item.date),
        }))
    : [];

  const verifiedClaims: VerifiedClaim[] = Array.isArray(input["verifiedClaims"])
  ? (input["verifiedClaims"] as unknown[])
      .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
      .map((item): VerifiedClaim => ({
        claim: coerceString(item.claim) || "Unknown claim",
        evidence: coerceStringArray(item.evidence),
        confidence: item.confidence === "medium" ? "medium" : "high",
      }))
      .filter((item) => item.evidence.length > 0)
  : [];

  return {
    fullName: coerceString(input.fullName),
    headline: coerceString(input.headline),
    summary: coerceString(input.summary),
    roles,
    coreSkills: coerceStringArray(input.coreSkills),
    tools: coerceStringArray(input.tools),
    standards: coerceStringArray(input.standards),
    industries: coerceStringArray(input.industries),
    languages,
    education,
    certifications,
    leadershipSignals: coerceStringArray(input.leadershipSignals),
    strengths: coerceStringArray(input.strengths),
    constraints: coerceStringArray(input.constraints),
    verifiedClaims,
    openQuestions: coerceStringArray(input.openQuestions),
  };
}

function isModelNotAvailableError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;

  const maybeError = error as {
    message?: unknown;
    status?: unknown;
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
    content: Array<{
      type: "input_text";
      text: string;
    }>;
  }>
): Promise<{ response: OpenAI.Responses.Response; modelUsed: string }> {
  let lastError: unknown = null;

  for (const model of MODEL_PRIORITY) {
    try {
      const response = await withTimeout(
        client.responses.create({
          model,
          instructions,
          input,
        }),
        120000
      );

      return {
        response,
        modelUsed: model,
      };
    } catch (error) {
      if (!isModelNotAvailableError(error)) {
        throw error;
      }

      lastError = error;
    }
  }

  throw lastError ?? new Error("All fallback models failed.");
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
          error: "No OpenAI models configured for extract-candidate-profile.",
        },
        500
      );
    }

    const rawBody = await request.json();
    const body = validateRequestBody(rawBody);

    const preprocessingWarnings: string[] = [];
    const sanitizedDocuments = body.documents.map((doc) =>
      sanitizeDocument(doc, preprocessingWarnings)
    );

    const guardResult = guardDocumentsInput({
      documents: sanitizedDocuments,
      maxDocuments: MAX_DOCUMENTS,
      softCharsPerDocument: SOFT_TEXT_CHARS_PER_DOCUMENT,
      hardCharsPerDocument: MAX_TEXT_CHARS_PER_DOCUMENT,
      totalCharsHard: MAX_TOTAL_TEXT_CHARS,
      estimatedTokensHard: MAX_TOTAL_ESTIMATED_TOKENS,
    });

    if (!guardResult.ok) {
      return jsonResponse(
        {
          ok: false,
          error: guardResult.errors[0] ?? "Document validation failed.",
          details: {
            errors: guardResult.errors,
            warnings: [...preprocessingWarnings, ...guardResult.warnings],
            metrics: guardResult.metrics,
          },
        },
        400
      );
    }

    const sourceKinds = Array.from(
      new Set(sanitizedDocuments.map((doc) => doc.kind))
    ) as SourceKind[];

    const bundledDocuments = buildDocumentBundle(sanitizedDocuments);

    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const { response, modelUsed } = await callModelWithFallback(
      client,
      buildExtractCandidateProfileInstructions(body.locale || "en"),
      [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `
Extract a CandidateProfile from the following source documents.

${bundledDocuments}
              `.trim(),
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

    const parsed = safeParseJson<CandidateProfile>(outputText);
    const normalizedProfile = normalizeProfile(parsed);

    return jsonResponse({
      ok: true,
      profile: normalizedProfile,
      meta: {
        model: modelUsed,
        documentCount: sanitizedDocuments.length,
        sourceKinds,
        warnings: [...preprocessingWarnings, ...guardResult.warnings],
        metrics: guardResult.metrics,
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