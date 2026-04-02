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
  };
};

type TailoringPipelineError = {
  ok: false;
  status: number;
  message: string;
  details?: unknown;
};

export type TailoringPipelineResult =
  | TailoringPipelineSuccess
  | TailoringPipelineError;

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

function normalizeLanguage(value: unknown): "en" | "de" {
  return value === "de" ? "de" : "en";
}

function normalizeStructuredJob(input: unknown): StructuredJob {
  const job = asRecord(input) ?? {};

  return {
    companyName: asString(job.companyName) ?? "",
    jobTitle: asString(job.jobTitle) ?? "",
    location: asString(job.location) ?? "",
    responsibilities: asStringArray(job.responsibilities),
    requirements: asStringArray(job.requirements),
    summary: asString(job.summary) ?? "",
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

      const header = [title, company].filter(Boolean).join(" at ").trim();
      if (!header && achievements.length === 0) return null;

      return [header, ...achievements].filter(Boolean).join(" — ");
    })
    .filter((item): item is string => Boolean(item));
}

function getCandidateSkills(
  candidateProfile: Record<string, unknown> | null,
): string[] {
  if (!candidateProfile) return [];

  return Array.from(
    new Set([
      ...asStringArray(candidateProfile.coreSkills),
      ...asStringArray(candidateProfile.skills),
      ...asStringArray(candidateProfile.tools),
      ...asStringArray(candidateProfile.standards),
      ...asStringArray(candidateProfile.domains),
      ...asStringArray(candidateProfile.industries),
      ...asStringArray(candidateProfile.strengths),
    ]),
  );
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

function buildSelectedEvidence(
  candidateProfile: Record<string, unknown> | null,
  job: StructuredJob,
): string[] {
  const roleLines = getCandidateRoleLines(candidateProfile);
  const skills = getCandidateSkills(candidateProfile);

  const jobLines = [
    job.jobTitle,
    ...job.requirements,
    ...job.responsibilities,
    job.summary,
  ].filter(Boolean);

  const scoredRoleLines = roleLines
    .map((line) => ({
      line,
      score: jobLines.reduce(
        (sum, jobLine) => sum + scoreOverlap(line, jobLine),
        0,
      ),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((item) => item.line);

  const scoredSkills = skills
    .map((skill) => ({
      skill,
      score: jobLines.reduce(
        (sum, jobLine) => sum + scoreOverlap(skill, jobLine),
        0,
      ),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map((item) => item.skill);

  return Array.from(new Set([...scoredRoleLines, ...scoredSkills])).slice(0, 8);
}

function buildMissingSignals(
  candidateProfile: Record<string, unknown> | null,
  job: StructuredJob,
): string[] {
  const haystack = [
    ...getCandidateRoleLines(candidateProfile),
    ...getCandidateSkills(candidateProfile),
    asString(candidateProfile?.summary) ?? "",
    asString(candidateProfile?.headline) ?? "",
  ]
    .join(" \n ")
    .trim();

  if (!haystack) {
    return job.requirements.slice(0, 5);
  }

  return job.requirements
    .filter((requirement) => scoreOverlap(haystack, requirement) === 0)
    .slice(0, 5);
}

function buildRecommendation(
  selectedEvidence: string[],
  missingSignals: string[],
): RecommendationPack {
  const evidenceCount = selectedEvidence.length;
  const missingCount = missingSignals.length;

  if (evidenceCount >= 4 && missingCount <= 1) {
    return {
      applicationRecommendation: "apply_confidently",
      advisorMessage:
        "The profile shows multiple credible alignment points for this role.",
      reasoningSummary:
        "The role has several clear fit signals and only limited uncovered requirements.",
      strongMatches: selectedEvidence.slice(0, 4),
      stretchMatches: [],
      riskAreas: [],
      blockers: [],
      recommendation:
        "Recommended to proceed. The profile appears credibly aligned for application.",
    };
  }

  if (evidenceCount >= 2 && missingCount <= 3) {
    return {
      applicationRecommendation: "apply_with_care",
      advisorMessage:
        "There is a credible case to apply, but the positioning should stay selective and disciplined.",
      reasoningSummary:
        "The role shows meaningful overlap, though some requirements still need careful framing.",
      strongMatches: selectedEvidence.slice(0, 3),
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
      strongMatches: selectedEvidence.slice(0, 2),
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

function buildPositioningBrief(
  candidateProfile: Record<string, unknown> | null,
  job: StructuredJob,
  selectedEvidence: string[],
  language: "en" | "de",
): string {
  const headline =
    asString(candidateProfile?.headline) ??
    asString(candidateProfile?.summary) ??
    "The candidate brings relevant professional experience.";

  if (language === "de") {
    return [
      `Zielrolle: ${job.jobTitle || "Unbekannte Rolle"}${
        job.companyName ? ` bei ${job.companyName}` : ""
      }.`,
      `Ausgangsposition: ${headline}`,
      selectedEvidence.length
        ? `Tragende Evidenz: ${selectedEvidence.slice(0, 3).join("; ")}.`
        : "Es liegt aktuell nur begrenzte belastbare Evidenz für die Positionierung vor.",
      "Die Positionierung sollte glaubwürdig, selektiv und ohne Überdehnung erfolgen.",
    ].join(" ");
  }

  return [
    `Target role: ${job.jobTitle || "Unknown role"}${
      job.companyName ? ` at ${job.companyName}` : ""
    }.`,
    `Starting position: ${headline}`,
    selectedEvidence.length
      ? `Core evidence: ${selectedEvidence.slice(0, 3).join("; ")}.`
      : "Only limited supporting evidence is currently visible for this positioning.",
    "The positioning should stay credible, selective, and non-exaggerative.",
  ].join(" ");
}

function buildCompanyContext(job: StructuredJob, language: "en" | "de"): string {
  if (language === "de") {
    return [
      job.companyName
        ? `Unternehmen: ${job.companyName}.`
        : "Unternehmen nicht sicher identifiziert.",
      job.jobTitle ? `Rolle: ${job.jobTitle}.` : "Rolle nicht sicher identifiziert.",
      job.location
        ? `Standort: ${job.location}.`
        : "Standort nicht sicher identifiziert.",
      job.summary || "Noch keine kompakte Kontextzusammenfassung verfügbar.",
    ].join(" ");
  }

  return [
    job.companyName
      ? `Company: ${job.companyName}.`
      : "Company not confidently identified.",
    job.jobTitle ? `Role: ${job.jobTitle}.` : "Role not confidently identified.",
    job.location ? `Location: ${job.location}.` : "Location not confidently identified.",
    job.summary || "No compact context summary available yet.",
  ].join(" ");
}

function buildCvDraft(
  candidateProfile: Record<string, unknown> | null,
  job: StructuredJob,
  selectedEvidence: string[],
): string {
  const summary =
    asString(candidateProfile?.summary) ??
    asString(candidateProfile?.headline) ??
    "Experienced professional with relevant background for the target role.";

  const roleLines = getCandidateRoleLines(candidateProfile).slice(0, 4);

  return [
    summary,
    "",
    "Relevant evidence for this role:",
    ...(selectedEvidence.length
      ? selectedEvidence.map((item) => `- ${item}`)
      : ["- Role-aligned evidence still needs refinement."]),
    "",
    "Career highlights:",
    ...(roleLines.length
      ? roleLines.map((item) => `- ${item}`)
      : ["- No role highlights available yet."]),
    "",
    `Target role: ${job.jobTitle || "Unknown role"}${
      job.companyName ? ` | ${job.companyName}` : ""
    }`,
  ].join("\n");
}

function buildCoverLetterDraft(
  candidateProfile: Record<string, unknown> | null,
  job: StructuredJob,
  selectedEvidence: string[],
  language: "en" | "de",
): string {
  const name = asString(candidateProfile?.fullName) ?? "Candidate";
  const summary =
    asString(candidateProfile?.summary) ??
    asString(candidateProfile?.headline) ??
    "";

  if (language === "de") {
    return [
      `Bewerbung als ${job.jobTitle || "Position"}`,
      "",
      "Sehr geehrte Damen und Herren,",
      "",
      `mit Blick auf die ausgeschriebene Rolle${
        job.companyName ? ` bei ${job.companyName}` : ""
      } sehe ich eine glaubwürdige Verbindung zu meinem bisherigen Profil.`,
      summary ||
        "Mein beruflicher Hintergrund zeigt belastbare Erfahrung in relevanten Aufgabenfeldern.",
      selectedEvidence.length
        ? `Besonders relevant erscheinen dabei ${selectedEvidence
            .slice(0, 3)
            .join(", ")}.`
        : "Die belastbarsten Anknüpfungspunkte würden in einer nächsten Iteration noch klarer herausgearbeitet.",
      "",
      "Ich freue mich auf ein Gespräch.",
      "",
      `Mit freundlichen Grüßen\n${name}`,
    ].join("\n");
  }

  return [
    `Application for ${job.jobTitle || "the role"}`,
    "",
    "Dear Hiring Team,",
    "",
    `I see a credible connection between my background and this opportunity${
      job.companyName ? ` at ${job.companyName}` : ""
    }.`,
    summary ||
      "My professional background includes relevant experience for the target role.",
    selectedEvidence.length
      ? `The strongest alignment points currently appear to be ${selectedEvidence
          .slice(0, 3)
          .join(", ")}.`
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

  const jobProfile: WorkspaceJobProfile = {
    companyName: structuredJob.companyName,
    jobTitle: structuredJob.jobTitle,
    location: structuredJob.location,
    responsibilities: structuredJob.responsibilities,
    requirements: structuredJob.requirements,
    summary: structuredJob.summary,
    extractedText: asString(extractData.extractedText) ?? "",
    extractionSource:
      (asString(extractData.source) as WorkspaceJobProfile["extractionSource"]) ??
      "pasted-text",
    normalizedUrl: asString(extractData.normalizedUrl) ?? normalizedJobUrl,
    warnings: asStringArray(extractData.warnings),
    outputLanguage: normalizedOutputLanguage,
    rawResponse: extractJobResponse.data,
  };

  const selectedEvidence = buildSelectedEvidence(
    normalizedCandidateProfile,
    structuredJob,
  );
  const missingSignals = buildMissingSignals(
    normalizedCandidateProfile,
    structuredJob,
  );
  const recommendationPack = buildRecommendation(
    selectedEvidence,
    missingSignals,
  );
  const positioningBrief = buildPositioningBrief(
    normalizedCandidateProfile,
    structuredJob,
    selectedEvidence,
    normalizedOutputLanguage,
  );
  const companyContext = buildCompanyContext(
    structuredJob,
    normalizedOutputLanguage,
  );

  const bundle = {
    candidateProfile: normalizedCandidateProfile,
    jobProfile,
    selectedEvidence,
    positioningBrief,
    companyContext,
    recommendation: recommendationPack.recommendation,
    applicationRecommendation: recommendationPack.applicationRecommendation,
    advisorMessage: recommendationPack.advisorMessage,
    reasoningSummary: recommendationPack.reasoningSummary,
    strongMatches: recommendationPack.strongMatches,
    stretchMatches: recommendationPack.stretchMatches,
    riskAreas: recommendationPack.riskAreas,
    blockers: recommendationPack.blockers,
  };

  const insights: WorkspaceInsights = {
    selectedEvidence,
    positioningBrief,
    positioningStrategy: positioningBrief,
    missingSignals,
    companyContext,
    recommendation: recommendationPack.recommendation,
    applicationRecommendation: recommendationPack.applicationRecommendation,
    advisorMessage: recommendationPack.advisorMessage,
    reasoningSummary: recommendationPack.reasoningSummary,
    strongMatches: recommendationPack.strongMatches,
    stretchMatches: recommendationPack.stretchMatches,
    riskAreas: recommendationPack.riskAreas,
    blockers: recommendationPack.blockers,
    bundle,
    rawResponse: bundle,
  };

  const runId = createRunId();

  const cvDraft = buildCvDraft(
    normalizedCandidateProfile,
    structuredJob,
    selectedEvidence,
  );
  const coverLetterDraft = buildCoverLetterDraft(
    normalizedCandidateProfile,
    structuredJob,
    selectedEvidence,
    normalizedOutputLanguage,
  );

  const warnings = [...(jobProfile.warnings ?? []), ...recommendationPack.riskAreas];

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
    reviewFindings: recommendationPack.reasoningSummary,
    rawResponse: {
      warnings,
      reviewFindings: recommendationPack.reasoningSummary,
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
        recommendationPack.applicationRecommendation === "not_recommended"
          ? "completed_with_limitations"
          : "completed",
    },
  };
}