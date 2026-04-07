import OpenAI from "openai";
import { buildApplicationRecommendationInstructions } from "@/lib/prompts/applicationRecommendationPrompt";
import { buildCompanyContextInstructions } from "@/lib/prompts/companyContextPrompt";
import { buildCompanyResearchInstructions } from "@/lib/prompts/companyResearchPrompt";
import { buildGenerateCoverLetterInstructions } from "@/lib/prompts/generateCoverLetterPrompt";
import { buildGenerateCvInstructions } from "@/lib/prompts/generateCvPrompt";
import { buildMarketSignalsInstructions } from "@/lib/prompts/marketSignalsPrompt";
import { buildPositioningBriefPrompt } from "@/lib/prompts/positioningBriefPrompt";
import { buildRequiredProfileInstructions } from "@/lib/prompts/requiredProfilePrompt";
import { buildReviewPrompt } from "@/lib/prompts/reviewPrompt";
import { buildJdQualityInstructions } from "@/lib/prompts/jdQualityPrompt";
import { buildSelectedEvidenceInstructions } from "@/lib/prompts/selectedEvidencePrompt";
import { buildLanguageContext } from "@/lib/prompts/Intelligence/buildLanguageContext";

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";

type DebugConfig = Record<string, boolean>;

type TailoringPipelineInput = {
  origin: string;
  cookieHeader?: string;
  jobUrl?: string;
  jobDescriptionText?: string;
  outputLanguage?: "en" | "de" | string;
  candidateProfile?: Record<string, unknown> | null;
  debugConfig?: DebugConfig;
};

type StructuredJob = {
  companyName: string;
  jobTitle: string;
  location: string;
  responsibilities: string[];
  requirements: string[];
  summary: string;
};

type CandidateProfileView = {
  experienceSignals: string[];
  possessionSignals: string[];
};

type RequiredProfile = {
  responsibilitySignals: string[];
  requirementSignals: string[];
  qualificationSignals: string[];
  technicalSignals: string[];
  softSignals: string[];
  // EXP-01: core-only signals separated from supporting/preferred
  coreRequirementSignals: string[];
};

type CompanyContext = {
  companyLabel: string;
  roleLabel: string;
  locationLabel: string;
  environmentSummary: string;
};

type CompanyResearch = {
  employerType: string;
  complexitySignal: string;
  scopeSignal: string;
  notes: string[];
};

type MarketSignals = {
  senioritySignal: string;
  strictnessSignal: string;
  transferabilitySignal: string;
  notes: string[];
};

type SelectedEvidencePack = {
  strongEvidence: string[];
  supportEvidence: string[];
  transferableEvidence: string[];
  weakEvidence: string[];
  combinedTopEvidence: string[];
};

type PositioningBriefPack = {
  positioningStrength: "measured" | "solid" | "strong";
  positioningTone: "specialist" | "senior_specialist" | "leadership_adjacent";
  coreWhyFit: string[];
  positioningRisks: string[];
  positioningStrategy: string;
  coverLetterAngle: string;
  cvEmphasis: string[];
};

type RecommendationPack = {
  applicationRecommendation:
    | "apply_confidently"
    | "apply_with_care"
    | "borderline"
    | "not_recommended";
  advisorMessage: string;
  reasoningSummary: string;
  strongMatches: string[];
  stretchMatches: string[];
  riskAreas: string[];
  blockers: string[];
  recommendation: string;
};

type ReviewReport = {
  truthCheck?: string;
  unsupportedClaims?: string[];
  relevanceScore?: number;
  inflationRisk?: string;
  weakEvidence?: string[];
  clarityFixes?: number;
};

type ReviewResult = {
  reviewReport?: ReviewReport;
  improvedDraft?: string;
};

type BundleAssembly = {
  candidateProfile: Record<string, unknown> | null;
  candidateProfileView: CandidateProfileView;
  jobProfile: WorkspaceJobProfile;
  structuredJob: StructuredJob;
  requiredProfile: RequiredProfile;
  companyContext: CompanyContext;
  companyResearch: CompanyResearch;
  marketSignals: MarketSignals;
  selectedEvidence: SelectedEvidencePack;
  positioningBrief: PositioningBriefPack;
  recommendation: RecommendationPack;
};

type WorkspaceJobProfile = {
  companyName?: string;
  jobTitle?: string;
  location?: string;
  responsibilities?: string[];
  requirements?: string[];
  summary?: string;
  extractedText?: string;
  extractionSource?:
    | "pasted-text"
    | "direct"
    | "readable-fallback"
    | "blocked-or-thin-content";
  normalizedUrl?: string;
  warnings?: string[];
  outputLanguage?: "de" | "en" | "es";
  rawResponse?: unknown;
};

type WorkspaceInsights = {
  selectedEvidence?: string[];
  positioningBrief?: string;
  positioningStrategy?: string;
  missingSignals?: string[];
  companyContext?: string | Record<string, unknown> | null;
  recommendation?: string | Record<string, unknown> | null;
  applicationRecommendation?:
    | "apply_confidently"
    | "apply_with_care"
    | "borderline"
    | "not_recommended";
  advisorMessage?: string;
  reasoningSummary?: string;
  strongMatches?: string[];
  stretchMatches?: string[];
  riskAreas?: string[];
  blockers?: string[];
  bundle?: Record<string, unknown> | null;
  rawResponse?: unknown;
};

type WorkspaceFinalDrafts = {
  cvDraft?: string;
  coverLetterDraft?: string;
  finalCv?: string;
  finalCoverLetter?: string;
  drafts?: Record<string, unknown> | null;
  outputLanguage?: string;
  status?: string;
  runId?: string;
  warnings?: string[];
  reviewFindings?: string | string[] | Record<string, unknown>;
  rawResponse?: unknown;
};

type TailoringPipelineSuccess = {
  ok: true;
  runId: string;
  jobProfile: WorkspaceJobProfile;
  structuredJob: StructuredJob;
  insights: WorkspaceInsights;
  finalDrafts: WorkspaceFinalDrafts;
  jdQualityAnalysis: JdQualityAnalysis | null;
  jdQualityGate: JdQualityGate;
  observationPoints: ObservationPoint[];
  telemetry: {
    runId: string;
    outcome: "completed" | "completed_with_limitations";
    pipelineTrace: string[];
    diagnostics: {
      selectedEvidenceCount: number;
      missingSignalsCount: number;
      strongMatchesCount: number;
      riskAreasCount: number;
      review: {
        cvTruthCheck: string | null;
        cvRelevanceScore: number | null;
        cvInflationRisk: string | null;
        coverLetterTruthCheck: string | null;
        coverLetterRelevanceScore: number | null;
        coverLetterInflationRisk: string | null;
      };
    };
  };
};

type TailoringPipelineError = {
  ok: false;
  status: number;
  message: string;
  details?: unknown;
};

type AiRequiredProfileOutput = {
  targetSeniority?: "junior" | "mid" | "senior" | "mixed";
  requiredCompetencies?: Array<{
    competency?: string;
    category?:
      | "domain"
      | "technical"
      | "tool"
      | "education"
      | "language"
      | "behavioural"
      | "stakeholder";
    importance?: "core" | "supporting" | "preferred";
    interpretation?: string;
  }>;
  requiredExperienceSignals?: string[];
  requiredTools?: string[];
  requiredLanguages?: string[];
  requiredEducation?: string[];
  behaviouralSignals?: string[];
  stakeholderSignals?: string[];
  summary?: string;
};

type AiCompanyContextOutput = {
  industry?: string[];
  financeEnvironment?: string[];
  reportingEnvironment?: string[];
  leadershipScope?: string[];
  operatingSignals?: string[];
  cultureSignals?: string[];
  summary?: string;
};

type AiCompanyResearchOutput = {
  companySummary?: string;
  recentSignals?: string[];
  strategicThemes?: string[];
  positiveHooks?: string[];
  riskSignals?: string[];
  whyThisCompanyAngles?: string[];
};

type AiMarketSignalsOutput = {
  seniorityTarget?: "junior" | "mid" | "senior" | "mixed";
  roleNature?: "operational" | "advisory" | "strategic" | "mixed";
  businessModelSignals?: string[];
  hiringSignals?: string[];
  candidateRiskSignals?: string[];
  communicationSignals?: string[];
  deliverySignals?: string[];
  summary?: string;
};

type AiSelectedEvidenceOutput = {
  strongEvidence?: string[];
  supportEvidence?: string[];
  transferableEvidence?: string[];
  weakEvidence?: string[];
  combinedTopEvidence?: string[];
};

export type TailoringPipelineResult =
  | TailoringPipelineSuccess
  | TailoringPipelineError;

// ── New types added 2026-04-04 ────────────────────────────────────────────────

type JdDimensionScore = {
  score: number;     // 0–1
  signals: string[];
  notes: string;
};

type JdQualityAnalysis = {
  freshness: JdDimensionScore;
  urgency: JdDimensionScore;
  authenticity: JdDimensionScore;
  completeness: JdDimensionScore;
  overallTier: "green" | "amber" | "red";
  inferredVsStated: boolean;
  mentorMessage: string | null;
};

export type JdQualityGate = {
  tier: "green" | "amber" | "red";
  inferredVsStated: boolean;
  mentorMessage: string | null;
  // Always false out of the pipeline. The UI sets this after candidate confirmation.
  proceedAnyway: boolean;
};

export type ObservationPoint = {
  layerId: string;
  timestamp: string;
  inputSummary: string;
  outputSummary: string;
  track: "ai" | "rule_fallback";
  confidence: number;   // 0–1
  timeTaken: number;    // ms
  warnings: string[];
  humanReadableExplanation: string; // mandatory — must be readable by a non-technical person
};

const DEFAULT_ENGINE_SWITCHES = {
  LAYER_0_JD_QUALITY: true,
  LAYER_0_JD_QUALITY_AI: true,
  LAYER_1_ANALYSIS: true,
  LAYER_2_CANDIDATE_PROFILE_VIEW: true,
  LAYER_3_REQUIRED_PROFILE: true,
  LAYER_3_REQUIRED_PROFILE_AI: true,
  LAYER_4_COMPANY_CONTEXT: true,
  LAYER_4_COMPANY_CONTEXT_AI: true,
  LAYER_5_COMPANY_RESEARCH: true,
  LAYER_5_COMPANY_RESEARCH_AI: true,
  LAYER_6_MARKET_SIGNALS: true,
  LAYER_6_MARKET_SIGNALS_AI: true,
  LAYER_7_SELECTED_EVIDENCE: true,
  LAYER_7_SELECTED_EVIDENCE_AI: true,
  LAYER_8_POSITIONING: true,
  LAYER_8_POSITIONING_AI: true,
  LAYER_9_RECOMMENDATION: true,
  LAYER_9_RECOMMENDATION_AI: true,
  LAYER_RECOMMENDATION_VALIDATION: true,
  LAYER_10_BUNDLE_ASSEMBLY: true,
  LAYER_11_GENERATION: true,
  LAYER_11_COVER_LETTER_AI: true,
  LAYER_12_REVIEW: true,
  LAYER_12_REVIEW_AI: true,
} as const;

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value.trim() : null;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function asLanguageObjects(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      const record = asRecord(item);
      if (!record) return null;
      const language = asString(record.language);
      const proficiency = asString(record.proficiency);
      if (!language) return null;
      return proficiency ? `${language} (${proficiency})` : language;
    })
    .filter((item): item is string => Boolean(item));
}

function asEducationObjects(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      const record = asRecord(item);
      if (!record) return null;
      const degree = asString(record.degree) ?? "";
      const field = asString(record.field) ?? "";
      const institution = asString(record.institution) ?? "";
      const text = [degree, field, institution].filter(Boolean).join(" — ");
      return text || null;
    })
    .filter((item): item is string => Boolean(item));
}

function asCertificationObjects(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      const record = asRecord(item);
      if (!record) return null;
      const name = asString(record.name) ?? "";
      const issuer = asString(record.issuer) ?? "";
      const text = [name, issuer].filter(Boolean).join(" — ");
      return text || null;
    })
    .filter((item): item is string => Boolean(item));
}

function normalizeLanguage(value: unknown): "en" | "de" | "es" {
  if (value === "de") return "de";
  if (value === "es") return "es";
  return "en";
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9äöüß+#/.]+/i)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3);
}

function scoreOverlap(a: string, b: string): number {
  const tokensA = new Set(tokenize(a));
  const tokensB = tokenize(b);

  if (tokensA.size === 0 || tokensB.length === 0) return 0;

  let matches = 0;
  for (const token of tokensB) {
    if (tokensA.has(token)) matches += 1;
  }

  return matches;
}

function dedupeStrings(items: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const item of items) {
    const key = item.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      result.push(item);
    }
  }

  return result;
}

function toJsonString(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "{}";
  }
}

function stripCodeFences(text: string): string {
  return text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function tryParseJson<T>(text: string): T | null {
  try {
    return JSON.parse(stripCodeFences(text)) as T;
  } catch {
    return null;
  }
}

async function callAiJson<T>(
  systemInstruction: string,
  userPayload: string,
): Promise<T | null> {
  if (!openai) return null;

  try {
    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      temperature: 0.2,
      messages: [
        { role: "system", content: systemInstruction },
        { role: "user", content: userPayload },
      ],
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content ?? "";
    return tryParseJson<T>(content);
  } catch (err) {
    console.error("[callAiJson] AI call failed:", err instanceof Error ? err.message : String(err));
    return null;
  }
}

async function callAiText(
  systemInstruction: string,
  userPayload: string,
): Promise<string | null> {
  if (!openai) return null;

  try {
    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      temperature: 0.4,
      messages: [
        { role: "system", content: systemInstruction },
        { role: "user", content: userPayload },
      ],
    });

    const content = response.choices[0]?.message?.content?.trim() ?? "";
    return content || null;
  } catch (err) {
    console.error("[callAiText] AI call failed:", err instanceof Error ? err.message : String(err));
    return null;
  }
}

function normalizeStructuredJob(input: unknown): StructuredJob {
  const job = asRecord(input) ?? {};

  const responsibilities = asStringArray(job.responsibilities);
  const requirements = asStringArray(job.requirements);
  const summary = asString(job.summary) ?? "";

  const companyName = asString(job.companyName) ?? "";
  const rawJobTitle = asString(job.jobTitle) ?? "";
  const location = asString(job.location) ?? "";

  function looksLikeBadTitle(line: string): boolean {
    const lower = line.toLowerCase();

    return (
      lower.includes("idealerweise") ||
      lower.includes("interesse daran") ||
      lower.includes("verantwortung für") ||
      lower.includes("zuständig für") ||
      lower.includes("mehrjährige berufserfahrung") ||
      lower.includes("kaufmännische ausbildung") ||
      lower.includes("wirtschaftswissenschaftliches studium") ||
      lower.includes("deutschkenntnisse") ||
      lower.includes("englischkenntnisse") ||
      lower.includes("ansprechpartner") ||
      lower.includes("zusammenarbeit mit") ||
      lower.includes("mitwirkung an") ||
      lower.includes("erstellung von") ||
      lower.includes("überwachung der") ||
      lower.includes("betreuung der") ||
      lower.includes("aktive mitwirkung")
    );
  }

  let jobTitle = rawJobTitle;

  if (!jobTitle || looksLikeBadTitle(jobTitle)) {
    jobTitle = "";
  }

  // jobTitle remains "" if not reliably extracted — no fallback from body text

  return {
    companyName,
    jobTitle,
    location,
    responsibilities,
    requirements,
    summary,
  };
}

function getCandidateRoleLines(
  candidateProfile: Record<string, unknown> | null,
): string[] {
  if (!candidateProfile) return [];

  const roles = Array.isArray(candidateProfile.roles)
    ? candidateProfile.roles
    : Array.isArray(candidateProfile.experience)
      ? candidateProfile.experience
      : [];

  return roles
    .map((item) => {
      const role = asRecord(item);
      if (!role) return null;

      const title = asString(role.title) ?? "";
      const company = asString(role.company) ?? "";
      const achievements = asStringArray(role.achievements);
      const responsibilities = asStringArray(role.responsibilities);

      const header = [title, company].filter(Boolean).join(" at ").trim();
      if (!header && achievements.length === 0 && responsibilities.length === 0) {
        return null;
      }

      return [header, ...responsibilities, ...achievements]
        .filter(Boolean)
        .join(" — ");
    })
    .filter((item): item is string => Boolean(item));
}

function getCandidateSkills(
  candidateProfile: Record<string, unknown> | null,
): string[] {
  if (!candidateProfile) return [];

  return dedupeStrings([
    ...asStringArray(candidateProfile.coreSkills),
    ...asStringArray(candidateProfile.skills),
    ...asStringArray(candidateProfile.tools),
    ...asStringArray(candidateProfile.standards),
    ...asStringArray(candidateProfile.domains),
    ...asStringArray(candidateProfile.industries),
    ...asStringArray(candidateProfile.strengths),
    ...asStringArray(candidateProfile.competencies),
    ...asStringArray(candidateProfile.leadershipSignals),
    ...asLanguageObjects(candidateProfile.languages),
    ...asEducationObjects(candidateProfile.education),
    ...asCertificationObjects(candidateProfile.certifications),
  ]);
}

function buildCandidateProfileView(
  candidateProfile: Record<string, unknown> | null,
): CandidateProfileView {
  const experienceSignals = getCandidateRoleLines(candidateProfile);

  const possessionSignals = dedupeStrings([
    ...getCandidateSkills(candidateProfile),
    ...asStringArray(candidateProfile?.degrees),
    ...asStringArray(candidateProfile?.certifications),
    ...asStringArray(candidateProfile?.licenses),
  ]);

  return {
    experienceSignals: experienceSignals.slice(0, 20),
    possessionSignals: possessionSignals.slice(0, 20),
  };
}

function deriveRequiredProfile(job: StructuredJob): RequiredProfile {
  const tasks: string[] = [];
  const qualifications: string[] = [];
  const technical: string[] = [];
  const soft: string[] = [];

  const allLines = [...job.responsibilities, ...job.requirements];

  for (const line of allLines) {
    const lower = line.toLowerCase();

    if (
      lower.includes("abschluss") ||
      lower.includes("report") ||
      lower.includes("abstimmung") ||
      lower.includes("hauptbuch") ||
      lower.includes("ledger") ||
      lower.includes("account") ||
      lower.includes("buchhaltung") ||
      lower.includes("steuer") ||
      lower.includes("vat") ||
      lower.includes("controlling") ||
      lower.includes("intercompany") ||
      lower.includes("umsatzsteuer") ||
      lower.includes("audit")
    ) {
      tasks.push(line);
      continue;
    }

    if (
      lower.includes("studium") ||
      lower.includes("degree") ||
      lower.includes("ausbildung") ||
      lower.includes("qualification") ||
      lower.includes("bilanzbuchhalter") ||
      lower.includes("certified") ||
      lower.includes("berufserfahrung")
    ) {
      qualifications.push(line);
      continue;
    }

    if (
      lower.includes("sap") ||
      lower.includes("erp") ||
      lower.includes("excel") ||
      lower.includes("digital") ||
      lower.includes("system") ||
      lower.includes("it-affinität")
    ) {
      technical.push(line);
      continue;
    }

    if (
      lower.includes("team") ||
      lower.includes("kommunikation") ||
      lower.includes("communication") ||
      lower.includes("stakeholder") ||
      lower.includes("analytical") ||
      lower.includes("detail") ||
      lower.includes("organisation") ||
      lower.includes("deutsch") ||
      lower.includes("englisch")
    ) {
      soft.push(line);
      continue;
    }

    tasks.push(line);
  }

  return {
    responsibilitySignals: dedupeStrings(tasks).slice(0, 10),
    requirementSignals: dedupeStrings([
      ...technical,
      ...qualifications,
      ...soft,
    ]).slice(0, 10),
    qualificationSignals: dedupeStrings(qualifications).slice(0, 8),
    technicalSignals: dedupeStrings(technical).slice(0, 8),
    softSignals: dedupeStrings(soft).slice(0, 8),
    // EXP-01: rule track has no importance signal; default to qualifications as proxy for core
    coreRequirementSignals: dedupeStrings(qualifications).slice(0, 8),
    // EXP-01 end
  };
}

function mapAiRequiredProfileToInternal(
  ai: AiRequiredProfileOutput | null,
  fallback: RequiredProfile,
): RequiredProfile {
  if (!ai) return fallback;

  const competencies = Array.isArray(ai.requiredCompetencies)
    ? ai.requiredCompetencies
    : [];

  const qualificationSignals = dedupeStrings([
    ...asStringArray(ai.requiredEducation),
    ...asStringArray(ai.requiredLanguages),
    ...competencies
      .filter((item) => item?.category === "education" || item?.category === "language")
      .map((item) => asString(item?.competency) ?? "")
      .filter(Boolean),
  ]).slice(0, 8);

  const technicalSignals = dedupeStrings([
    ...asStringArray(ai.requiredTools),
    ...competencies
      .filter(
        (item) =>
          item?.category === "technical" ||
          item?.category === "tool" ||
          item?.category === "domain",
      )
      .map((item) => asString(item?.competency) ?? "")
      .filter(Boolean),
  ]).slice(0, 8);

  const softSignals = dedupeStrings([
    ...asStringArray(ai.behaviouralSignals),
    ...asStringArray(ai.stakeholderSignals),
    ...competencies
      .filter(
        (item) =>
          item?.category === "behavioural" || item?.category === "stakeholder",
      )
      .map((item) => asString(item?.competency) ?? "")
      .filter(Boolean),
  ]).slice(0, 8);

  const responsibilitySignals = dedupeStrings([
    ...asStringArray(ai.requiredExperienceSignals),
    ...competencies
      .filter((item) => item?.importance === "core")
      .map((item) => asString(item?.interpretation) || asString(item?.competency) || "")
      .filter(Boolean),
  ]).slice(0, 10);

  const requirementSignals = dedupeStrings([
    ...technicalSignals,
    ...qualificationSignals,
    ...softSignals,
  ]).slice(0, 10);

  // EXP-01: extract core-only signals from AI competencies for importance-aware missing detection
  const coreRequirementSignals = dedupeStrings([
    ...competencies
      .filter((item) => item?.importance === "core")
      .map((item) => asString(item?.interpretation) || asString(item?.competency) || "")
      .filter(Boolean),
    ...asStringArray(ai.requiredEducation).slice(0, 3), // education requirements are always core
  ]).slice(0, 8);
  // EXP-01 end

  if (
    responsibilitySignals.length === 0 &&
    requirementSignals.length === 0 &&
    softSignals.length === 0
  ) {
    return fallback;
  }

  return {
    responsibilitySignals:
      responsibilitySignals.length > 0
        ? responsibilitySignals
        : fallback.responsibilitySignals,
    requirementSignals:
      requirementSignals.length > 0
        ? requirementSignals
        : fallback.requirementSignals,
    qualificationSignals:
      qualificationSignals.length > 0
        ? qualificationSignals
        : fallback.qualificationSignals,
    technicalSignals:
      technicalSignals.length > 0 ? technicalSignals : fallback.technicalSignals,
    softSignals: softSignals.length > 0 ? softSignals : fallback.softSignals,
    // EXP-01: populate core signals; fall back to full requirementSignals if AI returned none
    coreRequirementSignals:
      coreRequirementSignals.length > 0
        ? coreRequirementSignals
        : fallback.coreRequirementSignals,
    // EXP-01 end
  };
}

function deriveCompanyContext(
  structuredJob: StructuredJob,
  language: "en" | "de" | "es",
): CompanyContext {
  const companyLabel =
    structuredJob.companyName || (language === "de" ? "Unbekannt" : "Unknown");
  const roleLabel =
    structuredJob.jobTitle ||
    (language === "de" ? "Unbekannte Rolle" : "Unknown role");
  const locationLabel =
    structuredJob.location ||
    (language === "de" ? "Nicht angegeben" : "Not specified");

  const environmentSummary = [
    structuredJob.responsibilities.length > 0
      ? language === "de"
        ? "Operativ geprägte Finanzrolle"
        : "Operationally focused finance role"
      : language === "de"
        ? "Rollenkontext noch unklar"
        : "Role context still unclear",
    structuredJob.requirements.length > 0
      ? language === "de"
        ? "mit klaren Qualifikationssignalen"
        : "with clear qualification signals"
      : language === "de"
        ? "mit begrenzten Qualifikationssignalen"
        : "with limited qualification signals",
  ].join(" ");

  return {
    companyLabel,
    roleLabel,
    locationLabel,
    environmentSummary,
  };
}

function mapAiCompanyContextToInternal(
  ai: AiCompanyContextOutput | null,
  structuredJob: StructuredJob,
  language: "en" | "de" | "es",
  fallback: CompanyContext,
): CompanyContext {
  if (!ai) return fallback;

  const summary = asString(ai.summary);
  const notes = dedupeStrings([
    ...asStringArray(ai.industry),
    ...asStringArray(ai.financeEnvironment),
    ...asStringArray(ai.reportingEnvironment),
    ...asStringArray(ai.leadershipScope),
    ...asStringArray(ai.operatingSignals),
    ...asStringArray(ai.cultureSignals),
  ]);

  if (!summary && notes.length === 0) return fallback;

  return {
    companyLabel:
      structuredJob.companyName || (language === "de" ? "Unbekannt" : "Unknown"),
    roleLabel:
      structuredJob.jobTitle ||
      (language === "de" ? "Unbekannte Rolle" : "Unknown role"),
    locationLabel:
      structuredJob.location ||
      (language === "de" ? "Nicht angegeben" : "Not specified"),
    environmentSummary: dedupeStrings([summary ?? "", ...notes])
      .filter(Boolean)
      .join(" • "),
  };
}

function deriveCompanyResearch(
  structuredJob: StructuredJob,
  companyContext: CompanyContext,
): CompanyResearch {
  const haystack = [
    structuredJob.companyName,
    structuredJob.jobTitle,
    structuredJob.summary,
    ...structuredJob.responsibilities,
    ...structuredJob.requirements,
  ]
    .join(" ")
    .toLowerCase();

  let employerType = "general";
  if (haystack.includes("bank")) employerType = "banking";
  else if (haystack.includes("insurance")) employerType = "insurance";
  else if (haystack.includes("manufacturing")) employerType = "manufacturing";
  else if (haystack.includes("real estate")) employerType = "real_estate";

  let complexitySignal = "moderate";
  if (
    haystack.includes("international") ||
    haystack.includes("group") ||
    haystack.includes("shared service") ||
    haystack.includes("prüfer") ||
    haystack.includes("steuerberater")
  ) {
    complexitySignal = "elevated";
  }

  let scopeSignal = "local_or_unspecified";
  if (
    haystack.includes("international") ||
    haystack.includes("ausland") ||
    haystack.includes("group")
  ) {
    scopeSignal = "international";
  }

  return {
    employerType,
    complexitySignal,
    scopeSignal,
    notes: dedupeStrings([
      companyContext.environmentSummary,
      structuredJob.summary,
    ]).filter(Boolean),
  };
}

function mapAiCompanyResearchToInternal(
  ai: AiCompanyResearchOutput | null,
  fallback: CompanyResearch,
): CompanyResearch {
  if (!ai) return fallback;

  const summary = asString(ai.companySummary) ?? "";
  const notes = dedupeStrings([
    summary,
    ...asStringArray(ai.recentSignals),
    ...asStringArray(ai.strategicThemes),
    ...asStringArray(ai.positiveHooks),
    ...asStringArray(ai.riskSignals),
    ...asStringArray(ai.whyThisCompanyAngles),
  ]).filter(Boolean);

  if (notes.length === 0) return fallback;

  const haystack = notes.join(" ").toLowerCase();

  let employerType = fallback.employerType;
  if (haystack.includes("bank")) employerType = "banking";
  else if (haystack.includes("insurance")) employerType = "insurance";
  else if (haystack.includes("manufacturing")) employerType = "manufacturing";
  else if (haystack.includes("real estate")) employerType = "real_estate";

  let complexitySignal = fallback.complexitySignal;
  if (
    haystack.includes("transformation") ||
    haystack.includes("international") ||
    haystack.includes("matrix") ||
    haystack.includes("expansion")
  ) {
    complexitySignal = "elevated";
  }

  let scopeSignal = fallback.scopeSignal;
  if (
    haystack.includes("international") ||
    haystack.includes("global") ||
    haystack.includes("cross-border")
  ) {
    scopeSignal = "international";
  }

  return {
    employerType,
    complexitySignal,
    scopeSignal,
    notes,
  };
}

function deriveMarketSignals(
  structuredJob: StructuredJob,
  requiredProfile: RequiredProfile,
): MarketSignals {
  const haystack = [
    structuredJob.jobTitle,
    structuredJob.summary,
    ...structuredJob.responsibilities,
    ...structuredJob.requirements,
  ]
    .join(" ")
    .toLowerCase();

  let senioritySignal = "mid";
  if (
    haystack.includes("lead") ||
    haystack.includes("leiter") ||
    haystack.includes("director") ||
    haystack.includes("head")
  ) {
    senioritySignal = "senior";
  }

  let strictnessSignal = "moderate";
  if (
    requiredProfile.qualificationSignals.length >= 3 ||
    haystack.includes("must") ||
    haystack.includes("zwingend") ||
    haystack.includes("mehrjährige berufserfahrung")
  ) {
    strictnessSignal = "higher";
  }

  let transferabilitySignal = "reasonable";
  if (
    haystack.includes("idealerweise") ||
    haystack.includes("interesse daran") ||
    haystack.includes("preferred")
  ) {
    transferabilitySignal = "flexible";
  }

  return {
    senioritySignal,
    strictnessSignal,
    transferabilitySignal,
    notes: [
      `seniority:${senioritySignal}`,
      `strictness:${strictnessSignal}`,
      `transferability:${transferabilitySignal}`,
    ],
  };
}

function mapAiMarketSignalsToInternal(
  ai: AiMarketSignalsOutput | null,
  fallback: MarketSignals,
): MarketSignals {
  if (!ai) return fallback;

  const senioritySignal =
    ai.seniorityTarget === "junior" ||
    ai.seniorityTarget === "mid" ||
    ai.seniorityTarget === "senior"
      ? ai.seniorityTarget
      : fallback.senioritySignal;

  let strictnessSignal = fallback.strictnessSignal;
  const hiringAndRisk = dedupeStrings([
    ...asStringArray(ai.hiringSignals),
    ...asStringArray(ai.candidateRiskSignals),
  ]).join(" ").toLowerCase();

  if (
    hiringAndRisk.includes("strict") ||
    hiringAndRisk.includes("specialist") ||
    hiringAndRisk.includes("qualification") ||
    hiringAndRisk.includes("overqualification")
  ) {
    strictnessSignal = "higher";
  }

  let transferabilitySignal = fallback.transferabilitySignal;
  if (
    hiringAndRisk.includes("flexible") ||
    hiringAndRisk.includes("transferable") ||
    hiringAndRisk.includes("adjacent")
  ) {
    transferabilitySignal = "flexible";
  }

  const notes = dedupeStrings([
    asString(ai.summary) ?? "",
    ...asStringArray(ai.businessModelSignals),
    ...asStringArray(ai.hiringSignals),
    ...asStringArray(ai.candidateRiskSignals),
    ...asStringArray(ai.communicationSignals),
    ...asStringArray(ai.deliverySignals),
  ]).filter(Boolean);

  return {
    senioritySignal,
    strictnessSignal,
    transferabilitySignal,
    notes: notes.length > 0 ? notes : fallback.notes,
  };
}

function buildSelectedEvidencePack(
  candidateProfileView: CandidateProfileView,
  requiredProfile: RequiredProfile,
): SelectedEvidencePack {
  const roleLines = candidateProfileView.experienceSignals;
  const skills = candidateProfileView.possessionSignals;

  const strongEvidence = roleLines
    .map((line) => {
      let score = 0;

      for (const task of requiredProfile.responsibilitySignals) {
        score += scoreOverlap(line, task) * 3;
      }

      for (const req of requiredProfile.requirementSignals) {
        score += scoreOverlap(line, req) * 2;
      }

      for (const soft of requiredProfile.softSignals) {
        score += scoreOverlap(line, soft);
      }

      return { line, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((item) => item.line);

  const supportEvidence = skills
    .map((skill) => {
      let score = 0;

      for (const req of requiredProfile.requirementSignals) {
        score += scoreOverlap(skill, req) * 2;
      }

      for (const tech of requiredProfile.technicalSignals) {
        score += scoreOverlap(skill, tech) * 2;
      }

      for (const qual of requiredProfile.qualificationSignals) {
        score += scoreOverlap(skill, qual) * 2;
      }

      for (const task of requiredProfile.responsibilitySignals) {
        score += scoreOverlap(skill, task);
      }

      return { skill, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map((item) => item.skill);

  const transferableEvidence = roleLines
    .filter((line) => !strongEvidence.includes(line))
    .slice(0, 3);

  const weakEvidence = skills
    .filter((skill) => !supportEvidence.includes(skill))
    .slice(0, 3);

  const combinedTopEvidence = dedupeStrings([
    ...strongEvidence,
    ...supportEvidence,
  ]).slice(0, 8);

  return {
    strongEvidence,
    supportEvidence,
    transferableEvidence,
    weakEvidence,
    combinedTopEvidence,
  };
}

function buildMissingSignals(
  candidateProfileView: CandidateProfileView,
  requiredProfile: RequiredProfile,
): string[] {
  const haystack = [
    ...candidateProfileView.experienceSignals,
    ...candidateProfileView.possessionSignals,
  ]
    .join(" \n ")
    .trim();

  // EXP-01: prefer core-only signals so preferred/supporting gaps don't inflate missingCount
  const signalsToCheck =
    requiredProfile.coreRequirementSignals.length > 0
      ? requiredProfile.coreRequirementSignals
      : requiredProfile.requirementSignals;
  // EXP-01 end

  if (!haystack) {
    return signalsToCheck.slice(0, 5);
  }

  // EXP-02: raise threshold from === 0 to < 2 so single shared common words
  // don't falsely mark a requirement as covered; requirement needs 2+ token matches
  return signalsToCheck
    .filter((requirement) => scoreOverlap(haystack, requirement) < 2)
    .slice(0, 5);
  // EXP-02 end
}

function buildPositioningBriefPack(
  candidateProfile: Record<string, unknown> | null,
  structuredJob: StructuredJob,
  selectedEvidence: SelectedEvidencePack,
  missingSignals: string[],
): PositioningBriefPack {
  const evidenceCount = selectedEvidence.combinedTopEvidence.length;

  const positioningStrength: PositioningBriefPack["positioningStrength"] =
    evidenceCount >= 6 ? "strong" : evidenceCount >= 3 ? "solid" : "measured";

  const positioningTone: PositioningBriefPack["positioningTone"] =
    evidenceCount >= 5
      ? "leadership_adjacent"
      : evidenceCount >= 3
        ? "senior_specialist"
        : "specialist";

  // EXP-03: removed hardcoded finance fallback strings; replaced with generic cross-sector wording
  const headline =
    asString(candidateProfile?.headline) ??
    asString(candidateProfile?.summary) ??
    "";

  const coreWhyFit = [
    headline,
    ...selectedEvidence.strongEvidence.slice(0, 2),
    ...selectedEvidence.supportEvidence.slice(0, 1),
  ].filter(Boolean);

  const positioningRisks = missingSignals.slice(0, 3);

  const positioningStrategy =
    missingSignals.length > 0
      ? "Position through the strongest directly evidenced experience and acknowledge remaining gaps honestly and specifically."
      : "Position through direct role alignment and the most relevant evidenced experience.";

  const coverLetterAngle =
    "Emphasise the most directly supported experience and frame the application around the strongest evidence of role fit.";
  // EXP-03 end

  const cvEmphasis = dedupeStrings([
    ...selectedEvidence.strongEvidence.slice(0, 3),
    ...selectedEvidence.supportEvidence.slice(0, 2),
  ]).slice(0, 5);

  return {
    positioningStrength,
    positioningTone,
    coreWhyFit,
    positioningRisks,
    positioningStrategy,
    coverLetterAngle,
    cvEmphasis,
  };
}

function mapAiPositioningToInternal(
  ai: Record<string, unknown> | null,
  fallback: PositioningBriefPack,
): PositioningBriefPack {
  if (!ai) return fallback;

  const strength = asString(ai.positioningStrength);
  const tone = asString(ai.positioningTone);

  return {
    positioningStrength:
      strength === "measured" || strength === "solid" || strength === "strong"
        ? strength
        : fallback.positioningStrength,
    positioningTone:
      tone === "specialist" ||
      tone === "senior_specialist" ||
      tone === "leadership_adjacent"
        ? tone
        : fallback.positioningTone,
    coreWhyFit: asStringArray(ai.coreWhyFit).slice(0, 6),
    positioningRisks: asStringArray(ai.positioningRisks).slice(0, 6),
    positioningStrategy:
      asString(ai.positioningStrategy) ?? fallback.positioningStrategy,
    coverLetterAngle: asString(ai.coverLetterAngle) ?? fallback.coverLetterAngle,
    cvEmphasis: asStringArray(ai.cvEmphasis).slice(0, 6),
  };
}

function mapAiSelectedEvidenceToInternal(
  ai: AiSelectedEvidenceOutput | null,
  fallback: SelectedEvidencePack,
): SelectedEvidencePack {
  if (!ai) return fallback;

  const strong = asStringArray(ai.strongEvidence).slice(0, 6);
  const support = asStringArray(ai.supportEvidence).slice(0, 6);
  const transferable = asStringArray(ai.transferableEvidence).slice(0, 4);
  const weak = asStringArray(ai.weakEvidence).slice(0, 4);
  const combined = asStringArray(ai.combinedTopEvidence).slice(0, 8);

  // If AI returned nothing useful, fall back to rule track
  if (strong.length === 0 && support.length === 0 && combined.length === 0) {
    return fallback;
  }

  return {
    strongEvidence: strong,
    supportEvidence: support,
    transferableEvidence: transferable,
    weakEvidence: weak,
    combinedTopEvidence: combined.length > 0
      ? combined
      : [...strong.slice(0, 5), ...support.slice(0, 3)].slice(0, 8),
  };
}

function buildRecommendationPack(
  selectedEvidence: SelectedEvidencePack,
  missingSignals: string[],
): RecommendationPack {
  const evidenceCount = selectedEvidence.combinedTopEvidence.length;
  const missingCount = missingSignals.length;

  if (
    evidenceCount >= 5 &&
    missingCount <= 1
  ) {
    return {
      applicationRecommendation: "apply_confidently",
      advisorMessage:
        "The profile shows multiple credible alignment points for this role.",
      reasoningSummary:
        "The role has several clear fit signals and only limited uncovered requirements.",
      strongMatches: selectedEvidence.strongEvidence.slice(0, 4),
      stretchMatches: [],
      riskAreas: [],
      blockers: [],
      recommendation:
        "Recommended to proceed. The profile appears credibly aligned for application.",
    };
  }

  if (evidenceCount >= 3 && missingCount <= 3) {
    return {
      applicationRecommendation: "apply_with_care",
      advisorMessage:
        "There is a credible case to apply, but the positioning should stay selective and disciplined.",
      reasoningSummary:
        "The role shows meaningful overlap, though some requirements still need careful framing.",
      strongMatches: selectedEvidence.strongEvidence.slice(0, 3),
      stretchMatches: missingSignals.slice(0, 2),
      riskAreas: missingSignals.slice(0, 3),
      blockers: [],
      recommendation:
        "Proceed with care. Emphasise the strongest evidence and avoid overstating the fit.",
    };
  }

  if (evidenceCount >= 1) {
    return {
      applicationRecommendation: "borderline",
      advisorMessage:
        "The role may still be viable, but the fit is currently stretched.",
      reasoningSummary:
        "Only limited direct overlap is visible and several requirements remain uncovered.",
      strongMatches: selectedEvidence.strongEvidence.slice(0, 2),
      stretchMatches: missingSignals.slice(0, 3),
      riskAreas: missingSignals.slice(0, 4),
      blockers: missingSignals.slice(0, 2),
      recommendation:
        "Borderline fit. Apply only if the market context or transferable experience makes the opportunity worthwhile.",
    };
  }

  return {
    applicationRecommendation: "not_recommended",
    advisorMessage:
      "The available profile does not currently support a strong or credible application.",
    reasoningSummary:
      "There is too little direct overlap between the profile and the role requirements.",
    strongMatches: [],
    stretchMatches: missingSignals.slice(0, 3),
    riskAreas: missingSignals.slice(0, 5),
    blockers: missingSignals.slice(0, 3),
    recommendation:
      "Not recommended at this stage. More evidence or a better-aligned role would be needed.",
  };
}

function mapAiRecommendationToInternal(
  ai: Record<string, unknown> | null,
  fallback: RecommendationPack,
): RecommendationPack {
  if (!ai) return fallback;

  const appRecommendation = asString(ai.applicationRecommendation);

  return {
    applicationRecommendation:
      appRecommendation === "apply_confidently" ||
      appRecommendation === "apply_with_care" ||
      appRecommendation === "borderline" ||
      appRecommendation === "not_recommended"
        ? appRecommendation
        : fallback.applicationRecommendation,
    advisorMessage: asString(ai.advisorMessage) ?? fallback.advisorMessage,
    reasoningSummary:
      asString(ai.reasoningSummary) ?? fallback.reasoningSummary,
    strongMatches: asStringArray(ai.strongMatches).slice(0, 6),
    stretchMatches: asStringArray(ai.stretchMatches).slice(0, 6),
    riskAreas: asStringArray(ai.riskAreas).slice(0, 6),
    blockers: asStringArray(ai.blockers).slice(0, 6),
    recommendation: asString(ai.recommendation) ?? fallback.recommendation,
  };
}

function buildPositioningBriefText(
  candidateProfile: Record<string, unknown> | null,
  job: StructuredJob,
  positioningBrief: PositioningBriefPack,
  missingSignals: string[],
  language: "en" | "de" | "es",
): string {
  const headline =
    asString(candidateProfile?.headline) ??
    asString(candidateProfile?.summary) ??
    "The candidate brings relevant professional experience.";

  const companyLabel =
    job.companyName || (language === "de" ? "dem Unternehmen" : "the organisation");
  const roleLabel =
    job.jobTitle || (language === "de" ? "der Zielrolle" : "the target role");

  if (language === "de") {
    return [
      `Zielrolle: ${roleLabel}${job.companyName ? ` bei ${companyLabel}` : ""}.`,
      `Ausgangsposition: ${headline}`,
      positioningBrief.coreWhyFit.length
        ? `Tragende Evidenz: ${positioningBrief.coreWhyFit.slice(0, 3).join("; ")}.`
        : "Es liegt aktuell nur begrenzte belastbare Evidenz für die Positionierung vor.",
      missingSignals.length
        ? `Offene Signale: ${missingSignals.slice(0, 2).join("; ")}.`
        : "Die Kernanforderungen wirken derzeit weitgehend abgedeckt.",
      "Positionierungshinweis: Glaubwürdig, selektiv und ohne Überdehnung positionieren.",
    ].join("\n");
  }

  return [
    `Target role: ${roleLabel}${job.companyName ? ` at ${companyLabel}` : ""}.`,
    `Starting position: ${headline}.`,
    positioningBrief.coreWhyFit.length
      ? `Core evidence: ${positioningBrief.coreWhyFit.slice(0, 3).join("; ")}.`
      : "Only limited supporting evidence is currently visible for this positioning.",
    missingSignals.length
      ? `Open signals: ${missingSignals.slice(0, 2).join("; ")}.`
      : "The core requirements currently appear broadly covered.",
    "Positioning note: Stay credible, selective, and non-exaggerative.",
  ].join("\n");
}

function buildCompanyContextText(
  companyContext: CompanyContext,
  language: "en" | "de" | "es",
): string {
  if (language === "de") {
    return [
      `Unternehmen: ${companyContext.companyLabel}.`,
      `Rolle: ${companyContext.roleLabel}.`,
      `Standort: ${companyContext.locationLabel}.`,
      companyContext.environmentSummary,
    ].join(" ");
  }

  return [
    `Company: ${companyContext.companyLabel}.`,
    `Role: ${companyContext.roleLabel}.`,
    `Location: ${companyContext.locationLabel}.`,
    companyContext.environmentSummary,
  ].join(" ");
}

function buildBundleAssembly(input: BundleAssembly): BundleAssembly {
  return input;
}

// ── Recommendation Validation ─────────────────────────────────────────────────
// Detects internal contradictions between the L9 label and the L8 positioning
// strength. In v1 only the most obvious contradiction is corrected:
// no blockers + strong positioning + at least two strong matches + cautious label.
// Only applicationRecommendation is mutated — prose fields are left as-is.

type ValidationResult = {
  triggered: boolean;
  originalLabel: RecommendationPack["applicationRecommendation"];
  correctedLabel: RecommendationPack["applicationRecommendation"];
  reason: string;
};

function validateRecommendation(
  recommendation: RecommendationPack,
  positioningBrief: PositioningBriefPack,
): { recommendation: RecommendationPack; validation: ValidationResult } {
  const original = recommendation.applicationRecommendation;

  const noBlockers = recommendation.blockers.length === 0;
  const cautious = original === "apply_with_care";
  const strongPositioning = positioningBrief.positioningStrength === "strong";
  const sufficientMatches = recommendation.strongMatches.length >= 2;

  if (noBlockers && cautious && strongPositioning && sufficientMatches) {
    return {
      recommendation: {
        ...recommendation,
        applicationRecommendation: "apply_confidently",
        advisorMessage:
          "The profile shows multiple credible alignment points for this role.",
        reasoningSummary:
          "The role has several clear fit signals and only limited uncovered requirements.",
        recommendation:
          "Recommended to proceed. The profile appears credibly aligned for application.",
      },
      validation: {
        triggered: true,
        originalLabel: original,
        correctedLabel: "apply_confidently",
        reason:
          "No blockers, positioningStrength=strong, strongMatches>=2, original label apply_with_care — upgraded to apply_confidently.",
      },
    };
  }

  return {
    recommendation,
    validation: {
      triggered: false,
      originalLabel: original,
      correctedLabel: original,
      reason: "No contradiction detected — recommendation unchanged.",
    },
  };
}

function buildCvDraft(
  candidateProfile: Record<string, unknown> | null,
  bundle: BundleAssembly,
): string {
  const summary =
    asString(candidateProfile?.summary) ??
    asString(candidateProfile?.headline) ??
    "Experienced professional with relevant background for the target role.";

  const roleLines = getCandidateRoleLines(candidateProfile).slice(0, 4);
  const roleLabel = bundle.structuredJob.jobTitle || "the target role"; // EXP-03: removed hardcoded domain fallback
  const companyLabel = bundle.structuredJob.companyName || "the organisation";

  return [
    summary,
    "",
    "Relevant evidence for this role:",
    ...(bundle.selectedEvidence.combinedTopEvidence.length
      ? bundle.selectedEvidence.combinedTopEvidence.map((item) => `- ${item}`)
      : ["- Role-aligned evidence still needs refinement."]),
    "",
    "Career highlights:",
    ...(roleLines.length
      ? roleLines.map((item) => `- ${item}`)
      : ["- No role highlights available yet."]),
    "",
    `Target role: ${roleLabel}${bundle.structuredJob.companyName ? ` | ${companyLabel}` : ""}`,
  ].join("\n");
}

function buildCoverLetterDraft(
  candidateProfile: Record<string, unknown> | null,
  bundle: BundleAssembly,
  language: "en" | "de" | "es",
): string {
  const name = asString(candidateProfile?.fullName) ?? "Candidate";
  const summary =
    asString(candidateProfile?.summary) ??
    asString(candidateProfile?.headline) ??
    "";

  const roleLabel =
    bundle.structuredJob.jobTitle || (language === "de" ? "die Position" : "the role");
  const companyLabel =
    bundle.structuredJob.companyName ||
    (language === "de" ? "dem Unternehmen" : "the organisation");

  const evidence = bundle.selectedEvidence.combinedTopEvidence.slice(0, 3).join(", ");

  if (language === "de") {
    return [
      `Bewerbung als ${roleLabel}`,
      "",
      "Sehr geehrte Damen und Herren,",
      "",
      `mit Blick auf die ausgeschriebene Rolle${bundle.structuredJob.companyName ? ` bei ${companyLabel}` : ""} sehe ich eine glaubwürdige Verbindung zu meinem bisherigen Profil.`,
      summary ||
        "Mein beruflicher Hintergrund zeigt belastbare Erfahrung in relevanten Aufgabenfeldern.",
      evidence
        ? `Besonders relevant erscheinen dabei ${evidence}.`
        : "Die belastbarsten Anknüpfungspunkte würden in einer nächsten Iteration noch klarer herausgearbeitet.",
      "",
      "Ich freue mich auf ein Gespräch.",
      "",
      `Mit freundlichen Grüßen\n${name}`,
    ].join("\n");
  }

  return [
    `Application for ${roleLabel}`,
    "",
    "Dear Hiring Team,",
    "",
    `I see a credible connection between my background and this opportunity${bundle.structuredJob.companyName ? ` at ${companyLabel}` : ""}.`,
    summary ||
      "My professional background includes relevant experience for the target role.",
    evidence
      ? `The strongest alignment points currently appear to be ${evidence}.`
      : "The strongest alignment points would benefit from further refinement in the next iteration.",
    "",
    "I would welcome the opportunity to discuss this further.",
    "",
    `Kind regards,\n${name}`,
  ].join("\n");
}

async function safeFetchJson<T>(
  url: string,
  init: RequestInit,
): Promise<{ ok: boolean; status: number; data: T | Record<string, unknown> }> {
  try {
    const response = await fetch(url, init);
    let data: T | Record<string, unknown> = {};
    try {
      data = (await response.json()) as T | Record<string, unknown>;
    } catch (jsonErr) {
      console.error("[safeFetchJson] failed to parse JSON response from", url, jsonErr);
    }
    return { ok: response.ok, status: response.status, data };
  } catch (fetchErr) {
    console.error("[safeFetchJson] network error fetching", url, fetchErr);
    return { ok: false, status: 0, data: { error: String(fetchErr) } };
  }
}

/**
 * Attempt to fetch a short text snippet from the company's homepage.
 * Used only for writing-style analysis — never as factual evidence.
 * Returns null on any failure (blocked, timeout, non-HTML, etc.).
 * Times out after 5 seconds to avoid slowing the main pipeline.
 */
async function fetchCompanyPageSnippet(jobUrl: string): Promise<string | null> {
  try {
    const parsed = new URL(jobUrl);
    const homepageUrl = `${parsed.protocol}//${parsed.hostname}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    let html = "";
    try {
      const res = await fetch(homepageUrl, {
        signal: controller.signal,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; ApplicantBot/1.0) AppleWebKit/537.36",
          Accept: "text/html",
        },
        redirect: "follow",
      });
      if (!res.ok) return null;
      html = await res.text();
    } finally {
      clearTimeout(timeout);
    }

    // Strip scripts, styles, then all tags — extract first meaningful text
    const clean = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/\s{2,}/g, " ")
      .trim();

    // Take the first 500 meaningful characters of body text
    const snippet = clean.slice(0, 500).trim();
    return snippet.length >= 40 ? snippet : null;
  } catch {
    return null;
  }
}

function createRunId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `run_${Date.now()}`;
}

function normalizeReviewReport(input: unknown): ReviewReport | null {
  const record = asRecord(input);
  if (!record) return null;

  const relevanceScoreRaw = record.relevanceScore;
  const relevanceScore =
    typeof relevanceScoreRaw === "number"
      ? relevanceScoreRaw
      : typeof relevanceScoreRaw === "string"
        ? Number(relevanceScoreRaw)
        : null;

  const clarityFixesRaw = record.clarityFixes;
  const clarityFixes =
    typeof clarityFixesRaw === "number"
      ? clarityFixesRaw
      : typeof clarityFixesRaw === "string"
        ? Number(clarityFixesRaw)
        : null;

  return {
    truthCheck: asString(record.truthCheck) ?? undefined,
    unsupportedClaims: asStringArray(record.unsupportedClaims),
    relevanceScore:
      relevanceScore !== null && Number.isFinite(relevanceScore)
        ? relevanceScore
        : undefined,
    inflationRisk: asString(record.inflationRisk) ?? undefined,
    weakEvidence: asStringArray(record.weakEvidence),
    clarityFixes:
      clarityFixes !== null && Number.isFinite(clarityFixes)
        ? clarityFixes
        : undefined,
  };
}

function makeObservation(
  layerId: string,
  inputSummary: string,
  outputSummary: string,
  track: "ai" | "rule_fallback",
  confidence: number,
  startMs: number,
  warnings: string[],
  humanReadableExplanation: string,
): ObservationPoint {
  return {
    layerId,
    timestamp: new Date().toISOString(),
    inputSummary,
    outputSummary,
    track,
    confidence,
    timeTaken: Date.now() - startMs,
    warnings,
    humanReadableExplanation,
  };
}

export async function runTailoringPipeline({
  origin,
  cookieHeader = "",
  jobUrl,
  jobDescriptionText,
  outputLanguage,
  candidateProfile,
  debugConfig,
}: TailoringPipelineInput): Promise<TailoringPipelineResult> {

  const ENGINE_SWITCHES = {
    ...DEFAULT_ENGINE_SWITCHES,
    ...(debugConfig ?? {}),
  };
  const pipelineTrace: string[] = [];
  const observationPoints: ObservationPoint[] = [];
  const pipelineWarnings: string[] = [];
  const normalizedJobUrl = asString(jobUrl) ?? "";
  const normalizedJobDescriptionText = asString(jobDescriptionText) ?? "";
  const normalizedOutputLanguage = normalizeLanguage(outputLanguage);
  const normalizedCandidateProfile = asRecord(candidateProfile);

  console.log("[runTailoringPipeline] started", {
    origin,
    hasJobUrl: Boolean(normalizedJobUrl),
    jobDescriptionTextLength: normalizedJobDescriptionText.length,
    outputLanguage: normalizedOutputLanguage,
    hasCandidateProfile: Boolean(normalizedCandidateProfile),
    candidateProfileKeys: normalizedCandidateProfile ? Object.keys(normalizedCandidateProfile) : [],
  });

  // ── Layer 0 — JD Quality Analysis ──────────────────────────────────────────
  let jdQualityAnalysis: JdQualityAnalysis | null = null;

  if (ENGINE_SWITCHES.LAYER_0_JD_QUALITY) {
    try {
      const tLayer0 = Date.now();
      pipelineTrace.push("Layer0A: jd-quality:start");

      if (ENGINE_SWITCHES.LAYER_0_JD_QUALITY_AI && normalizedJobDescriptionText) {
        pipelineTrace.push("Layer0B: jd-quality:ai:start");

        jdQualityAnalysis = await callAiJson<JdQualityAnalysis>(
          buildJdQualityInstructions(normalizedOutputLanguage),
          JSON.stringify({ rawJobText: normalizedJobDescriptionText }, null, 2),
        );

        pipelineTrace.push(
          jdQualityAnalysis
            ? "Layer0B: jd-quality:ai:done"
            : "Layer0B: jd-quality:ai:fallback",
        );
      }

      observationPoints.push(makeObservation(
        "Layer0_JdQuality",
        `Raw JD text length: ${normalizedJobDescriptionText.length} chars`,
        jdQualityAnalysis
          ? `Tier: ${jdQualityAnalysis.overallTier}, inferredVsStated: ${jdQualityAnalysis.inferredVsStated}`
          : "AI unavailable — quality analysis skipped",
        jdQualityAnalysis ? "ai" : "rule_fallback",
        jdQualityAnalysis ? 0.8 : 0.0,
        tLayer0,
        [],
        jdQualityAnalysis
          ? `The job description was assessed as ${
              jdQualityAnalysis.overallTier === "green"
                ? "complete and credible — ready to process"
                : jdQualityAnalysis.overallTier === "amber"
                ? "usable but with some gaps or inferred details — the system will flag what was inferred"
                : "potentially unreliable — the candidate has been given an honest heads-up before we proceed"
            }.`
          : "Job description quality could not be assessed — the AI analysis was unavailable.",
      ));

      pipelineTrace.push("Layer0A: jd-quality:done");
    } catch (err) {
      console.error("[runTailoringPipeline] Layer0 failed — continuing:", err);
      pipelineWarnings.push("We couldn't assess the quality of this job posting. Your application is ready regardless.");
      pipelineTrace.push("Layer0A: jd-quality:error:caught");
    }
  }

  // Derive quality gate (never blocks — always emits, UI decides how to surface it)
  const jdQualityGate: JdQualityGate = {
    tier: jdQualityAnalysis?.overallTier ?? "green",
    inferredVsStated: jdQualityAnalysis?.inferredVsStated ?? false,
    mentorMessage: jdQualityAnalysis?.mentorMessage ?? null,
    proceedAnyway: false,
  };

  // ── Layer 1 — Job Extraction ────────────────────────────────────────────────
  const tLayer1 = Date.now();
  pipelineTrace.push("Layer1A: extract-job:start");

  const extractJobResponse = await safeFetchJson<{
    structuredJob?: StructuredJob;
    extractedText?: string;
    source?: WorkspaceJobProfile["extractionSource"];
    normalizedUrl?: string;
    warnings?: string[];
    error?: string;
  }>(`${origin}/api/extract-job`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      cookie: cookieHeader,
    },
    body: JSON.stringify({
      url: normalizedJobUrl || undefined,
      jobDescriptionText: normalizedJobDescriptionText || undefined,
      outputLanguage: normalizedOutputLanguage,
    }),
    cache: "no-store",
  });

  const extractData = asRecord(extractJobResponse.data) ?? {};

  if (!extractJobResponse.ok) {
    const errorMsg = asString(extractData.error) ?? "Job extraction failed inside the canonical pipeline.";
    console.error("[runTailoringPipeline] Layer1: extract-job returned", extractJobResponse.status, errorMsg);

    // If we have a partial structuredJob and extracted text (e.g. 422 "not usable but has data"),
    // continue the pipeline with warnings rather than failing hard.
    // Only hard-fail when there is truly nothing to work with (no extracted text at all).
    const partialExtractedText = asString(extractData.extractedText) ?? "";
    const hasPartialStructuredJob = Boolean(asRecord(extractData.structuredJob));

    if (!partialExtractedText && !hasPartialStructuredJob) {
      return {
        ok: false,
        status: extractJobResponse.status || 500,
        message: errorMsg,
        details: extractJobResponse.data,
      };
    }

    // Partial data available — continue with warning
    console.warn("[runTailoringPipeline] Layer1: continuing with partial extraction data (warnings added)");
    pipelineTrace.push(`Layer1A: extract-job:partial (status=${extractJobResponse.status})`);
    // fall through to use whatever data was returned
  }

  const structuredJob = normalizeStructuredJob(extractData.structuredJob);
  pipelineTrace.push("Layer1A: extract-job:done");
  observationPoints.push(makeObservation(
    "Layer1_ExtractJob",
    `JD input: ${normalizedJobDescriptionText ? "pasted text" : "URL"} (${(normalizedJobDescriptionText || normalizedJobUrl).length} chars)`,
    `Extracted: company="${structuredJob.companyName}", title="${structuredJob.jobTitle}", responsibilities=${structuredJob.responsibilities.length}, requirements=${structuredJob.requirements.length}`,
    "ai",
    0.85,
    tLayer1,
    asStringArray(extractData.warnings),
    "The job description was parsed into structured fields — company name, job title, responsibilities, and requirements.",
  ));

  const extractedText = asString(extractData.extractedText) ?? "";

  const jobProfile: WorkspaceJobProfile = {
    companyName: structuredJob.companyName || undefined,
    jobTitle: structuredJob.jobTitle || undefined,
    location: structuredJob.location || undefined,
    responsibilities: structuredJob.responsibilities,
    requirements: structuredJob.requirements,
    summary: structuredJob.summary,
    extractedText,
    extractionSource:
      (asString(extractData.source) as WorkspaceJobProfile["extractionSource"]) ??
      "pasted-text",
    normalizedUrl: asString(extractData.normalizedUrl) ?? normalizedJobUrl,
    warnings: asStringArray(extractData.warnings),
    outputLanguage: normalizedOutputLanguage,
    rawResponse: extractJobResponse.data,
  };

  console.log("[runTailoringPipeline] Layer1 done:", {
    companyName: structuredJob.companyName,
    jobTitle: structuredJob.jobTitle,
    responsibilities: structuredJob.responsibilities.length,
    requirements: structuredJob.requirements.length,
    extractedTextLength: extractedText.length,
    source: jobProfile.extractionSource,
    warnings: jobProfile.warnings,
  });

  let candidateProfileView: CandidateProfileView = {
    experienceSignals: [],
    possessionSignals: [],
  };

  if (ENGINE_SWITCHES.LAYER_2_CANDIDATE_PROFILE_VIEW) {
    try {
      const tLayer2 = Date.now();
      pipelineTrace.push("Layer2A: candidate-profile-view:start");
      candidateProfileView = buildCandidateProfileView(normalizedCandidateProfile);
      pipelineTrace.push("Layer2A: candidate-profile-view:done");
      observationPoints.push(makeObservation(
        "Layer2_CandidateProfileView",
        `Profile fields: ${normalizedCandidateProfile ? Object.keys(normalizedCandidateProfile).length : 0}`,
        `Experience signals: ${candidateProfileView.experienceSignals.length}, possession signals: ${candidateProfileView.possessionSignals.length}`,
        "rule_fallback",
        0.6,
        tLayer2,
        [],
        "Your profile was read and summarised into the experience and skills signals most relevant for matching against this role.",
      ));
    } catch (err) {
      console.error("[runTailoringPipeline] Layer2 failed — continuing:", err);
      pipelineWarnings.push("We had difficulty reading parts of your profile. Some matching may be limited.");
      pipelineTrace.push("Layer2A: candidate-profile-view:error:caught");
    }
  }

  let requiredProfile: RequiredProfile = {
    responsibilitySignals: structuredJob.responsibilities,
    requirementSignals: structuredJob.requirements,
    qualificationSignals: [],
    technicalSignals: [],
    softSignals: [],
    coreRequirementSignals: [], // EXP-01: populated by rule/AI track below
  };

  if (ENGINE_SWITCHES.LAYER_3_REQUIRED_PROFILE) {
    try {
      const tLayer3 = Date.now();
      pipelineTrace.push("Layer3A: required-profile:rule:start");
      requiredProfile = deriveRequiredProfile(structuredJob);
      pipelineTrace.push("Layer3A: required-profile:rule:done");

      if (ENGINE_SWITCHES.LAYER_3_REQUIRED_PROFILE_AI) {
        pipelineTrace.push("Layer3B: required-profile:ai:start");

        const aiRequiredProfile = await callAiJson<AiRequiredProfileOutput>(
          buildRequiredProfileInstructions(normalizedOutputLanguage),
          JSON.stringify(
            {
              structuredJob,
              extractedJobText: extractedText,
              companyContextSummary: "",
              marketSignalsSummary: "",
            },
            null,
            2,
          ),
        );

        requiredProfile = mapAiRequiredProfileToInternal(
          aiRequiredProfile,
          requiredProfile,
        );

        pipelineTrace.push(
          aiRequiredProfile
            ? "Layer3B: required-profile:ai:done"
            : "Layer3B: required-profile:ai:fallback",
        );
      }

      observationPoints.push(makeObservation(
        "Layer3_RequiredProfile",
        `JD requirements: ${structuredJob.requirements.length} items`,
        `Responsibility signals: ${requiredProfile.responsibilitySignals.length}, requirement signals: ${requiredProfile.requirementSignals.length}, technical: ${requiredProfile.technicalSignals.length}`,
        ENGINE_SWITCHES.LAYER_3_REQUIRED_PROFILE_AI ? "ai" : "rule_fallback",
        ENGINE_SWITCHES.LAYER_3_REQUIRED_PROFILE_AI ? 0.85 : 0.6,
        tLayer3,
        [],
        "The role's required competencies were identified — the skills, qualifications, and behaviours that matter most for this position.",
      ));
    } catch (err) {
      console.error("[runTailoringPipeline] Layer3 failed — continuing:", err);
      pipelineWarnings.push("Part of the role analysis didn't complete. Your application has been prepared with the available requirements.");
      pipelineTrace.push("Layer3A: required-profile:error:caught");
    }
  }

  let companyContext: CompanyContext = {
    companyLabel: structuredJob.companyName || "Unknown",
    roleLabel: structuredJob.jobTitle || "Unknown role",
    locationLabel: structuredJob.location || "Not specified",
    environmentSummary: "",
  };

  if (ENGINE_SWITCHES.LAYER_4_COMPANY_CONTEXT) {
    try {
      const tLayer4 = Date.now();
      pipelineTrace.push("Layer4A: company-context:rule:start");
      companyContext = deriveCompanyContext(
        structuredJob,
        normalizedOutputLanguage,
      );
      pipelineTrace.push("Layer4A: company-context:rule:done");

      if (ENGINE_SWITCHES.LAYER_4_COMPANY_CONTEXT_AI) {
        pipelineTrace.push("Layer4B: company-context:ai:start");

        const aiCompanyContext = await callAiJson<AiCompanyContextOutput>(
          buildCompanyContextInstructions(normalizedOutputLanguage),
          JSON.stringify(
            {
              structuredJob,
              extractedJobText: extractedText,
            },
            null,
            2,
          ),
        );

        companyContext = mapAiCompanyContextToInternal(
          aiCompanyContext,
          structuredJob,
          normalizedOutputLanguage,
          companyContext,
        );

        pipelineTrace.push(
          aiCompanyContext
            ? "Layer4B: company-context:ai:done"
            : "Layer4B: company-context:ai:fallback",
        );
      }

      observationPoints.push(makeObservation(
        "Layer4_CompanyContext",
        `Company: "${structuredJob.companyName || "unknown"}", location: "${structuredJob.location || "unknown"}"`,
        `Company label: "${companyContext.companyLabel}", role label: "${companyContext.roleLabel}"`,
        ENGINE_SWITCHES.LAYER_4_COMPANY_CONTEXT_AI ? "ai" : "rule_fallback",
        ENGINE_SWITCHES.LAYER_4_COMPANY_CONTEXT_AI ? 0.85 : 0.6,
        tLayer4,
        [],
        "The company's environment was interpreted — its industry, culture signals, and the kind of role this appears to be.",
      ));
    } catch (err) {
      console.error("[runTailoringPipeline] Layer4 failed — continuing:", err);
      pipelineWarnings.push("Company context analysis encountered a problem. Your application continues with the information extracted from the job description.");
      pipelineTrace.push("Layer4A: company-context:error:caught");
    }
  }

  let companyResearch: CompanyResearch = {
    employerType: "general",
    complexitySignal: "moderate",
    scopeSignal: "local_or_unspecified",
    notes: [],
  };

  if (ENGINE_SWITCHES.LAYER_5_COMPANY_RESEARCH) {
    try {
      const tLayer5 = Date.now();
      pipelineTrace.push("Layer5A: company-research:rule:start");
      companyResearch = deriveCompanyResearch(structuredJob, companyContext);
      pipelineTrace.push("Layer5A: company-research:rule:done");

      if (ENGINE_SWITCHES.LAYER_5_COMPANY_RESEARCH_AI) {
        pipelineTrace.push("Layer5B: company-research:ai:start");

        const aiCompanyResearch = await callAiJson<AiCompanyResearchOutput>(
          buildCompanyResearchInstructions(normalizedOutputLanguage),
          JSON.stringify(
            {
              companyName: structuredJob.companyName,
              jobTitle: structuredJob.jobTitle,
              rawSearchNotes: [companyContext.environmentSummary, structuredJob.summary],
            },
            null,
            2,
          ),
        );

        companyResearch = mapAiCompanyResearchToInternal(
          aiCompanyResearch,
          companyResearch,
        );

        pipelineTrace.push(
          aiCompanyResearch
            ? "Layer5B: company-research:ai:done"
            : "Layer5B: company-research:ai:fallback",
        );
      }

      observationPoints.push(makeObservation(
        "Layer5_CompanyResearch",
        `Company: "${structuredJob.companyName || "unknown"}"`,
        `Employer type: "${companyResearch.employerType}", complexity: "${companyResearch.complexitySignal}", scope: "${companyResearch.scopeSignal}"`,
        ENGINE_SWITCHES.LAYER_5_COMPANY_RESEARCH_AI ? "ai" : "rule_fallback",
        ENGINE_SWITCHES.LAYER_5_COMPANY_RESEARCH_AI ? 0.85 : 0.6,
        tLayer5,
        [],
        "The company was researched to understand its employer type, size signals, and the scope of the organisation.",
      ));
    } catch (err) {
      console.error("[runTailoringPipeline] Layer5 failed — continuing:", err);
      pipelineWarnings.push("Company background research could not be completed. Your application has been prepared without this additional context.");
      pipelineTrace.push("Layer5A: company-research:error:caught");
    }
  }

  let marketSignals: MarketSignals = {
    senioritySignal: "mid",
    strictnessSignal: "moderate",
    transferabilitySignal: "reasonable",
    notes: [],
  };

  if (ENGINE_SWITCHES.LAYER_6_MARKET_SIGNALS) {
    try {
      const tLayer6 = Date.now();
      pipelineTrace.push("Layer6A: market-signals:rule:start");
      marketSignals = deriveMarketSignals(structuredJob, requiredProfile);
      pipelineTrace.push("Layer6A: market-signals:rule:done");

      if (ENGINE_SWITCHES.LAYER_6_MARKET_SIGNALS_AI) {
        pipelineTrace.push("Layer6B: market-signals:ai:start");

        const aiMarketSignals = await callAiJson<AiMarketSignalsOutput>(
          buildMarketSignalsInstructions(normalizedOutputLanguage),
          JSON.stringify(
            {
              structuredJob,
              extractedJobText: extractedText,
              companyContextSummary: companyContext.environmentSummary,
            },
            null,
            2,
          ),
        );

        marketSignals = mapAiMarketSignalsToInternal(
          aiMarketSignals,
          marketSignals,
        );

        pipelineTrace.push(
          aiMarketSignals
            ? "Layer6B: market-signals:ai:done"
            : "Layer6B: market-signals:ai:fallback",
        );
      }

      observationPoints.push(makeObservation(
        "Layer6_MarketSignals",
        `JD seniority/requirements: ${structuredJob.requirements.length} requirement signals`,
        `Seniority: "${marketSignals.senioritySignal}", strictness: "${marketSignals.strictnessSignal}", transferability: "${marketSignals.transferabilitySignal}"`,
        ENGINE_SWITCHES.LAYER_6_MARKET_SIGNALS_AI ? "ai" : "rule_fallback",
        ENGINE_SWITCHES.LAYER_6_MARKET_SIGNALS_AI ? 0.85 : 0.6,
        tLayer6,
        [],
        "The hiring signals were read — the seniority level expected, how strict the requirements are, and how much transferable experience would be accepted.",
      ));
    } catch (err) {
      console.error("[runTailoringPipeline] Layer6 failed — continuing:", err);
      pipelineWarnings.push("Hiring signal analysis encountered a problem. Your application continues with core matching.");
      pipelineTrace.push("Layer6A: market-signals:error:caught");
    }
  }

  let selectedEvidence: SelectedEvidencePack = {
    strongEvidence: [],
    supportEvidence: [],
    transferableEvidence: [],
    weakEvidence: [],
    combinedTopEvidence: [],
  };

  if (ENGINE_SWITCHES.LAYER_7_SELECTED_EVIDENCE) {
    try {
      const tLayer7 = Date.now();
      pipelineTrace.push("Layer7A: selected-evidence:rule:start");
      selectedEvidence = buildSelectedEvidencePack(
        candidateProfileView,
        requiredProfile,
      );
      pipelineTrace.push("Layer7A: selected-evidence:rule:done");

      if (ENGINE_SWITCHES.LAYER_7_SELECTED_EVIDENCE_AI) {
        pipelineTrace.push("Layer7B: selected-evidence:ai:start");

        const aiSelectedEvidence = await callAiJson<AiSelectedEvidenceOutput>(
          buildSelectedEvidenceInstructions(normalizedOutputLanguage),
          JSON.stringify(
            {
              candidateProfile: normalizedCandidateProfile,
              structuredJob,
              requiredProfile,
              candidateProfileView,
            },
            null,
            2,
          ),
        );

        selectedEvidence = mapAiSelectedEvidenceToInternal(
          aiSelectedEvidence,
          selectedEvidence,
        );

        pipelineTrace.push(
          aiSelectedEvidence
            ? "Layer7B: selected-evidence:ai:done"
            : "Layer7B: selected-evidence:ai:fallback",
        );
      }

      observationPoints.push(makeObservation(
        "Layer7_SelectedEvidence",
        `Experience signals: ${candidateProfileView.experienceSignals.length}, requirement signals: ${requiredProfile.requirementSignals.length}`,
        `Strong: ${selectedEvidence.strongEvidence.length}, support: ${selectedEvidence.supportEvidence.length}, transferable: ${selectedEvidence.transferableEvidence.length}, top combined: ${selectedEvidence.combinedTopEvidence.length}`,
        ENGINE_SWITCHES.LAYER_7_SELECTED_EVIDENCE_AI ? "ai" : "rule_fallback",
        ENGINE_SWITCHES.LAYER_7_SELECTED_EVIDENCE_AI ? 0.85 : 0.6,
        tLayer7,
        [],
        "Your strongest evidence was selected and ranked against the role's core requirements.",
      ));
    } catch (err) {
      console.error("[runTailoringPipeline] Layer7 failed — continuing:", err);
      pipelineWarnings.push("Evidence selection ran into a problem. Your application continues with the available evidence.");
      pipelineTrace.push("Layer7A: selected-evidence:error:caught");
    }
  }

  let missingSignals: string[] = [];
  try {
    const rawMissing = buildMissingSignals(candidateProfileView, requiredProfile);

    // EXP-04: moderate rule-track missingSignals using L7 weakEvidence
    // If L7 AI found evidence for a rule-flagged gap, remove it from missingSignals.
    // Safety net: if moderation would empty the list entirely, keep the rule-track result.
    if (ENGINE_SWITCHES.LAYER_7_SELECTED_EVIDENCE_AI && selectedEvidence.weakEvidence.length > 0) {
      const weakLower = new Set(selectedEvidence.weakEvidence.map((s) => s.toLowerCase()));
      // A rule-track gap is retained only if L7 also flagged it as weak evidence
      // (meaning both tracks agree it is a real gap)
      const reconciled = rawMissing.filter((signal) =>
        weakLower.has(signal.toLowerCase()) ||
        selectedEvidence.weakEvidence.some((w) =>
          scoreOverlap(w, signal) >= 2
        )
      );
      missingSignals = reconciled.length > 0 ? reconciled : rawMissing;
      pipelineTrace.push(
        `Layer7C: missingSignals:reconciled — rule:${rawMissing.length} → reconciled:${missingSignals.length}`
      );
    } else {
      missingSignals = rawMissing;
    }
    // EXP-04 end
  } catch (err) {
    console.error("[runTailoringPipeline] missingSignals failed — continuing:", err);
  }

  let positioningBrief: PositioningBriefPack = {
    positioningStrength: "measured",
    positioningTone: "specialist",
    coreWhyFit: [],
    positioningRisks: [],
    positioningStrategy: "",
    coverLetterAngle: "",
    cvEmphasis: [],
  };

  if (ENGINE_SWITCHES.LAYER_8_POSITIONING) {
    try {
      const tLayer8 = Date.now();
      pipelineTrace.push("Layer8A: positioning:rule:start");
      positioningBrief = buildPositioningBriefPack(
        normalizedCandidateProfile,
        structuredJob,
        selectedEvidence,
        missingSignals,
      );
      pipelineTrace.push("Layer8A: positioning:rule:done");

      if (ENGINE_SWITCHES.LAYER_8_POSITIONING_AI) {
        pipelineTrace.push("Layer8B: positioning:ai:start");

        const aiPositioning = await callAiJson<Record<string, unknown>>(
          buildPositioningBriefPrompt({
            locale: normalizedOutputLanguage,
            candidateProfileJson: toJsonString(normalizedCandidateProfile),
            structuredJobJson: toJsonString(structuredJob),
            requiredProfileJson: toJsonString(requiredProfile),
            companyContextJson: toJsonString(companyContext),
            selectedEvidenceJson: toJsonString(selectedEvidence),
          }),
          JSON.stringify(
            {
              instruction: "Return valid JSON only.",
            },
            null,
            2,
          ),
        );

        positioningBrief = mapAiPositioningToInternal(
          aiPositioning,
          positioningBrief,
        );

        pipelineTrace.push(
          aiPositioning
            ? "Layer8B: positioning:ai:done"
            : "Layer8B: positioning:ai:fallback",
        );
      }

      observationPoints.push(makeObservation(
        "Layer8_Positioning",
        `Evidence items: ${selectedEvidence.combinedTopEvidence.length}, missing signals: ${missingSignals.length}`,
        `Strength: "${positioningBrief.positioningStrength}", tone: "${positioningBrief.positioningTone}", coreWhyFit: ${positioningBrief.coreWhyFit.length} items`,
        ENGINE_SWITCHES.LAYER_8_POSITIONING_AI ? "ai" : "rule_fallback",
        ENGINE_SWITCHES.LAYER_8_POSITIONING_AI ? 0.85 : 0.6,
        tLayer8,
        [],
        "Your positioning strategy was built — how to frame your background and strengths specifically for this role.",
      ));
    } catch (err) {
      console.error("[runTailoringPipeline] Layer8 failed — continuing:", err);
      pipelineWarnings.push("Positioning analysis encountered a problem. Your application has been prepared with the available guidance.");
      pipelineTrace.push("Layer8A: positioning:error:caught");
    }
  }

  let recommendation: RecommendationPack = {
    applicationRecommendation: "borderline",
    advisorMessage: "",
    reasoningSummary: "",
    strongMatches: [],
    stretchMatches: [],
    riskAreas: [],
    blockers: [],
    recommendation: "",
  };

  if (ENGINE_SWITCHES.LAYER_9_RECOMMENDATION) {
    try {
      const tLayer9 = Date.now();
      pipelineTrace.push("Layer9A: recommendation:rule:start");
      recommendation = buildRecommendationPack(
        selectedEvidence,
        missingSignals,
      );
      pipelineTrace.push("Layer9A: recommendation:rule:done");

      if (ENGINE_SWITCHES.LAYER_9_RECOMMENDATION_AI) {
        pipelineTrace.push("Layer9B: recommendation:ai:start");

        const aiRecommendation = await callAiJson<Record<string, unknown>>(
          buildApplicationRecommendationInstructions(normalizedOutputLanguage),
          JSON.stringify(
            {
              candidateProfile: normalizedCandidateProfile,
              structuredJob,
              requiredProfile,
              // companyContext included for environmental framing only — must not affect fit verdict
              companyContext,
              selectedEvidence,
              missingSignals,
              // companyResearch and marketSignals intentionally excluded from recommendation inputs
              // they are enrichment-only signals used at document generation time (L11)
            },
            null,
            2,
          ),
        );

        recommendation = mapAiRecommendationToInternal(
          aiRecommendation,
          recommendation,
        );

        pipelineTrace.push(
          aiRecommendation
            ? "Layer9B: recommendation:ai:done"
            : "Layer9B: recommendation:ai:fallback",
        );
      }

      observationPoints.push(makeObservation(
        "Layer9_Recommendation",
        `Evidence: ${selectedEvidence.combinedTopEvidence.length} items, missing: ${missingSignals.length}`,
        `Recommendation: "${recommendation.applicationRecommendation}", strong matches: ${recommendation.strongMatches.length}, risk areas: ${recommendation.riskAreas.length}`,
        ENGINE_SWITCHES.LAYER_9_RECOMMENDATION_AI ? "ai" : "rule_fallback",
        ENGINE_SWITCHES.LAYER_9_RECOMMENDATION_AI ? 0.85 : 0.6,
        tLayer9,
        [],
        `An application recommendation was formed — the assessment is "${recommendation.applicationRecommendation}", based on how well your evidence matches this role's requirements.`,
      ));
    } catch (err) {
      console.error("[runTailoringPipeline] Layer9 failed — continuing:", err);
      pipelineWarnings.push("Application recommendation couldn't be fully prepared. Your documents are ready.");
      pipelineTrace.push("Layer9A: recommendation:error:caught");
    }
  }

  // ── Layer 9C — Recommendation Validation ─────────────────────────────────────
  if (ENGINE_SWITCHES.LAYER_RECOMMENDATION_VALIDATION) {
    try {
      const tValidation = Date.now();
      pipelineTrace.push("Layer9C: recommendation-validation:start");

      const { recommendation: validatedRecommendation, validation } =
        validateRecommendation(recommendation, positioningBrief);

      recommendation = validatedRecommendation;

      pipelineTrace.push(
        validation.triggered
          ? "Layer9C: recommendation-validation:upgraded"
          : "Layer9C: recommendation-validation:no-change",
      );

      observationPoints.push(makeObservation(
        "Layer9C_RecommendationValidation",
        `L9 label: "${validation.originalLabel}", positioningStrength: "${positioningBrief.positioningStrength}", blockers: ${recommendation.blockers.length}, strongMatches: ${recommendation.strongMatches.length}`,
        validation.triggered
          ? `Contradiction detected — upgraded to "${validation.correctedLabel}". Reason: ${validation.reason}`
          : `No contradiction. ${validation.reason}`,
        "rule",
        1.0,
        tValidation,
        [],
        "The recommendation was cross-checked against positioning strength and evidence quality.",
      ));
    } catch (err) {
      console.error("[runTailoringPipeline] Layer9C validation failed — continuing:", err);
      pipelineTrace.push("Layer9C: recommendation-validation:error:caught");
    }
  }

  let bundle: BundleAssembly = {
    candidateProfile: normalizedCandidateProfile,
    candidateProfileView,
    jobProfile,
    structuredJob,
    requiredProfile,
    companyContext,
    companyResearch,
    marketSignals,
    selectedEvidence,
    positioningBrief,
    recommendation,
  };

  if (ENGINE_SWITCHES.LAYER_10_BUNDLE_ASSEMBLY) {
    try {
      const tLayer10 = Date.now();
      pipelineTrace.push("Layer10A: bundle-assembly:start");
      bundle = buildBundleAssembly(bundle);
      pipelineTrace.push("Layer10A: bundle-assembly:done");
      observationPoints.push(makeObservation(
        "Layer10_BundleAssembly",
        `Assembling intelligence bundle from all prior layers`,
        `Bundle assembled: ${Object.keys(bundle).length} top-level fields`,
        "rule_fallback",
        0.6,
        tLayer10,
        [],
        "All analysis was packaged into a single generation bundle — this is what drives the CV and cover letter writing.",
      ));
    } catch (err) {
      console.error("[runTailoringPipeline] Layer10 failed — continuing:", err);
      pipelineWarnings.push("Some analysis assembly steps didn't complete. Your documents are ready with available insights.");
      pipelineTrace.push("Layer10A: bundle-assembly:error:caught");
    }
  }

  const positioningBriefText = buildPositioningBriefText(
    normalizedCandidateProfile,
    structuredJob,
    positioningBrief,
    missingSignals,
    normalizedOutputLanguage,
  );

  const companyContextText = buildCompanyContextText(
    companyContext,
    normalizedOutputLanguage,
  );

  const insights: WorkspaceInsights = {
    selectedEvidence: selectedEvidence.combinedTopEvidence,
    positioningBrief: positioningBriefText,
    positioningStrategy: positioningBrief.positioningStrategy,
    missingSignals,
    companyContext: companyContextText,
    recommendation: recommendation.recommendation,
    applicationRecommendation: recommendation.applicationRecommendation,
    advisorMessage: recommendation.advisorMessage,
    reasoningSummary: recommendation.reasoningSummary,
    strongMatches: recommendation.strongMatches,
    stretchMatches: recommendation.stretchMatches,
    riskAreas: recommendation.riskAreas,
    blockers: recommendation.blockers,
    bundle: bundle as unknown as Record<string, unknown>,
    // rawResponse intentionally omitted — bundle field already is the raw bundle.
    // Storing it twice doubles state size and causes sessionStorage quota failures.
  };

  const runId = createRunId();

  // ── Pre-Layer 11 — Language & Tone Context ──────────────────────────────────
  // Build JD keyword signals and optionally fetch a company homepage snippet.
  // Non-blocking: any failure here is silently ignored.
  const jdBodyText = [
    ...structuredJob.responsibilities,
    ...structuredJob.requirements,
  ].join(" ");

  const companyPageSnippet = normalizedJobUrl
    ? await fetchCompanyPageSnippet(normalizedJobUrl).catch(() => null)
    : null;

  const languageContext = buildLanguageContext(jdBodyText, companyPageSnippet);

  pipelineTrace.push(
    languageContext
      ? `Layer11_pre: language-context:built (${languageContext.length} chars, company-page: ${companyPageSnippet ? "yes" : "no"})`
      : "Layer11_pre: language-context:skipped (no JD text)",
  );

  let cvDraft = "";
  let coverLetterDraft = "";
  let reviewFindings: string | string[] | Record<string, unknown> =
    recommendation.reasoningSummary;

  let cvReviewReport: ReviewReport | null = null;
  let coverLetterReviewReport: ReviewReport | null = null;

  if (ENGINE_SWITCHES.LAYER_11_GENERATION) {
    try {
      const tLayer11 = Date.now();
      pipelineTrace.push("Layer11A: cv-draft:start");
      // Rule-based draft is the baseline
      cvDraft = buildCvDraft(normalizedCandidateProfile, bundle);
      pipelineTrace.push("Layer11A: cv-draft:done");

      // AI CV generation — upgrades the rule-based baseline to a fully tailored document
      pipelineTrace.push("Layer11A-AI: cv-draft:ai:start");
      const aiCvDraft = await callAiText(
        buildGenerateCvInstructions(
          normalizedOutputLanguage,
          "Strong polished professional",
          languageContext || null,
        ),
        JSON.stringify(
          {
            candidateProfile: normalizedCandidateProfile,
            bundle,
          },
          null,
          2,
        ),
      );
      if (aiCvDraft) {
        cvDraft = aiCvDraft;
        pipelineTrace.push("Layer11A-AI: cv-draft:ai:done");
      } else {
        pipelineTrace.push("Layer11A-AI: cv-draft:ai:fallback");
      }

      pipelineTrace.push("Layer11B: cover-letter:base:start");
      coverLetterDraft = buildCoverLetterDraft(
        normalizedCandidateProfile,
        bundle,
        normalizedOutputLanguage,
      );
      pipelineTrace.push("Layer11B: cover-letter:base:done");

      if (ENGINE_SWITCHES.LAYER_11_COVER_LETTER_AI) {
        pipelineTrace.push("Layer11C: cover-letter:ai:start");

        const aiCoverLetter = await callAiText(
          buildGenerateCoverLetterInstructions(
            normalizedOutputLanguage,
            "Strong polished professional",
            languageContext || null,
          ),
          JSON.stringify(
            {
              candidateProfile: normalizedCandidateProfile,
              bundle,
            },
            null,
            2,
          ),
        );

        if (aiCoverLetter) {
          coverLetterDraft = aiCoverLetter;
          pipelineTrace.push("Layer11C: cover-letter:ai:done");
        } else {
          pipelineTrace.push("Layer11C: cover-letter:ai:fallback");
        }
      }

      observationPoints.push(makeObservation(
        "Layer11_Generation",
        `Bundle ready, output language: ${normalizedOutputLanguage}`,
        `CV draft: ${cvDraft.length} chars, cover letter: ${coverLetterDraft.length} chars`,
        ENGINE_SWITCHES.LAYER_11_COVER_LETTER_AI ? "ai" : "rule_fallback",
        ENGINE_SWITCHES.LAYER_11_COVER_LETTER_AI ? 0.85 : 0.6,
        tLayer11,
        [],
        "Your CV and cover letter were drafted using the positioning strategy and evidence assembled in the earlier layers.",
      ));
    } catch (err) {
      console.error("[runTailoringPipeline] Layer11 failed — continuing:", err);
      pipelineWarnings.push("One of your documents couldn't be fully generated. Please check and refine the output.");
      pipelineTrace.push("Layer11A: generation:error:caught");
    }
  }

  if (ENGINE_SWITCHES.LAYER_12_REVIEW && ENGINE_SWITCHES.LAYER_12_REVIEW_AI) {
    try {
      const tLayer12 = Date.now();
      pipelineTrace.push("Layer12A: review:start");

      const cvReviewResult = await callAiJson<ReviewResult>(
        buildReviewPrompt(cvDraft, bundle),
        "Perform the review and return valid JSON only.",
      );

      if (cvReviewResult?.improvedDraft) {
        cvDraft = cvReviewResult.improvedDraft;
        pipelineTrace.push("Layer12A: review:cv:improved");
      } else {
        pipelineTrace.push("Layer12A: review:cv:kept-original");
      }

      cvReviewReport = normalizeReviewReport(cvReviewResult?.reviewReport);
      pipelineTrace.push(
        cvReviewReport ? "Layer12A: review:cv:report" : "Layer12A: review:cv:no-report",
      );

      const coverLetterReviewResult = await callAiJson<ReviewResult>(
        buildReviewPrompt(coverLetterDraft, bundle),
        "Perform the review and return valid JSON only.",
      );

      if (coverLetterReviewResult?.improvedDraft) {
        coverLetterDraft = coverLetterReviewResult.improvedDraft;
        pipelineTrace.push("Layer12A: review:cover-letter:improved");
      } else {
        pipelineTrace.push("Layer12A: review:cover-letter:kept-original");
      }

      coverLetterReviewReport = normalizeReviewReport(
        coverLetterReviewResult?.reviewReport,
      );
      pipelineTrace.push(
        coverLetterReviewReport
          ? "Layer12A: review:cover-letter:report"
          : "Layer12A: review:cover-letter:no-report",
      );

      reviewFindings = {
        cv: cvReviewReport,
        coverLetter: coverLetterReviewReport,
      };

      pipelineTrace.push(
        cvReviewResult || coverLetterReviewResult
          ? "Layer12A: review:done"
          : "Layer12A: review:fallback",
      );

      observationPoints.push(makeObservation(
        "Layer12_Review",
        `CV: ${cvDraft.length} chars, cover letter: ${coverLetterDraft.length} chars`,
        `CV truth check: "${cvReviewReport?.truthCheck ?? "n/a"}", cover letter inflation risk: "${coverLetterReviewReport?.inflationRisk ?? "n/a"}"`,
        "ai",
        cvReviewResult || coverLetterReviewResult ? 0.85 : 0.4,
        tLayer12,
        [],
        "The drafts were reviewed for factual accuracy, relevance, and inflation before being finalised. Any unsupported claims were identified and corrected.",
      ));
    } catch (err) {
      console.error("[runTailoringPipeline] Layer12 failed — continuing:", err);
      pipelineWarnings.push("The final review step didn't complete. Your drafted documents are ready.");
      pipelineTrace.push("Layer12A: review:error:caught");
    }
  }

  // Warnings = blockers: things that could actively damage the application (hard knockout risks).
  // Risk areas = riskAreas: gaps or weaknesses in the candidature (shown separately on Final page).
  // These must be distinct so the Final page can surface them as genuinely different sections.
  const warnings = Array.from(new Set([...recommendation.blockers, ...pipelineWarnings]));

  const finalDrafts: WorkspaceFinalDrafts = {
    cvDraft,
    coverLetterDraft,
    finalCv: cvDraft,
    finalCoverLetter: coverLetterDraft,
    // drafts intentionally omitted — cvDraft/finalCv above already carry the text.
    // Storing all four again doubles the state size and risks sessionStorage quota failures.
    outputLanguage: normalizedOutputLanguage,
    status: "ready",
    runId,
    warnings,
    reviewFindings,
  };

  console.log("[runTailoringPipeline] completed:", {
    runId,
    recommendation: recommendation.applicationRecommendation,
    selectedEvidenceCount: selectedEvidence.combinedTopEvidence.length,
    missingSignalsCount: missingSignals.length,
    riskAreasCount: recommendation.riskAreas.length,
    blockersCount: recommendation.blockers.length,
    warningsCount: warnings.length,
    cvDraftLength: cvDraft.length,
    coverLetterDraftLength: coverLetterDraft.length,
    finalDraftsFinalCvLength: finalDrafts.finalCv?.length ?? 0,
    pipelineTraceLength: pipelineTrace.length,
  });

  return {
    ok: true,
    runId,
    jobProfile,
    structuredJob,
    insights,
    finalDrafts,
    jdQualityAnalysis,
    jdQualityGate,
    observationPoints,
    telemetry: {
      runId,
      outcome:
        recommendation.applicationRecommendation === "not_recommended"
          ? "completed_with_limitations"
          : "completed",
      pipelineTrace,
      diagnostics: {
        selectedEvidenceCount: selectedEvidence.combinedTopEvidence.length,
        missingSignalsCount: missingSignals.length,
        strongMatchesCount: recommendation.strongMatches.length,
        riskAreasCount: recommendation.riskAreas.length,
        review: {
          cvTruthCheck: cvReviewReport?.truthCheck ?? null,
          cvRelevanceScore: cvReviewReport?.relevanceScore ?? null,
          cvInflationRisk: cvReviewReport?.inflationRisk ?? null,
          coverLetterTruthCheck: coverLetterReviewReport?.truthCheck ?? null,
          coverLetterRelevanceScore:
            coverLetterReviewReport?.relevanceScore ?? null,
          coverLetterInflationRisk:
            coverLetterReviewReport?.inflationRisk ?? null,
        },
      },
    },
  };
}