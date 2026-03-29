export type ProfileLanguage = {
  language: string;
  proficiency?: string | null;
};

export type CandidateRole = {
  title: string;
  company?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  isCurrent?: boolean;
  location?: string | null;
  responsibilities?: string[];
  achievements?: string[];
};

export type CandidateEducation = {
  degree: string;
  field?: string | null;
  institution?: string | null;
  endDate?: string | null;
};

export type CandidateCertification = {
  name: string;
  issuer?: string | null;
  date?: string | null;
};

export type CandidateProfile = {
  fullName?: string | null;
  headline?: string | null;
  summary?: string | null;
  location?: string | null;
  targetRoles?: string[];
  skills?: string[];
  domains?: string[];
  industries?: string[];
  languages?: ProfileLanguage[];
  experience?: CandidateRole[];
  education?: CandidateEducation[];
  certifications?: CandidateCertification[];
  notes?: string[];
};

export type JobProfile = {
  companyName: string;
  jobTitle: string;
  location?: string | null;
  summary?: string;
  responsibilities?: string[];
  requirements?: string[];
  rawText?: string;
};

export type RequiredProfile = {
  targetTitle: string;
  company?: string | null;
  seniorityExpected:
    | "junior"
    | "mid"
    | "senior"
    | "lead"
    | "manager"
    | "director"
    | "unknown";
  coreRequirements: string[];
  secondaryRequirements: string[];
  leadershipExpectation:
    | "none"
    | "informal"
    | "team_lead"
    | "people_management"
    | "unknown";
  languageRequirements: string[];
  systemsRequirements: string[];
  regulatoryRequirements: string[];
  industryPreferences: string[];
  scopeSignals: string[];
  riskFlags: string[];
};

export type CompanyContext = {
  companyName?: string | null;
  industry: string[];
  scaleIndicators: string[];
  financeEnvironment: string[];
  regulatoryIntensity: "low" | "medium" | "high" | "unknown";
  internationalExposure: "low" | "medium" | "high" | "unknown";
  transformationSignals: string[];
  stakeholderComplexity: "low" | "medium" | "high" | "unknown";
  reasoningNotes: string[];
};

export type EvidenceMatchType =
  | "direct_match"
  | "adjacent_match"
  | "partial_match"
  | "not_verified";

export type EvidenceRelevance = "high" | "medium" | "low";

export type CredibilityLevel = "high" | "medium" | "low";

export type SelectedEvidenceItem = {
  theme: string;
  relevance_to_job: EvidenceRelevance;
  match_type: EvidenceMatchType;
  why_it_matters: string;
  candidate_evidence: string[];
  safe_claim: string;
  unsafe_claims_to_avoid: string[];
};

export type MissingOrUnsupportedRequirement = {
  theme: string;
  reason: string;
  safe_positioning_if_any: string;
};

export type ExcludedEvidenceItem = {
  item: string;
  reason: string;
};

export type EvidencePackage = {
  required_profile_summary: {
    target_title: string;
    company: string;
    language: string;
    seniority_expected: string;
    core_requirements: string[];
    secondary_requirements: string[];
    leadership_expectation: string;
    critical_gaps: string[];
  };
  company_context_summary: {
    industry: string[];
    finance_environment: string[];
    regulatory_intensity: "low" | "medium" | "high" | "unknown";
    international_exposure: "low" | "medium" | "high" | "unknown";
    positioning_synergies: string[];
  };
  candidate_positioning: {
    core_profile: string;
    positioning_strategy: string;
    credibility_level: CredibilityLevel;
    tone: "credible_supportive_conservative";
  };
  selected_evidence: SelectedEvidenceItem[];
  missing_or_unsupported_requirements: MissingOrUnsupportedRequirement[];
  excluded_evidence: ExcludedEvidenceItem[];
  document_guidance: {
    cv_focus: string[];
    cover_letter_focus: string[];
    keywords_to_use_if_supported: string[];
    keywords_to_avoid_if_unverified: string[];
    narrative_direction: string;
     };
};

    export type SelectEvidenceRequestBody = {
  candidateProfile: CandidateProfile;
  jobProfile: JobProfile;
  requiredProfile: RequiredProfile;
  companyContext?: CompanyContext;
  outputLanguage?: string;
  };