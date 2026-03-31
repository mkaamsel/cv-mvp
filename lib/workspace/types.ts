export type WorkspaceRequirementAnalysisItem = {
  requirement: string;
  importance: "blocker" | "core" | "supporting" | "preferred";
  matchStatus: "matched" | "adjacent" | "weak" | "missing";
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

export type WorkspaceVerifiedClaim = {
  claim: string;
  evidence: string[];
  confidence: "high" | "medium";
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

export type WorkspaceJobProfile = {
  companyName?: string;
  jobTitle?: string;
  location?: string;
  responsibilities?: string[];
  requirements?: string[];
  summary?: string;

  extractedText?: string;
  extractionSource?:
    | "pasted-text"
    | "direct-fetch"
    | "readable-fallback"
    | "direct-fetch+user-text-fallback"
    | "readable-fallback+user-text-fallback"
    | "blocked-or-thin-content";
  normalizedUrl?: string;
  warnings?: string[];

  outputLanguage?: "de" | "en";

  rawResponse?: unknown;
};

export type WorkspaceInsights = {
  selectedEvidence?: string[];
  positioningBrief?: string;
  positioningStrategy?: string;
  missingSignals?: string[];
  companyContext?: string | Record<string, unknown> | null;

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
  requirementsAnalysis?: WorkspaceRequirementAnalysisItem[];

  rawResponse?: unknown;
};

export type WorkspaceFinalDrafts = {
  cvDraft?: string;
  coverLetterDraft?: string;
  finalCv?: string;
  finalCoverLetter?: string;

  outputLanguage?: string;
  status?: string;
  runId?: string;

  rawResponse?: unknown;
};

export type WorkspaceState = {
  candidateProfile: WorkspaceCandidateProfile | null;
  jobProfile: WorkspaceJobProfile | null;
  insights: WorkspaceInsights | null;
  finalDrafts: WorkspaceFinalDrafts | null;

  uploadedFiles: string[];
  jobUrl: string;
  jobText: string;

  profileStatus: "idle" | "loading" | "ready" | "error";
  jobStatus: "idle" | "loading" | "ready" | "error";
  finalStatus: "idle" | "loading" | "ready" | "error";

  profileError: string | null;
  jobError: string | null;
  finalError: string | null;
};

export type WorkspaceStepKey =
  | "profile"
  | "job"
  | "final"
  | "insights";

export type WorkspaceProgress = {
  profileReady: boolean;
  jobReady: boolean;
  insightsReady: boolean;
  finalReady: boolean;
  nextStep: WorkspaceStepKey;
};