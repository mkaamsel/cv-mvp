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

const POSSESSION_HINTS = [
  "german",
  "deutsch",
  "english",
  "englisch",
  "driving licence",
  "driver's license",
  "driver license",
  "führerschein",
  "class b",
  "klasse b",
  "work permit",
  "arbeitserlaubnis",
  "steuerberater",
  "cpa",
  "acca",
  "cima",
  "ifrs",
  "hgb",
  "sap",
  "s/4hana",
  "s4hana",
  "certificate",
  "certification",
  "certified",
  "degree",
  "bachelor",
  "master",
  "mba",
  "licence",
  "license",
];

const HARD_BLOCKER_HINTS = [
  "must have",
  "required",
  "requirement",
  "mandatory",
  "zwingend",
  "unbedingt",
  "erforderlich",
  "voraussetzung",
  "must be fluent",
  "fluent german",
  "deutschkenntnisse",
  "steuerberater",
  "class b",
  "klasse b",
  "führerschein",
  "driving licence",
  "driver's license",
  "work permit",
  "arbeitserlaubnis",
];

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

function uniq(values: string[]): string[] {
  return Array.from(new Set(values.map((item) => item.trim()).filter(Boolean)));
}

function flattenCandidateEvidence(profile: CandidateProfile): string[] {
  const roleItems = profile.roles.flatMap((role) => [
    role.title || "",
    role.company || "",
    role.location || "",
    ...role.achievements,
  ]);

  const languageItems = profile.languages.flatMap((item) => [
    item.language || "",
    item.proficiency || "",
  ]);

  const educationItems = profile.education.flatMap((item) => [
    item.degree || "",
    item.field || "",
    item.institution || "",
  ]);

  const certificationItems = profile.certifications.flatMap((item) => [
    item.name || "",
    item.issuer || "",
  ]);

  const verifiedItems = profile.verifiedClaims.flatMap((item) => [
    item.claim || "",
    ...item.evidence,
  ]);

  return uniq([
    profile.headline || "",
    profile.summary || "",
    ...roleItems,
    ...profile.coreSkills,
    ...profile.tools,
    ...profile.standards,
    ...profile.industries,
    ...languageItems,
    ...educationItems,
    ...certificationItems,
    ...profile.leadershipSignals,
    ...profile.strengths,
    ...profile.constraints,
    ...verifiedItems,
    ...profile.openQuestions,
  ]);
}

function classifyCandidatePossessions(profile: CandidateProfile): string[] {
  const evidence = flattenCandidateEvidence(profile);
  const lowerEvidence = evidence.map((item) => item.toLowerCase());

  const detected: string[] = [];

  for (const hint of POSSESSION_HINTS) {
    if (lowerEvidence.some((item) => item.includes(hint))) {
      detected.push(hint);
    }
  }

  profile.languages.forEach((item) => {
    if (item.language?.trim()) {
      detected.push(`language: ${item.language.trim()}${item.proficiency ? ` (${item.proficiency.trim()})` : ""}`);
    }
  });

  profile.education.forEach((item) => {
    const degreeLine = [item.degree, item.field, item.institution]
      .filter(Boolean)
      .join(" | ")
      .trim();

    if (degreeLine) {
      detected.push(`education: ${degreeLine}`);
    }
  });

  profile.certifications.forEach((item) => {
    const certLine = [item.name, item.issuer].filter(Boolean).join(" | ").trim();
    if (certLine) {
      detected.push(`certification: ${certLine}`);
    }
  });

  return uniq(detected);
}

function classifyJobExperienceRequirements(job: StructuredJob): string[] {
  return uniq([
    ...job.responsibilities,
    ...job.requirements.filter((item) => {
      const lower = item.toLowerCase();
      return !POSSESSION_HINTS.some((hint) => lower.includes(hint));
    }),
  ]);
}

function classifyJobPossessionRequirements(job: StructuredJob): {
  mandatory: string[];
  other: string[];
} {
  const mandatory: string[] = [];
  const other: string[] = [];

  for (const item of job.requirements) {
    const lower = item.toLowerCase();
    const looksLikePossession = POSSESSION_HINTS.some((hint) => lower.includes(hint));

    if (!looksLikePossession) continue;

    const isHard = HARD_BLOCKER_HINTS.some((hint) => lower.includes(hint));

    if (isHard) {
      mandatory.push(item);
    } else {
      other.push(item);
    }
  }

  return {
    mandatory: uniq(mandatory),
    other: uniq(other),
  };
}

function buildRecommendationInput(
  candidateProfile: CandidateProfile,
  structuredJob: StructuredJob,
  companyContext: CompanyContext,
  extractedText: string
): string {
  const candidateEvidence = flattenCandidateEvidence(candidateProfile);
  const candidatePossessions = classifyCandidatePossessions(candidateProfile);
  const jobExperienceRequirements = classifyJobExperienceRequirements(structuredJob);
  const jobPossessions = classifyJobPossessionRequirements(structuredJob);

  return `
RECOMMENDATION TASK INPUT

CANDIDATE PROFILE (FULL JSON)
${JSON.stringify(candidateProfile, null, 2)}

STRUCTURED JOB (FULL JSON)
${JSON.stringify(structuredJob, null, 2)}

COMPANY CONTEXT
${JSON.stringify(companyContext ?? null, null, 2)}

EXTRACTED JOB TEXT
${extractedText}

CANDIDATE EXPERIENCE / EVIDENCE DIGEST
${candidateEvidence.length ? `- ${candidateEvidence.join("\n- ")}` : "- none"}

CANDIDATE POSSESSIONS DIGEST
${candidatePossessions.length ? `- ${candidatePossessions.join("\n- ")}` : "- none clearly evidenced"}

ROLE EXPERIENCE REQUIREMENTS
${jobExperienceRequirements.length ? `- ${jobExperienceRequirements.join("\n- ")}` : "- none clearly extracted"}

ROLE POSSESSIONS REQUIREMENTS
Mandatory / likely blockers:
${jobPossessions.mandatory.length ? `- ${jobPossessions.mandatory.join("\n- ")}` : "- none clearly extracted"}

Other possession-type asks:
${jobPossessions.other.length ? `- ${jobPossessions.other.join("\n- ")}` : "- none clearly extracted"}

STRICT EVALUATION RULES
1. Separate experience from possessions.
2. A missing or not-evidenced mandatory possession must NOT be treated like a normal skill gap.
3. Mandatory possessions can include language, degree, licence, certification, work permit, Steuerberater, Class B driving licence, or similar operational/legal qualifications.
4. If something is not found in the candidate evidence, prefer "not evidenced" logic rather than inventing it.
5. Strong matches should be presented strongly when reinforced by both experience and possession, for example SAP experience plus SAP certification.
6. The system is a mentor and guide, not a rejection bot and not a bootlicker.
7. Even in weak cases, advice should remain constructive and calm.
`.trim();
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

    const inputText = buildRecommendationInput(
      body.candidateProfile,
      body.structuredJob,
      body.companyContext ?? null,
      typeof body.extractedText === "string" ? body.extractedText.trim() : ""
    );

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