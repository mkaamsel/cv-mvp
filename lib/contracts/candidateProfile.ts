/**
 * Canonical CandidateProfile contract — schema v2.
 *
 * Every prompt variant in the optimisation tournament must produce output
 * that conforms to this type. This is the source of truth for the tournament
 * layer. Production types live in lib/profile/profile-store.ts.
 *
 * v2 additions: language fields, correction log, schema version.
 */

export const SCHEMA_VERSION = 2;

// ── Supported output languages ───────────────────────────────────────────────

export type SupportedOutputLanguage = "de" | "en" | "es";

// ── Correction log ───────────────────────────────────────────────────────────

export type CorrectionSourceType = "document" | "user_prompt" | "ai_extracted";

export type CorrectionLogEntry = {
  id: string;
  timestamp: string;
  field: string;
  action: "add" | "remove" | "update";
  value: unknown;
  userInstruction: string;
  sourceType: CorrectionSourceType;
  sourceDetail: string;
  language: string;
};

// ── Core profile types ───────────────────────────────────────────────────────

export type CandidateProfileRole = {
  title: string;
  company: string | null;
  startDate: string | null;
  endDate: string | null;
  isCurrent: boolean;
  location: string | null;
  achievements: string[];
};

export type CandidateProfileLanguage = {
  language: string;
  proficiency: string | null;
};

export type CandidateProfileEducation = {
  degree: string;
  field: string | null;
  institution: string | null;
  endDate: string | null;
};

export type CandidateProfileCertification = {
  name: string;
  issuer: string | null;
  date: string | null;
};

export type CandidateProfileVerifiedClaim = {
  claim: string;
  evidence: string[];
  confidence: "high" | "medium";
};

export type CandidateProfile = {
  // Schema version — increment when breaking changes are made.
  schemaVersion?: number;

  // Core identity
  fullName: string | null;
  headline: string | null;
  summary: string | null;

  // Experience and skills
  roles: CandidateProfileRole[];
  coreSkills: string[];
  tools: string[];
  standards: string[];
  industries: string[];

  // Qualifications
  languages: CandidateProfileLanguage[];
  education: CandidateProfileEducation[];
  certifications: CandidateProfileCertification[];

  // Signals and positioning
  leadershipSignals: string[];
  strengths: string[];
  constraints: string[];
  verifiedClaims: CandidateProfileVerifiedClaim[];
  openQuestions: string[];

  // Language system (v2)
  detectedInputLanguages?: string[];
  interactionLanguage?: string;
  preferredOutputLanguage?: string;
  outputLanguageLockedByUser?: boolean;

  // Correction log (v2) — user corrections are highest authority.
  // AI re-extraction never overwrites entries logged here.
  correctionLog?: CorrectionLogEntry[];
};

// ── Richness metrics ─────────────────────────────────────────────────────────

export type ProfileRichnessMetrics = {
  roleCount: number;
  achievementCount: number;
  coreSkillCount: number;
  toolCount: number;
  verifiedClaimCount: number;
  languageCount: number;
  leadershipSignalCount: number;
  strengthCount: number;
  hasSummary: boolean;
  hasHeadline: boolean;
};

export function deriveRichnessMetrics(
  profile: CandidateProfile,
): ProfileRichnessMetrics {
  return {
    roleCount: profile.roles.length,
    achievementCount: profile.roles.reduce(
      (sum, r) => sum + r.achievements.length,
      0,
    ),
    coreSkillCount: profile.coreSkills.length,
    toolCount: profile.tools.length,
    verifiedClaimCount: profile.verifiedClaims.length,
    languageCount: profile.languages.length,
    leadershipSignalCount: profile.leadershipSignals.length,
    strengthCount: profile.strengths.length,
    hasSummary: Boolean(profile.summary),
    hasHeadline: Boolean(profile.headline),
  };
}

/** Schema string embedded in every tournament prompt for AI output validation. */
export const CANDIDATE_PROFILE_SCHEMA = `{
  "fullName": string | null,
  "headline": string | null,
  "summary": string | null,
  "roles": [
    {
      "title": string,
      "company": string | null,
      "startDate": string | null,
      "endDate": string | null,
      "isCurrent": boolean,
      "location": string | null,
      "achievements": string[]
    }
  ],
  "coreSkills": string[],
  "tools": string[],
  "standards": string[],
  "industries": string[],
  "languages": [{ "language": string, "proficiency": string | null }],
  "education": [
    {
      "degree": string,
      "field": string | null,
      "institution": string | null,
      "endDate": string | null
    }
  ],
  "certifications": [
    { "name": string, "issuer": string | null, "date": string | null }
  ],
  "leadershipSignals": string[],
  "strengths": string[],
  "constraints": string[],
  "verifiedClaims": [
    { "claim": string, "evidence": string[], "confidence": "high" | "medium" }
  ],
  "openQuestions": string[]
}`;
