import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { withTimeout } from "@/lib/engine/core/withTimeout";
import { buildExtractCandidateProfileInstructions } from "@/lib/prompts/Intelligence/extractCandidateProfilePrompt";
import { buildCanonicalizeProfileInstructions } from "@/lib/prompts/canonicalizeProfilePrompt";
import {
  normalizeCandidateCapabilities,
  type CandidateCapabilityInventory,
} from "@/lib/profile/capabilityNormalization";
import { detectInputLanguages, normalizeLang, resolveOutputLanguage } from "@/lib/profile/languageDetection";
import type { SupportedLanguage } from "@/lib/profile/languageDetection";
import type { CandidateProfile, CorrectionLogEntry } from "@/lib/profile/profile-store";

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
  // Stable fingerprint of the document set that produced this profile.
  // Stored in rawResponse so it survives round-trips through the client.
  // On the next rebuild the server compares the incoming fingerprint against
  // this value to decide: same-doc rebuild (replace) vs new-doc enrichment (union).
  sourceFingerprint?: string;

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
const CANONICALIZE_TIMEOUT_MS = 45000;
const EXTRACT_TIMEOUT_MS = 120000;

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

/**
 * Compute a stable fingerprint for a set of input documents.
 * Two calls with identical document content and filenames (in any order) produce
 * the same string. Any change — content edit, rename, addition, removal — changes it.
 * Does not require a crypto library: it concatenates sorted (name::length::prefix) tuples.
 */
function computeDocumentFingerprint(documents: InputDocument[]): string {
  const entries = documents
    .filter((d) => typeof d.text === "string" && d.text.trim().length > 0)
    .map((d) => {
      const name = (d.fileName ?? "").trim();
      const text = (typeof d.text === "string" ? d.text : "").trim();
      // Include name + exact byte count + first 200 chars.
      // This detects: renames, any text changes, additions, removals.
      return `${name}::${text.length}::${text.slice(0, 200)}`;
    })
    .sort(); // order-independent
  return entries.join("|||");
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

function asCandidateProfile(
  profile: CandidateProfileResponse,
): CandidateProfile {
  return {
    schemaVersion: typeof profile.schemaVersion === "number" ? profile.schemaVersion : 1,
    fullName: profile.fullName ?? null,
    headline: profile.headline ?? null,
    summary: profile.summary ?? null,
    roles: (profile.roles ?? []).map((role) => ({
      title: role.title,
      company: role.company ?? null,
      startDate: role.startDate ?? null,
      endDate: role.endDate ?? null,
      isCurrent: Boolean(role.isCurrent),
      location: role.location ?? null,
      achievements: Array.isArray(role.achievements) ? role.achievements : [],
    })),
    coreSkills: profile.coreSkills ?? [],
    tools: profile.tools ?? [],
    standards: profile.standards ?? [],
    industries: profile.industries ?? [],
    languages: (profile.languages ?? []).map((item) => ({
      language: item.language,
      proficiency: item.proficiency ?? null,
    })),
    education: (profile.education ?? []).map((item) => ({
      degree: item.degree,
      field: item.field ?? null,
      institution: item.institution ?? null,
      endDate: item.endDate ?? null,
    })),
    certifications: (profile.certifications ?? []).map((item) => ({
      name: item.name,
      issuer: item.issuer ?? null,
      date: item.date ?? null,
    })),
    leadershipSignals: profile.leadershipSignals ?? [],
    strengths: profile.strengths ?? [],
    constraints: profile.constraints ?? [],
    verifiedClaims: (profile.verifiedClaims ?? []).map((item) => ({
      claim: item.claim,
      evidence: Array.isArray(item.evidence) ? item.evidence : [],
      confidence: item.confidence,
    })),
    openQuestions: profile.openQuestions ?? [],
    detectedInputLanguages: profile.detectedInputLanguages,
    preferredOutputLanguage: profile.preferredOutputLanguage,
  };
}

function normalizeForMatch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isZeugnisKind(kind: unknown): boolean {
  if (typeof kind !== "string") return false;
  const normalizedKind = normalizeForMatch(kind);
  return (
    normalizedKind === "arbeitszeugnis" ||
    normalizedKind === "reference" ||
    normalizedKind.includes("zeugnis")
  );
}

function yearFromDate(value: string | null): number | null {
  if (!value) return null;
  const match = value.match(/\b(19|20)\d{2}\b/);
  return match ? Number.parseInt(match[0], 10) : null;
}

function yearsFromText(text: string): number[] {
  const matches = text.match(/\b(19|20)\d{2}\b/g) ?? [];
  return Array.from(new Set(matches.map((year) => Number.parseInt(year, 10))));
}

function hasNearYear(year: number | null, years: number[]): boolean {
  if (!year) return false;
  return years.some((candidate) => Math.abs(candidate - year) <= 1);
}

function hasCompanyAlignment(
  role: NonNullable<CandidateProfileResponse["roles"]>[number],
  normalizedDocText: string,
): boolean {
  const company = normalizeForMatch(role.company ?? "");
  if (!company) return false;
  return normalizedDocText.includes(company);
}

function hasTitleAlignment(
  role: NonNullable<CandidateProfileResponse["roles"]>[number],
  normalizedDocText: string,
): boolean {
  const titleTokens = normalizeForMatch(role.title)
    .split(" ")
    .filter((token) => token.length >= 4);
  if (titleTokens.length === 0) return false;
  const matched = titleTokens.filter((token) => normalizedDocText.includes(token)).length;
  return matched >= Math.max(1, Math.ceil(titleTokens.length * 0.6));
}

function hasDateAlignment(
  role: NonNullable<CandidateProfileResponse["roles"]>[number],
  docText: string,
): boolean {
  const startYear = yearFromDate(role.startDate);
  const endYear = yearFromDate(role.endDate);
  const docYears = yearsFromText(docText);
  if (docYears.length === 0) return false;
  if (!startYear && !endYear) return false;
  if (startYear && endYear) {
    return hasNearYear(startYear, docYears) && hasNearYear(endYear, docYears);
  }
  return hasNearYear(startYear ?? endYear, docYears);
}

type RoleResponsibilityExtraction = {
  additionalResponsibilities?: string[];
};

function cleanStringArrayUnlimited(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

async function extractAdditionalRoleResponsibilitiesFromZeugnis(input: {
  role: NonNullable<CandidateProfileResponse["roles"]>[number];
  existingResponsibilities: string[];
  documentFileName: string;
  documentText: string;
}): Promise<string[]> {
  const model = MODEL_PRIORITY[0] || "gpt-4.1-mini";
  const instruction = [
    "Extract only factual additional responsibilities for this exact role from the provided employment reference text.",
    "Return only tasks/duties/responsibilities. Do not include praise, personality, or performance-evaluation wording.",
    "Keep extraction language-agnostic and faithful to source facts.",
    "Additive only: do not rewrite or remove existing responsibilities.",
    "Return JSON only with key additionalResponsibilities.",
  ].join(" ");

  const response = await withTimeout(
    openai.responses.create({
      model,
      input: [
        {
          role: "system",
          content: [{ type: "input_text", text: instruction }],
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: JSON.stringify(
                {
                  role: {
                    title: input.role.title,
                    company: input.role.company,
                    startDate: input.role.startDate,
                    endDate: input.role.endDate,
                  },
                  existingResponsibilities: input.existingResponsibilities,
                  sourceFileName: input.documentFileName,
                  referenceText: clampText(input.documentText, 14000).text,
                },
                null,
                2,
              ),
            },
          ],
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "role_responsibility_extraction",
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              additionalResponsibilities: {
                type: "array",
                items: { type: "string" },
              },
            },
            required: ["additionalResponsibilities"],
          },
        },
      },
    }),
    30000,
  );

  const parsed = JSON.parse(response.output_text) as RoleResponsibilityExtraction;
  return cleanStringArrayUnlimited(parsed.additionalResponsibilities);
}

async function enrichRolesFromZeugnisse(
  profile: CandidateProfileResponse,
  documents: InputDocument[],
): Promise<CandidateProfileResponse> {
  if (!Array.isArray(profile.roles) || profile.roles.length === 0) return profile;

  const zeugnisse = documents.filter(
    (doc) =>
      isZeugnisKind(doc.kind) &&
      typeof doc.text === "string" &&
      doc.text.trim().length > 0,
  );
  if (zeugnisse.length === 0) return profile;

  const roles = profile.roles.map((role) => ({
    ...role,
    achievements: Array.isArray(role.achievements) ? [...role.achievements] : [],
  }));

  for (let roleIndex = 0; roleIndex < roles.length; roleIndex += 1) {
    const role = roles[roleIndex];
    for (const doc of zeugnisse) {
      const docText = typeof doc.text === "string" ? doc.text : "";
      const normalizedDoc = normalizeForMatch(docText);
      const isMatch =
        hasCompanyAlignment(role, normalizedDoc) &&
        hasTitleAlignment(role, normalizedDoc) &&
        hasDateAlignment(role, docText);

      if (!isMatch) continue;

      const beforeCount = role.achievements.length;
      const existing = new Set(role.achievements.map((item) => normalizeForMatch(item)));
      let additions: string[] = [];
      try {
        additions = await extractAdditionalRoleResponsibilitiesFromZeugnis({
          role,
          existingResponsibilities: role.achievements,
          documentFileName: doc.fileName ?? "(unnamed)",
          documentText: docText,
        });
      } catch (error) {
        console.warn("[role-enrichment] extraction failed for match:", {
          roleIndex,
          roleTitle: role.title,
          sourceFileName: doc.fileName ?? "(unnamed)",
          message: error instanceof Error ? error.message : String(error),
        });
        continue;
      }

      let addedCount = 0;
      for (const addition of additions) {
        const key = normalizeForMatch(addition);
        if (!key || existing.has(key)) continue;
        existing.add(key);
        role.achievements.push(addition);
        addedCount += 1;
      }

      console.log("[role-enrichment] matched role pair:", {
        roleIndex,
        roleTitle: role.title,
        roleCompany: role.company,
        sourceFileName: doc.fileName ?? "(unnamed)",
      });
      console.log("[role-enrichment] responsibility enrichment:", {
        roleIndex,
        roleTitle: role.title,
        beforeResponsibilities: beforeCount,
        addedFromZeugnis: addedCount,
        afterResponsibilities: role.achievements.length,
      });
    }
  }

  return { ...profile, roles };
}

/**
 * Re-apply user corrections from correctionLog onto a freshly extracted profile.
 * This is the net add rule: AI re-extraction never overwrites user corrections.
 */
function reapplyUserCorrections(
  profile: CandidateProfileResponse,
  correctionLog: CorrectionLogEntry[],
): CandidateProfileResponse {
  const p = { ...profile };

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

// ── Merge + Canonicalize (enrichment mode) ────────────────────────────────────

type RawClaim = {
  claim: string;
  evidence: string[];
  confidence: "high" | "medium";
};

/**
 * Safely extract verified claims from an arbitrary (pre-serialized) profile object.
 */
function extractClaimsFromRaw(value: unknown): RawClaim[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (x): x is Record<string, unknown> =>
        x !== null && typeof x === "object" && !Array.isArray(x),
    )
    .flatMap((x): RawClaim[] => {
      const claim = typeof x.claim === "string" ? x.claim.trim() : null;
      if (!claim) return [];
      const evidence = Array.isArray(x.evidence)
        ? (x.evidence as unknown[])
            .filter((e): e is string => typeof e === "string")
            .map((e) => e.trim())
            .filter(Boolean)
        : [];
      const confidence: "high" | "medium" =
        x.confidence === "high" ? "high" : "medium";
      return [{ claim, evidence, confidence }];
    });
}

/**
 * Union two claim arrays deduplicated by normalized claim text (exact match).
 * Near-duplicate semantic collapse is left to the AI canonicalization step.
 */
function unionClaims(a: RawClaim[], b: RawClaim[]): RawClaim[] {
  const seen = new Set(
    a.map((c) =>
      c.claim
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim(),
    ),
  );
  const result = [...a];
  for (const c of b) {
    const key = c.claim.toLowerCase().replace(/\s+/g, " ").trim();
    if (!seen.has(key)) {
      seen.add(key);
      result.push(c);
    }
  }
  return result;
}

/**
 * Run after extraction + sanitization + corrections when in enrichment mode.
 *
 * Two modes, chosen by comparing document fingerprints:
 *
 * REBUILD_SAME_DOCS (fingerprints match):
 *   The fresh extraction already read every document that built the existing profile.
 *   Unioning existing + fresh would accept AI rephrasing as new evidence, inflating
 *   the profile on every rebuild. Instead, return fresh directly — it is the
 *   authoritative read of the unchanged source set.
 *
 * ENRICH_NEW_DOCS (fingerprints differ):
 *   New documents have been added. Union is correct: preserve existing evidence
 *   and add what the new documents contribute. Then run AI canonicalization to
 *   collapse semantic/multilingual duplicates.
 *   Safety guard: AI can only shrink or equal counts, never inflate.
 *   Non-blocking: any failure returns the basic-merged profile unchanged.
 */
async function mergeAndCanonicalizeEnrichment(
  fresh: CandidateProfileResponse,
  existing: Record<string, unknown>,
  incomingFingerprint: string,
): Promise<CandidateProfileResponse> {
  const existingFingerprint =
    typeof existing.sourceFingerprint === "string"
      ? existing.sourceFingerprint
      : null;

  // REBUILD_SAME_DOCS: fresh extraction is authoritative — skip union entirely.
  if (existingFingerprint !== null && incomingFingerprint === existingFingerprint) {
    console.log("[extract-candidate-profile] same-doc rebuild detected — using fresh extraction as authoritative (no union)");
    return fresh;
  }

  // ENRICH_NEW_DOCS: union accumulator fields from existing + new evidence.
  console.log("[extract-candidate-profile] new-doc enrichment — unioning existing + fresh");

  // Step 1 — union accumulator fields deterministically
  const mergedSkills = deduplicateArray([
    ...cleanStringArray(existing.coreSkills),
    ...(fresh.coreSkills ?? []),
  ]);
  const mergedTools = deduplicateArray([
    ...cleanStringArray(existing.tools),
    ...(fresh.tools ?? []),
  ]);
  const mergedIndustries = deduplicateArray([
    ...cleanStringArray(existing.industries),
    ...(fresh.industries ?? []),
  ]);
  const mergedClaims = unionClaims(
    extractClaimsFromRaw(existing.verifiedClaims),
    fresh.verifiedClaims ?? [],
  );
  // openQuestions: fresh extraction is authoritative (not unioned).
  // The canonicalization AI will suppress any that are already answered.
  const freshQuestions = fresh.openQuestions ?? [];

  const baseMerged: CandidateProfileResponse = {
    ...fresh,
    coreSkills: mergedSkills,
    tools: mergedTools,
    industries: mergedIndustries,
    verifiedClaims: mergedClaims,
    openQuestions: freshQuestions,
  };

  // Step 2 — AI semantic canonicalization
  const model = MODEL_PRIORITY[0] || "gpt-4.1-mini";
  const instructions = buildCanonicalizeProfileInstructions();
  const input = {
    coreSkills: mergedSkills,
    industries: mergedIndustries,
    verifiedClaims: mergedClaims,
    openQuestions: freshQuestions,
  };

  try {
    const response = await withTimeout(
      openai.responses.create({
        model,
        input: [
          {
            role: "system",
            content: [{ type: "input_text", text: instructions }],
          },
          {
            role: "user",
            content: [
              { type: "input_text", text: JSON.stringify(input, null, 2) },
            ],
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "canonicalized_profile",
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                coreSkills: { type: "array", items: { type: "string" } },
                industries: { type: "array", items: { type: "string" } },
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
              },
              required: [
                "coreSkills",
                "industries",
                "verifiedClaims",
                "openQuestions",
              ],
            },
          },
        },
      }),
      CANONICALIZE_TIMEOUT_MS,
    );

    type CanonResult = {
      coreSkills: string[];
      industries: string[];
      verifiedClaims: RawClaim[];
      openQuestions: string[];
    };
    const result = JSON.parse(response.output_text) as CanonResult;

    // Step 3 — safety guard: never let the AI inflate counts
    const canonical: CandidateProfileResponse = {
      ...baseMerged,
      coreSkills:
        Array.isArray(result.coreSkills) &&
        result.coreSkills.length <= mergedSkills.length
          ? result.coreSkills
          : mergedSkills,
      industries:
        Array.isArray(result.industries) &&
        result.industries.length <= mergedIndustries.length
          ? result.industries
          : mergedIndustries,
      verifiedClaims:
        Array.isArray(result.verifiedClaims) &&
        result.verifiedClaims.length <= mergedClaims.length
          ? result.verifiedClaims
          : mergedClaims,
      openQuestions:
        Array.isArray(result.openQuestions) &&
        result.openQuestions.length <= freshQuestions.length
          ? result.openQuestions
          : freshQuestions,
    };

    console.log("[extract-candidate-profile] canonicalize done:", {
      skills: `${mergedSkills.length} → ${canonical.coreSkills?.length ?? 0}`,
      industries: `${mergedIndustries.length} → ${canonical.industries?.length ?? 0}`,
      claims: `${mergedClaims.length} → ${canonical.verifiedClaims?.length ?? 0}`,
      questions: `${freshQuestions.length} → ${canonical.openQuestions?.length ?? 0}`,
    });

    return canonical;
  } catch (err) {
    // Step 4 — non-blocking: return basic-merged profile if AI call fails
    console.warn(
      "[extract-candidate-profile] canonicalization failed — using basic-merged profile:",
      err instanceof Error ? err.message : String(err),
    );
    return baseMerged;
  }
}

// ─────────────────────────────────────────────────────────────────────────────

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
    EXTRACT_TIMEOUT_MS,
  );

  const parsed = JSON.parse(response.output_text) as Partial<CandidateProfileResponse>;
  return parsed;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ExtractCandidateProfileRequest;

    const documents = Array.isArray(body.documents) ? body.documents : [];
    const prepared = sanitizeDocuments(documents);

    // Compute a fingerprint of the incoming document set.
    // Passed to mergeAndCanonicalizeEnrichment so it can distinguish a same-doc
    // rebuild (replace) from a genuine new-doc enrichment (union).
    const incomingFingerprint = computeDocumentFingerprint(documents);

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

    // DEBUG — fingerprint trace (temporary, remove after test run)
    {
      const _existingFp = existingProfile
        ? (typeof existingProfile.sourceFingerprint === "string"
            ? existingProfile.sourceFingerprint
            : "(none)")
        : "(no existing profile)";
      const _fpMatch =
        existingProfile !== null &&
        typeof existingProfile.sourceFingerprint === "string" &&
        incomingFingerprint === existingProfile.sourceFingerprint;
      console.log("[DEBUG extract-candidate-profile] incomingFingerprint:", incomingFingerprint.slice(0, 120));
      console.log("[DEBUG extract-candidate-profile] existingFingerprint:", _existingFp.slice(0, 120));
      console.log("[DEBUG extract-candidate-profile] fingerprintsMatch:", _fpMatch);
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

    // DEBUG — skill count after fresh AI extraction (temporary, remove after test run)
    console.log("[DEBUG extract-candidate-profile] skill count — fresh extraction:", (rawExtracted.coreSkills ?? []).length);

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

    // DEBUG — skill count after sanitize + corrections (temporary, remove after test run)
    console.log("[DEBUG extract-candidate-profile] skill count — post-sanitize+corrections:", (candidateProfile.coreSkills ?? []).length);

    // Enrichment mode: detect same-doc rebuild vs genuine new-doc enrichment.
    // Same docs → fresh extraction is authoritative (no union, prevents inflation).
    // New docs → union + AI canonicalization collapses semantic/multilingual duplicates.
    // Non-blocking: any failure returns the basic-merged (or fresh) profile unchanged.
    if (existingProfile) {
      candidateProfile = await mergeAndCanonicalizeEnrichment(
        candidateProfile,
        existingProfile,
        incomingFingerprint,
      );
    }

    candidateProfile = await enrichRolesFromZeugnisse(candidateProfile, documents);

    const capabilityInventory: CandidateCapabilityInventory =
      normalizeCandidateCapabilities(asCandidateProfile(candidateProfile));

    // Attach the fingerprint to the profile so it survives round-trips through
    // rawResponse and is available to the next rebuild for same-doc detection.
    candidateProfile = { ...candidateProfile, sourceFingerprint: incomingFingerprint };

    // DEBUG — skill counts at final return (temporary, remove after test run)
    console.log("[DEBUG extract-candidate-profile] skill count — post-canonicalization:", (candidateProfile.coreSkills ?? []).length);
    console.log("[DEBUG extract-candidate-profile] skill count — final returned:", (candidateProfile.coreSkills ?? []).length);

    return NextResponse.json({
      candidateProfile,
      capabilityInventory,
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
