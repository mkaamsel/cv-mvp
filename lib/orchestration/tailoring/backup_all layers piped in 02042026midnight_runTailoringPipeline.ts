import OpenAI from "openai";
import { buildApplicationRecommendationInstructions } from "@/lib/prompts/applicationRecommendationPrompt";
import { buildCompanyContextInstructions } from "@/lib/prompts/companyContextPrompt";
import { buildCompanyResearchInstructions } from "@/lib/prompts/companyResearchPrompt";
import { buildGenerateCoverLetterInstructions } from "@/lib/prompts/generateCoverLetterPrompt";
import { buildMarketSignalsInstructions } from "@/lib/prompts/marketSignalsPrompt";
import { buildPositioningBriefPrompt } from "@/lib/prompts/positioningBriefPrompt";
import { buildRequiredProfileInstructions } from "@/lib/prompts/requiredProfilePrompt";
import { buildReviewPrompt } from "@/lib/prompts/reviewPrompt";

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";

type TailoringPipelineInput = {
  origin: string;
  cookieHeader?: string;
  jobUrl?: string;
  jobDescriptionText?: string;
  outputLanguage?: "en" | "de" | string;
  candidateProfile?: Record<string, unknown> | null;
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
  outputLanguage?: "de" | "en";
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
  telemetry: {
    runId: string;
    outcome: "completed" | "completed_with_limitations";
    pipelineTrace: string[];
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

export type TailoringPipelineResult =
  | TailoringPipelineSuccess
  | TailoringPipelineError;

const ENGINE_SWITCHES = {
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
  LAYER_8_POSITIONING: true,
  LAYER_8_POSITIONING_AI: true,
  LAYER_9_RECOMMENDATION: true,
  LAYER_9_RECOMMENDATION_AI: true,
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

function normalizeLanguage(value: unknown): "en" | "de" {
  return value === "de" ? "de" : "en";
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
  } catch {
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
  } catch {
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

  if (!jobTitle) {
    const titleSignals = [
      "accountant",
      "buchhalter",
      "bilanzbuchhalter",
      "hauptbuchhalter",
      "finance manager",
      "finance",
      "accounting",
      "controller",
      "controlling",
      "manager accounting",
      "senior accountant",
    ];

    const scanLines = [...responsibilities, ...requirements, summary];

    for (const line of scanLines) {
      const lower = line.toLowerCase();

      if (looksLikeBadTitle(line)) continue;

      for (const signal of titleSignals) {
        if (lower.includes(signal)) {
          jobTitle = line;
          break;
        }
      }

      if (jobTitle) break;
    }
  }

  if (!jobTitle) {
    jobTitle = "Finance / Accounting role";
  }

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
          item?.category === "domain"
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
          item?.category === "behavioural" || item?.category === "stakeholder"
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
  };
}

function deriveCompanyContext(
  structuredJob: StructuredJob,
  language: "en" | "de",
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
  language: "en" | "de",
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

  if (!haystack) {
    return requiredProfile.requirementSignals.slice(0, 5);
  }

  return requiredProfile.requirementSignals
    .filter((requirement) => scoreOverlap(haystack, requirement) === 0)
    .slice(0, 5);
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

  const headline =
    asString(candidateProfile?.headline) ??
    asString(candidateProfile?.summary) ??
    "Relevant finance background";

  const coreWhyFit = [
    headline,
    ...selectedEvidence.strongEvidence.slice(0, 2),
    ...selectedEvidence.supportEvidence.slice(0, 1),
  ].filter(Boolean);

  const positioningRisks = missingSignals.slice(0, 3);

  const positioningStrategy =
    missingSignals.length > 0
      ? "Position through proven accounting execution, strong closing and reconciliation credibility, and disciplined acknowledgment of qualification gaps."
      : "Position through strong role alignment, closing credibility, and directly relevant accounting evidence.";

  const coverLetterAngle =
    "Emphasise credible accounting depth, international coordination, and conservative positioning without overstating formal qualification overlap.";

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

function buildRecommendationPack(
  selectedEvidence: SelectedEvidencePack,
  missingSignals: string[],
  marketSignals: MarketSignals,
): RecommendationPack {
  const evidenceCount = selectedEvidence.combinedTopEvidence.length;
  const missingCount = missingSignals.length;

  if (
    evidenceCount >= 5 &&
    missingCount <= 1 &&
    marketSignals.strictnessSignal !== "higher"
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
  language: "en" | "de",
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
      "Die Positionierung sollte glaubwürdig, selektiv und ohne Überdehnung erfolgen.",
    ].join(" ");
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
    "The positioning should stay credible, selective, and non-exaggerative.",
  ].join(" ");
}

function buildCompanyContextText(
  companyContext: CompanyContext,
  language: "en" | "de",
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

function buildCvDraft(
  candidateProfile: Record<string, unknown> | null,
  bundle: BundleAssembly,
): string {
  const summary =
    asString(candidateProfile?.summary) ??
    asString(candidateProfile?.headline) ??
    "Experienced professional with relevant background for the target role.";

  const roleLines = getCandidateRoleLines(candidateProfile).slice(0, 4);
  const roleLabel = bundle.structuredJob.jobTitle || "Finance / Accounting role";
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
  language: "en" | "de",
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
  const response = await fetch(url, init);
  const data = (await response.json()) as T | Record<string, unknown>;

  return {
    ok: response.ok,
    status: response.status,
    data,
  };
}

function createRunId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `run_${Date.now()}`;
}

export async function runTailoringPipeline({
  origin,
  cookieHeader = "",
  jobUrl,
  jobDescriptionText,
  outputLanguage,
  candidateProfile,
}: TailoringPipelineInput): Promise<TailoringPipelineResult> {
  const pipelineTrace: string[] = [];

  const normalizedJobUrl = asString(jobUrl) ?? "";
  const normalizedJobDescriptionText = asString(jobDescriptionText) ?? "";
  const normalizedOutputLanguage = normalizeLanguage(outputLanguage);
  const normalizedCandidateProfile = asRecord(candidateProfile);

  if (!normalizedJobUrl && !normalizedJobDescriptionText) {
    return {
      ok: false,
      status: 400,
      message: "Please provide a job URL or pasted job description text.",
    };
  }

  if (!ENGINE_SWITCHES.LAYER_1_ANALYSIS) {
    return {
      ok: false,
      status: 500,
      message: "Layer 1 analysis is disabled.",
    };
  }

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

  if (!extractJobResponse.ok) {
    const errorData = asRecord(extractJobResponse.data);

    return {
      ok: false,
      status: extractJobResponse.status || 500,
      message:
        asString(errorData?.error) ??
        "Job extraction failed inside the canonical pipeline.",
      details: extractJobResponse.data,
    };
  }

  const extractData = asRecord(extractJobResponse.data) ?? {};
  const structuredJob = normalizeStructuredJob(extractData.structuredJob);
  pipelineTrace.push("Layer1A: extract-job:done");

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

  let candidateProfileView: CandidateProfileView = {
    experienceSignals: [],
    possessionSignals: [],
  };

  if (ENGINE_SWITCHES.LAYER_2_CANDIDATE_PROFILE_VIEW) {
    pipelineTrace.push("Layer2A: candidate-profile-view:start");
    candidateProfileView = buildCandidateProfileView(normalizedCandidateProfile);
    pipelineTrace.push("Layer2A: candidate-profile-view:done");
  }

  let requiredProfile: RequiredProfile = {
    responsibilitySignals: structuredJob.responsibilities,
    requirementSignals: structuredJob.requirements,
    qualificationSignals: [],
    technicalSignals: [],
    softSignals: [],
  };

  if (ENGINE_SWITCHES.LAYER_3_REQUIRED_PROFILE) {
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
  }

  let companyContext: CompanyContext = {
    companyLabel: structuredJob.companyName || "Unknown",
    roleLabel: structuredJob.jobTitle || "Unknown role",
    locationLabel: structuredJob.location || "Not specified",
    environmentSummary: "",
  };

  if (ENGINE_SWITCHES.LAYER_4_COMPANY_CONTEXT) {
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
  }

  let companyResearch: CompanyResearch = {
    employerType: "general",
    complexitySignal: "moderate",
    scopeSignal: "local_or_unspecified",
    notes: [],
  };

  if (ENGINE_SWITCHES.LAYER_5_COMPANY_RESEARCH) {
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
  }

  let marketSignals: MarketSignals = {
    senioritySignal: "mid",
    strictnessSignal: "moderate",
    transferabilitySignal: "reasonable",
    notes: [],
  };

  if (ENGINE_SWITCHES.LAYER_6_MARKET_SIGNALS) {
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
  }

  let selectedEvidence: SelectedEvidencePack = {
    strongEvidence: [],
    supportEvidence: [],
    transferableEvidence: [],
    weakEvidence: [],
    combinedTopEvidence: [],
  };

  if (ENGINE_SWITCHES.LAYER_7_SELECTED_EVIDENCE) {
    pipelineTrace.push("Layer7A: selected-evidence:start");
    selectedEvidence = buildSelectedEvidencePack(
      candidateProfileView,
      requiredProfile,
    );
    pipelineTrace.push("Layer7A: selected-evidence:done");
  }

  const missingSignals = buildMissingSignals(
    candidateProfileView,
    requiredProfile,
  );

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
    pipelineTrace.push("Layer9A: recommendation:rule:start");
    recommendation = buildRecommendationPack(
      selectedEvidence,
      missingSignals,
      marketSignals,
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
            companyContext,
            companyResearch,
            marketSignals,
            selectedEvidence,
            missingSignals,
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
    pipelineTrace.push("Layer10A: bundle-assembly:start");
    bundle = buildBundleAssembly(bundle);
    pipelineTrace.push("Layer10A: bundle-assembly:done");
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
    rawResponse: bundle,
  };

  const runId = createRunId();

  let cvDraft = "";
  let coverLetterDraft = "";
  let reviewFindings: string | string[] | Record<string, unknown> =
    recommendation.reasoningSummary;

  if (ENGINE_SWITCHES.LAYER_11_GENERATION) {
    pipelineTrace.push("Layer11A: cv-draft:start");
    cvDraft = buildCvDraft(normalizedCandidateProfile, bundle);
    pipelineTrace.push("Layer11A: cv-draft:done");

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
  }

  if (ENGINE_SWITCHES.LAYER_12_REVIEW && ENGINE_SWITCHES.LAYER_12_REVIEW_AI) {
    pipelineTrace.push("Layer12A: review:start");

    const reviewedCv = await callAiText(
      buildReviewPrompt(cvDraft, bundle),
      "Improve this draft conservatively and return plain text only.",
    );
    if (reviewedCv) {
      cvDraft = reviewedCv;
    }

    const reviewedCoverLetter = await callAiText(
      buildReviewPrompt(coverLetterDraft, bundle),
      "Improve this draft conservatively and return plain text only.",
    );
    if (reviewedCoverLetter) {
      coverLetterDraft = reviewedCoverLetter;
    }

    reviewFindings = recommendation.reasoningSummary || "AI review applied.";
    pipelineTrace.push("Layer12A: review:done");
  }

  const warnings = Array.from(
    new Set([...(jobProfile.warnings ?? []), ...recommendation.riskAreas]),
  );

  const finalDrafts: WorkspaceFinalDrafts = {
    cvDraft,
    coverLetterDraft,
    finalCv: cvDraft,
    finalCoverLetter: coverLetterDraft,
    drafts: {
      cvDraft,
      coverLetterDraft,
      finalCv: cvDraft,
      finalCoverLetter: coverLetterDraft,
    },
    outputLanguage: normalizedOutputLanguage,
    status: "ready",
    runId,
    warnings,
    reviewFindings,
    rawResponse: {
      warnings,
      reviewFindings,
    },
  };

  return {
    ok: true,
    runId,
    jobProfile,
    structuredJob,
    insights,
    finalDrafts,
    telemetry: {
      runId,
      outcome:
        recommendation.applicationRecommendation === "not_recommended"
          ? "completed_with_limitations"
          : "completed",
      pipelineTrace,
    },
  };
}