export type WorkspaceRequirementImportance =
  | "blocker"
  | "core"
  | "supporting"
  | "preferred";

export type WorkspaceRequirementMatchStatus =
  | "matched"
  | "adjacent"
  | "weak"
  | "missing";

export type WorkspaceRequirementAnalysisItem = {
  requirement: string;
  importance: WorkspaceRequirementImportance;
  matchStatus: WorkspaceRequirementMatchStatus;
  notes: string;
};

export type WorkspaceCandidateRole = {
  title: string;
  company: string | null;
  startDate: string | null;
  endDate: string | null;
  isCurrent: boolean;
  location: string | null;
  achievements: string[];
};

export type WorkspaceCandidateLanguage = {
  language: string;
  proficiency: string | null;
};

export type WorkspaceCandidateEducation = {
  degree: string;
  field: string | null;
  institution: string | null;
  endDate: string | null;
};

export type WorkspaceCandidateCertification = {
  name: string;
  issuer: string | null;
  date: string | null;
};

export type WorkspaceVerifiedClaimConfidence = "high" | "medium";

export type WorkspaceVerifiedClaim = {
  claim: string;
  evidence: string[];
  confidence: WorkspaceVerifiedClaimConfidence;
};

export type WorkspaceCandidateProfile = {
  fullName?: string | null;
  headline?: string | null;
  summary?: string | null;

  roles?: WorkspaceCandidateRole[];
  coreSkills?: string[];
  tools?: string[];
  standards?: string[];
  industries?: string[];

  languages?: WorkspaceCandidateLanguage[];
  education?: WorkspaceCandidateEducation[];
  certifications?: WorkspaceCandidateCertification[];

  leadershipSignals?: string[];
  strengths?: string[];
  constraints?: string[];
  verifiedClaims?: WorkspaceVerifiedClaim[];
  openQuestions?: string[];

  competencies?: string[];
  evidenceNotes?: string[];

  rawResponse?: unknown;
};

export type WorkspaceJobExtractionSource =
  | "pasted-text"
  | "direct-fetch"
  | "readable-fallback"
  | "direct-fetch+user-text-fallback"
  | "readable-fallback+user-text-fallback"
  | "blocked-or-thin-content";

export type WorkspaceOutputLanguage = "de" | "en";

export type WorkspaceJobProfile = {
  companyName?: string;
  jobTitle?: string;
  location?: string;
  responsibilities?: string[];
  requirements?: string[];
  summary?: string;

  extractedText?: string;
  extractionSource?: WorkspaceJobExtractionSource;
  normalizedUrl?: string;
  warnings?: string[];

  outputLanguage?: WorkspaceOutputLanguage;

  rawResponse?: unknown;
};

export type WorkspaceApplicationRecommendation =
  | "apply_confidently"
  | "apply_with_care"
  | "borderline"
  | "not_recommended";

export type WorkspaceInsights = {
  selectedEvidence?: string[] | Record<string, unknown>;
  positioningBrief?: string | Record<string, unknown>;
  positioningStrategy?: string;
  missingSignals?: string[];
  companyContext?: string | Record<string, unknown> | null;
  recommendation?: string | Record<string, unknown> | null;
  bundle?: Record<string, unknown> | null;

  applicationRecommendation?: WorkspaceApplicationRecommendation;
  advisorMessage?: string;
  reasoningSummary?: string;
  strongMatches?: string[];
  stretchMatches?: string[];
  riskAreas?: string[];
  blockers?: string[];
  requirementsAnalysis?: WorkspaceRequirementAnalysisItem[];

  rawResponse?: unknown;
};

export type WorkspaceFinalDrafts = {
  cvDraft?: string;
  coverLetterDraft?: string;
  finalCv?: string;
  finalCoverLetter?: string;

  drafts?: Record<string, unknown> | null;
  warnings?: string[];
  reviewFindings?: string | string[] | Record<string, unknown>;

  outputLanguage?: WorkspaceOutputLanguage;
  status?: string;
  runId?: string;

  rawResponse?: unknown;
};

export type WorkspaceDocumentType = "cv" | "certificate" | "reference" | "other";

// Persisted document metadata — stored in WorkspaceState and synced to sessionStorage.
// Includes extracted text so the Document Library survives page refresh/navigation.
// blobUrl is intentionally excluded: it is a browser-only object URL that cannot persist.
export type WorkspaceDocument = {
  id: string;
  fileName: string;
  docType: WorkspaceDocumentType;
  customLabel: string;
  text: string;
  chars: number;
  uploadedAt: string;
};

export type WorkspaceStepKey = "profile" | "job" | "insights" | "final";

export type WorkspaceStepStatus = "idle" | "loading" | "ready" | "error";

export type WorkspaceProgress = {
  profileReady: boolean;
  jobReady: boolean;
  insightsReady: boolean;
  finalReady: boolean;
  nextStep: WorkspaceStepKey;
};

export type WorkspaceStageKey =
  | "profile"
  | "jobExtraction"
  | "requiredProfile"
  | "companyContext"
  | "companyResearch"
  | "marketSignals"
  | "selectedEvidence"
  | "positioningBrief"
  | "recommendation"
  | "generation";

export type WorkspaceStageOutcome =
  | "pending"
  | "processing"
  | "success"
  | "partial"
  | "error"
  | "unavailable";

export type WorkspaceRunOutcome =
  | "pending"
  | "completed"
  | "completed_with_limitations"
  | "failed";

export type WorkspaceInputType =
  | "url_only"
  | "pasted_text_only"
  | "url_and_pasted_text"
  | "unknown";

export type WorkspaceStageTelemetry = {
  stage: WorkspaceStageKey;
  status: WorkspaceStageOutcome;
  startedAt?: string | null;
  completedAt?: string | null;
  durationMs?: number | null;
  warnings?: string[];
  errors?: string[];
};

export type WorkspaceRunTelemetry = {
  runId: string | null;
  startedAt: string | null;
  completedAt: string | null;
  durationMs: number | null;

  language: WorkspaceOutputLanguage | null;
  inputType: WorkspaceInputType;

  userGeography?: string | null;
  jobGeography?: string | null;

  outcome: WorkspaceRunOutcome;
  degradedReasons: string[];
  warnings: string[];
  errors: string[];

  stages: WorkspaceStageTelemetry[];
};

export type WorkspaceState = {
  candidateProfile: WorkspaceCandidateProfile | null;
  jobProfile: WorkspaceJobProfile | null;
  insights: WorkspaceInsights | null;
  finalDrafts: WorkspaceFinalDrafts | null;

  // Persistent document library — survives refresh/navigation via sessionStorage.
  documents: WorkspaceDocument[];
  // Last-build filenames — shown in "Sources in last build" (separate from the library).
  uploadedFiles: string[];
  jobUrl: string;
  jobText: string;

  profileStatus: WorkspaceStepStatus;
  jobStatus: WorkspaceStepStatus;
  insightsStatus: WorkspaceStepStatus;
  finalStatus: WorkspaceStepStatus;

  profileError: string | null;
  jobError: string | null;
  insightsError: string | null;
  finalError: string | null;

  telemetry: WorkspaceRunTelemetry | null;
};