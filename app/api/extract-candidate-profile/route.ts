import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { withTimeout } from "@/lib/engine/core/withTimeout";
import { buildExtractCandidateProfileInstructions } from "@/lib/prompts/Intelligence/extractCandidateProfilePrompt";
import { detectInputLanguages, normalizeLang, resolveOutputLanguage } from "@/lib/profile/languageDetection";
import type { SupportedLanguage } from "@/lib/profile/languageDetection";
import type { CorrectionLogEntry } from "@/lib/profile/profile-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type InputDocument = {
  fileName?: string;
  text?: string;
  kind?: string;
  isPrimary?: boolean;
  description?: string;
};

type ExtractCandidateProfileRequest = {
  documents?: InputDocument[];
  outputLanguage?: string;
  // When provided, extraction runs in enrichment mode.
  // Existing data is preserved; new documents only add evidence.
  existingProfile?: Record<string, unknown> | null;
};

type CandidateProfileResponse = {
  fullName?: string | null;
  headline?: string | null;
  summary?: string | null;
  roles?: Array<{
    title: string;
    company: string | null;
    startDate: string | null;
    endDate: string | null;
    isCurrent: boolean;
    location: string | null;
    achievements: string[];
  }>;
  coreSkills?: string[];
  tools?: string[];
  standards?: string[];
  industries?: string[];
  languages?: Array<{
    language: string;
    proficiency: string | null;
  }>;
  education?: Array<{
    degree: string;
    field: string | null;
    institution: string | null;
    endDate: string | null;
  }>;
  certifications?: Array<{
    name: string;
    issuer: string | null;
    date: string | null;
  }>;
  leadershipSignals?: string[];
  strengths?: string[];
  constraints?: string[];
  verifiedClaims?: Array<{
    claim: string;
    evidence: string[];
    confidence: "high" | "medium";
  }>;
  openQuestions?: string[];
  competencies?: string[];
  evidenceNotes?: string[];
  // v2 language fields
  detectedInputLanguages?: string[];
  preferredOutputLanguage?: string;
  schemaVersion?: number;
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const MODEL_PRIORITY = [
  process.env.OPENAI_MODEL_EXTRACT_CANDIDATE_PROFILE,
  "gpt-4.1-mini",
  "gpt-4o-mini",
].filter(Boolean) as string[];

const MAX_DOCUMENTS = 12;
const MAX_TEXT_PER_DOCUMENT = 18000;
const MAX_TOTAL_TEXT = 60000;

function normalizeOutputLanguage(value: unknown): SupportedLanguage {
  const lang = normalizeLang(typeof value === "string" ? value : null);
  return lang ?? "en";
}

function normalizeWhitespace(text: string): string {
  return text
    .replace(/\r/g, "")
    .replace(/\t/g, " ")
    .replace(/[^\S\n]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function clampText(
  text: string,
  maxChars: number,
): { text: string; truncated: boolean } {
  if (text.length <= maxChars) return { text, truncated: false };
  return { text: text.slice(0, maxChars).trim(), truncated: true };
}

function sanitizeDocuments(documents: InputDocument[]): {
  ok: boolean;
  errors: string[];
  warnings: string[];
  metrics: { sourceCount: number; totalCharacters: number; truncatedDocuments: number };
  preparedText: string;
  rawTexts: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!Array.isArray(documents) || documents.length === 0) {
    errors.push("Please provide at least one document.");
    return { ok: false, errors, warnings, metrics: { sourceCount: 0, totalCharacters: 0, truncatedDocuments: 0 }, preparedText: "", rawTexts: [] };
  }

  const usableDocs = documents
    .slice(0, MAX_DOCUMENTS)
    .map((doc, index) => {
      const rawText = typeof doc.text === "string" ? normalizeWhitespace(doc.text) : "";
      return {
        index,
        fileName: doc.fileName?.trim() || `Document ${index + 1}`,
        kind: doc.kind?.trim() || "other",
        isPrimary: Boolean(doc.isPrimary),
        description: doc.description?.trim() || "",
        text: rawText,
      };
    })
    .filter((doc) => doc.text.length > 0);

  if (usableDocs.length === 0) {
    errors.push("No readable document text was provided.");
    return { ok: false, errors, warnings, metrics: { sourceCount: 0, totalCharacters: 0, truncatedDocuments: 0 }, preparedText: "", rawTexts: [] };
  }

  if (documents.length > MAX_DOCUMENTS) {
    warnings.push(`Only the first ${MAX_DOCUMENTS} documents were considered.`);
  }

  let truncatedDocuments = 0;
  const sections: string[] = [];
  const rawTexts: string[] = usableDocs.map((d) => d.text);

  for (const doc of usableDocs) {
    const clamped = clampText(doc.text, MAX_TEXT_PER_DOCUMENT);
    if (clamped.truncated) {
      truncatedDocuments += 1;
      warnings.push(`${doc.fileName} was truncated to keep processing stable.`);
    }
    const section = [
      `SOURCE: ${doc.fileName}`,
      `KIND: ${doc.kind}`,
      `PRIMARY: ${doc.isPrimary ? "yes" : "no"}`,
      doc.description ? `DESCRIPTION: ${doc.description}` : "",
      "",
      clamped.text,
    ]
      .filter(Boolean)
      .join("\n");
    sections.push(section);
  }

  let preparedText = sections.join("\n\n---\n\n");
  if (preparedText.length > MAX_TOTAL_TEXT) {
    preparedText = clampText(preparedText, MAX_TOTAL_TEXT).text;
    warnings.push("Combined source text was truncated to stay within processing limits.");
  }

  return {
    ok: true,
    errors,
    warnings,
    metrics: { sourceCount: usableDocs.length, totalCharacters: preparedText.length, truncatedDocuments },
    preparedText,
    rawTexts,
  };
}

function cleanString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function cleanNullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function cleanStringArray(value: unknown, max = 40): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, max);
}

/**
 * Deduplicate string arrays case-insensitively, preserving first occurrence.
 * Implements Item 6: duplicate merge at extraction time.
 */
function deduplicateArray(arr: string[]): string[] {
  const seen = new Set<string>();
  return arr.filter((item) => {
    const key = item.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function sanitizeCandidateProfile(
  data: Partial<CandidateProfileResponse>,
  detectedInputLanguages: string[],
  outputLanguage: SupportedLanguage,
): CandidateProfileResponse {
  return {
    schemaVersion: 2,
    fullName: cleanNullableString(data.fullName),
    headline: cleanNullableString(data.headline),
    summary: cleanNullableString(data.summary),
    roles: Array.isArray(data.roles)
      ? data.roles
          .map((role) => ({
            title: cleanString(role?.title),
            company: cleanNullableString(role?.company),
            startDate: cleanNullableString(role?.startDate),
            endDate: cleanNullableString(role?.endDate),
            isCurrent: Boolean(role?.isCurrent),
            location: cleanNullableString(role?.location),
            achievements: deduplicateArray(cleanStringArray(role?.achievements, 12)),
          }))
          .filter((role) => role.title.length > 0)
      : [],
    coreSkills: deduplicateArray(cleanStringArray(data.coreSkills, 30)),
    tools: deduplicateArray(cleanStringArray(data.tools, 30)),
    standards: deduplicateArray(cleanStringArray(data.standards, 30)),
    industries: deduplicateArray(cleanStringArray(data.industries, 25)),
    languages: Array.isArray(data.languages)
      ? data.languages
          .map((item) => ({
            language: cleanString(item?.language),
            proficiency: cleanNullableString(item?.proficiency),
          }))
          .filter((item) => item.language.length > 0)
      : [],
    education: Array.isArray(data.education)
      ? data.education
          .map((item) => ({
            degree: cleanString(item?.degree),
            field: cleanNullableString(item?.field),
            institution: cleanNullableString(item?.institution),
            endDate: cleanNullableString(item?.endDate),
          }))
          .filter((item) => item.degree.length > 0)
      : [],
    certifications: Array.isArray(data.certifications)
      ? data.certifications
          .map((item) => ({
            name: cleanString(item?.name),
            issuer: cleanNullableString(item?.issuer),
            date: cleanNullableString(item?.date),
          }))
          .filter((item) => item.name.length > 0)
      : [],
    leadershipSignals: deduplicateArray(cleanStringArray(data.leadershipSignals, 20)),
    strengths: deduplicateArray(cleanStringArray(data.strengths, 20)),
    constraints: cleanStringArray(data.constraints, 20),
    verifiedClaims: Array.isArray(data.verifiedClaims)
      ? data.verifiedClaims
          .map((item) => ({
            claim: cleanString(item?.claim),
            evidence: cleanStringArray(item?.evidence, 6),
            confidence: (item?.confidence === "high" ? "high" : "medium") as "high" | "medium",
          }))
          .filter((item) => item.claim.length > 0)
      : [],
    openQuestions: cleanStringArray(data.openQuestions, 20),
    competencies: deduplicateArray(cleanStringArray(data.competencies, 25)),
    evidenceNotes: cleanStringArray(data.evidenceNotes, 25),
    // v2 language fields
    detectedInputLanguages,
    preferredOutputLanguage: outputLanguage,
  };
}

/**
 * Re-apply user corrections from correctionLog onto a freshly extracted profile.
 * This is the net add rule: AI re-extraction never overwrites user corrections.
 */
function reapplyUserCorrections(
  profile: CandidateProfileResponse,
  correctionLog: CorrectionLogEntry[],
): CandidateProfileResponse {
  let p = { ...profile };

  for (const entry of correctionLog) {
    try {
      const field = entry.field as keyof CandidateProfileResponse;
      const current = p[field];

      if (entry.action === "add" && Array.isArray(current)) {
        const val = String(entry.value);
        const arr = current as string[];
        const alreadyPresent = arr.some((x) => typeof x === "string" && x.toLowerCase() === val.toLowerCase());
        if (!alreadyPresent) {
          (p as Record<string, unknown>)[field] = [...arr, val];
        }
      } else if (entry.action === "remove" && Array.isArray(current)) {
        const val = String(entry.value).toLowerCase();
        (p as Record<string, unknown>)[field] = (current as string[]).filter(
          (x) => typeof x !== "string" || x.toLowerCase() !== val,
        );
      } else if (entry.action === "update" && typeof current === "string") {
        (p as Record<string, unknown>)[field] = String(entry.value);
      }
    } catch {
      // Never let correction re-application crash the extraction
      console.warn(`[extract-candidate-profile] failed to re-apply correction for field "${entry.field}":`, entry);
    }
  }

  return p;
}

async function extractCandidateProfile(
  preparedText: string,
  outputLanguage: SupportedLanguage,
  existingProfile: Record<string, unknown> | null,
  correctionLog: CorrectionLogEntry[],
): Promise<CandidateProfileResponse> {
  const model = MODEL_PRIORITY[0] || "gpt-4.1-mini";
  const instructions = buildExtractCandidateProfileInstructions(
    outputLanguage,
    existingProfile,
    correctionLog,
  );

  const response = await withTimeout(
    openai.responses.create({
      model,
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text: [
                instructions,
                "Return only valid JSON.",
                "Never invent experience, dates, companies, achievements, qualifications, or responsibilities.",
                "Only extract claims grounded in the provided source documents.",
                existingProfile
                  ? "You are in ENRICHMENT mode — preserve all existing profile data and only add new evidence."
                  : "",
                "Return these top-level keys exactly:",
                "fullName, headline, summary, roles, coreSkills, tools, standards, industries, languages, education, certifications, leadershipSignals, strengths, constraints, verifiedClaims, openQuestions, competencies, evidenceNotes.",
                "Use empty arrays, null values, or empty strings where information is not available.",
              ]
                .filter(Boolean)
                .join(" "),
            },
          ],
        },
        {
          role: "user",
          content: [{ type: "input_text", text: preparedText }],
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "candidate_profile",
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              fullName: { type: ["string", "null"] },
              headline: { type: ["string", "null"] },
              summary: { type: ["string", "null"] },
              roles: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    title: { type: "string" },
                    company: { type: ["string", "null"] },
                    startDate: { type: ["string", "null"] },
                    endDate: { type: ["string", "null"] },
                    isCurrent: { type: "boolean" },
                    location: { type: ["string", "null"] },
                    achievements: { type: "array", items: { type: "string" } },
                  },
                  required: ["title", "company", "startDate", "endDate", "isCurrent", "location", "achievements"],
                },
              },
              coreSkills: { type: "array", items: { type: "string" } },
              tools: { type: "array", items: { type: "string" } },
              standards: { type: "array", items: { type: "string" } },
              industries: { type: "array", items: { type: "string" } },
              languages: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    language: { type: "string" },
                    proficiency: { type: ["string", "null"] },
                  },
                  required: ["language", "proficiency"],
                },
              },
              education: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    degree: { type: "string" },
                    field: { type: ["string", "null"] },
                    institution: { type: ["string", "null"] },
                    endDate: { type: ["string", "null"] },
                  },
                  required: ["degree", "field", "institution", "endDate"],
                },
              },
              certifications: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    name: { type: "string" },
                    issuer: { type: ["string", "null"] },
                    date: { type: ["string", "null"] },
                  },
                  required: ["name", "issuer", "date"],
                },
              },
              leadershipSignals: { type: "array", items: { type: "string" } },
              strengths: { type: "array", items: { type: "string" } },
              constraints: { type: "array", items: { type: "string" } },
              verifiedClaims: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    claim: { type: "string" },
                    evidence: { type: "array", items: { type: "string" } },
                    confidence: { type: "string", enum: ["high", "medium"] },
                  },
                  required: ["claim", "evidence", "confidence"],
                },
              },
              openQuestions: { type: "array", items: { type: "string" } },
              competencies: { type: "array", items: { type: "string" } },
              evidenceNotes: { type: "array", items: { type: "string" } },
            },
            required: [
              "fullName", "headline", "summary", "roles", "coreSkills", "tools", "standards",
              "industries", "languages", "education", "certifications", "leadershipSignals",
              "strengths", "constraints", "verifiedClaims", "openQuestions", "competencies", "evidenceNotes",
            ],
          },
        },
      },
    }),
    45000,
  );

  const parsed = JSON.parse(response.output_text) as Partial<CandidateProfileResponse>;
  return parsed;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ExtractCandidateProfileRequest;

    const documents = Array.isArray(body.documents) ? body.documents : [];
    const prepared = sanitizeDocuments(documents);

    // Detect input languages from document texts
    const detectedInputLanguages = detectInputLanguages(prepared.rawTexts ?? []);

    // Resolve output language: user preference → detected CV language → "en"
    const requestedLang = normalizeOutputLanguage(body.outputLanguage);
    const outputLanguage = resolveOutputLanguage({
      userOverride: body.outputLanguage,
      cvLanguage: detectedInputLanguages[0] ?? null,
    });
    // If explicitly requested (not just detected), honour it
    const finalOutputLanguage: SupportedLanguage =
      requestedLang !== "en" ? requestedLang : outputLanguage;

    // Normalise existing profile and extract correction log
    let existingProfile: Record<string, unknown> | null = null;
    let correctionLog: CorrectionLogEntry[] = [];

    if (
      body.existingProfile &&
      typeof body.existingProfile === "object" &&
      !Array.isArray(body.existingProfile)
    ) {
      const { rawResponse: _dropped, ...rest } = body.existingProfile as {
        rawResponse?: unknown;
        [key: string]: unknown;
      };

      // Extract and remove correctionLog from the profile we send to the AI
      // (the AI sees it in the enrichment block, not baked into the profile JSON)
      if (Array.isArray(rest.correctionLog)) {
        correctionLog = rest.correctionLog as CorrectionLogEntry[];
      }
      const { correctionLog: _log, ...profileWithoutLog } = rest as {
        correctionLog?: CorrectionLogEntry[];
        [key: string]: unknown;
      };
      existingProfile = profileWithoutLog;
    }

    if (!prepared.ok) {
      if (!existingProfile) {
        return NextResponse.json(
          {
            error: prepared.errors[0] ?? "Document validation failed.",
            details: { errors: prepared.errors, warnings: prepared.warnings, metrics: prepared.metrics },
          },
          { status: 400 },
        );
      }
    }

    const rawExtracted = await extractCandidateProfile(
      prepared.preparedText,
      finalOutputLanguage,
      existingProfile,
      correctionLog,
    );

    // Post-process: sanitize, dedup, add language metadata
    let candidateProfile = sanitizeCandidateProfile(
      rawExtracted,
      detectedInputLanguages,
      finalOutputLanguage,
    );

    // Net add rule: re-apply user corrections after AI extraction.
    // AI re-extraction never overwrites user corrections.
    if (correctionLog.length > 0) {
      candidateProfile = reapplyUserCorrections(candidateProfile, correctionLog);
      console.log(`[extract-candidate-profile] re-applied ${correctionLog.length} user correction(s)`);
    }

    return NextResponse.json({
      candidateProfile,
      warnings: prepared.warnings,
      metrics: prepared.metrics,
      detectedInputLanguages,
      outputLanguage: finalOutputLanguage,
    });
  } catch (error) {
    const detail = error instanceof Error
      ? `${error.constructor.name}: ${error.message}`
      : String(error);
    console.error("[extract-candidate-profile] failed:", detail);

    return NextResponse.json(
      {
        error: "Could not extract candidate profile.",
        ...(process.env.NODE_ENV === "development" ? { _debug: detail } : {}),
      },
      { status: 500 },
    );
  }
}
