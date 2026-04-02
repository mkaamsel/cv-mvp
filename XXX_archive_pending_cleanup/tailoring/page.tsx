"use client";

import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { designTokens } from "@/lib/design/tokens";

const t = designTokens;

type StructuredJob = {
  companyName: string;
  jobTitle: string;
  location: string;
  responsibilities: string[];
  requirements: string[];
  summary: string;
};

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

type StoredDocument = {
  fileName: string;
  kind:
    | "primary_cv"
    | "additional_cv"
    | "arbeitszeugnis"
    | "certificate"
    | "user_note"
    | "other";
  text: string;
  description?: string;
  isPrimary?: boolean;
};

type TailoringExtractResponse = {
  structuredJob: StructuredJob;
  extractedText: string;
  source:
    | "pasted-text"
    | "direct-fetch"
    | "readable-fallback"
    | "direct-fetch+user-text-fallback"
    | "readable-fallback+user-text-fallback"
    | "blocked-or-thin-content";
  normalizedUrl?: string;
  warnings?: string[];
  error?: string;
};

type CompanyContext = {
  industry: string[];
  financeEnvironment: string[];
  reportingEnvironment: string[];
  leadershipScope: string[];
  operatingSignals: string[];
  cultureSignals: string[];
  summary: string;
};

type CompanyContextResponse =
  | {
      ok: true;
      companyContext: CompanyContext;
      meta: {
        model: string;
        locale: "en" | "de";
      };
    }
  | {
      ok: false;
      error: string;
    };

type RequirementAnalysisItem = {
  requirement: string;
  importance: "blocker" | "core" | "supporting" | "preferred";
  matchStatus: "matched" | "adjacent" | "weak" | "missing";
  notes: string;
};

type ApplicationRecommendationResponse =
  | {
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
    }
  | {
      ok: false;
      error: string;
    };

type TailoringRunState = {
  structuredJob: StructuredJob | null;
  extractedText: string;
  extractionSource: string;
  normalizedUrl: string;
  warnings: string[];
  companyContext: CompanyContext | null;
  applicationRecommendation: ApplicationRecommendationResponse | null;
  outputLanguage: "de" | "en";
  jobUrl: string;
  jobDescription: string;
};

const CANDIDATE_PROFILE_STORAGE_KEY = "cvmvp_candidate_profile";
const CANDIDATE_PROFILE_META_STORAGE_KEY = "cvmvp_candidate_profile_meta";
const CANDIDATE_DOCUMENTS_STORAGE_KEY = "cvmvp_candidate_documents";
const TAILORING_STATE_STORAGE_KEY = "cvmvp_tailoring_state";

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text);
}

function downloadTxt(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function normalizeRole(input: unknown): CandidateRole | null {
  if (!input || typeof input !== "object") return null;
  const role = input as Record<string, unknown>;

  return {
    title: typeof role.title === "string" ? role.title : "",
    company: asString(role.company),
    startDate: asString(role.startDate),
    endDate: asString(role.endDate),
    isCurrent: Boolean(role.isCurrent),
    location: asString(role.location),
    achievements: asStringArray(role.achievements),
  };
}

function normalizeLanguage(input: unknown): CandidateLanguage | null {
  if (!input || typeof input !== "object") return null;
  const item = input as Record<string, unknown>;

  const language = typeof item.language === "string" ? item.language : "";
  if (!language) return null;

  return {
    language,
    proficiency: asString(item.proficiency),
  };
}

function normalizeEducation(input: unknown): CandidateEducation | null {
  if (!input || typeof input !== "object") return null;
  const item = input as Record<string, unknown>;

  const degree = typeof item.degree === "string" ? item.degree : "";
  if (!degree) return null;

  return {
    degree,
    field: asString(item.field),
    institution: asString(item.institution),
    endDate: asString(item.endDate),
  };
}

function normalizeCertification(input: unknown): CandidateCertification | null {
  if (!input || typeof input !== "object") return null;
  const item = input as Record<string, unknown>;

  const name = typeof item.name === "string" ? item.name : "";
  if (!name) return null;

  return {
    name,
    issuer: asString(item.issuer),
    date: asString(item.date),
  };
}

function normalizeVerifiedClaim(input: unknown): VerifiedClaim | null {
  if (!input || typeof input !== "object") return null;
  const item = input as Record<string, unknown>;

  const claim = typeof item.claim === "string" ? item.claim : "";
  if (!claim) return null;

  return {
    claim,
    evidence: asStringArray(item.evidence),
    confidence: item.confidence === "medium" ? "medium" : "high",
  };
}

function normalizeStoredCandidateProfile(input: unknown): CandidateProfile {
  const raw =
    input && typeof input === "object" ? (input as Record<string, unknown>) : {};

  const legacyRoles = Array.isArray(raw.roles) ? raw.roles : [];
  const newExperience = Array.isArray(raw.experience) ? raw.experience : [];

  return {
    fullName: asString(raw.fullName),
    headline: asString(raw.headline),
    summary: asString(raw.summary),
    roles: [...legacyRoles, ...newExperience]
      .map(normalizeRole)
      .filter((item): item is CandidateRole => Boolean(item)),
    coreSkills: [...asStringArray(raw.coreSkills), ...asStringArray(raw.skills)],
    tools: asStringArray(raw.tools),
    standards: [...asStringArray(raw.standards), ...asStringArray(raw.domains)],
    industries: asStringArray(raw.industries),
    languages: (Array.isArray(raw.languages) ? raw.languages : [])
      .map(normalizeLanguage)
      .filter((item): item is CandidateLanguage => Boolean(item)),
    education: (Array.isArray(raw.education) ? raw.education : [])
      .map(normalizeEducation)
      .filter((item): item is CandidateEducation => Boolean(item)),
    certifications: (Array.isArray(raw.certifications) ? raw.certifications : [])
      .map(normalizeCertification)
      .filter((item): item is CandidateCertification => Boolean(item)),
    leadershipSignals: asStringArray(raw.leadershipSignals),
    strengths: asStringArray(raw.strengths),
    constraints: asStringArray(raw.constraints),
    verifiedClaims: (Array.isArray(raw.verifiedClaims) ? raw.verifiedClaims : [])
      .map(normalizeVerifiedClaim)
      .filter((item): item is VerifiedClaim => Boolean(item)),
    openQuestions: asStringArray(raw.openQuestions),
  };
}

function normalizeStoredDocuments(input: unknown): StoredDocument[] {
  if (!Array.isArray(input)) return [];

  return input
    .map((item) => {
      if (!item || typeof item !== "object") return null;

      const raw = item as Record<string, unknown>;
      const fileName =
        typeof raw.fileName === "string"
          ? raw.fileName
          : typeof raw.name === "string"
            ? raw.name
            : "Document";
      const kind =
        raw.kind === "primary_cv" ||
        raw.kind === "additional_cv" ||
        raw.kind === "arbeitszeugnis" ||
        raw.kind === "certificate" ||
        raw.kind === "user_note" ||
        raw.kind === "other"
          ? raw.kind
          : "other";

      const document: StoredDocument = {
        fileName,
        kind,
        text: typeof raw.text === "string" ? raw.text : "",
        description: typeof raw.description === "string" ? raw.description : undefined,
        isPrimary: Boolean(raw.isPrimary),
      };

      return document;
    })
    .filter((item): item is StoredDocument => Boolean(item));
}

function buildCandidateProfileText(profile: CandidateProfile): string {
  return [
    `Full name: ${profile.fullName || "-"}`,
    `Headline: ${profile.headline || "-"}`,
    "",
    "Summary:",
    profile.summary || "-",
    "",
    "Roles:",
    ...(profile.roles.length
      ? profile.roles.map((role) => {
          const company = role.company || "-";
          const dates = `${role.startDate || "-"} – ${
            role.isCurrent ? "Present" : role.endDate || "-"
          }`;
          return `- ${role.title || "-"} | ${company} | ${dates}`;
        })
      : ["-"]),
    "",
    "Core skills:",
    profile.coreSkills.length ? profile.coreSkills.join(", ") : "-",
    "",
    "Tools:",
    profile.tools.length ? profile.tools.join(", ") : "-",
    "",
    "Standards:",
    profile.standards.length ? profile.standards.join(", ") : "-",
    "",
    "Industries:",
    profile.industries.length ? profile.industries.join(", ") : "-",
    "",
    "Languages:",
    profile.languages.length
      ? profile.languages
          .map((item) =>
            item.proficiency ? `${item.language} (${item.proficiency})` : item.language
          )
          .join(", ")
      : "-",
    "",
    "Education:",
    ...(profile.education.length
      ? profile.education.map((item) => {
          const degree = item.degree || "-";
          const field = item.field ? `, ${item.field}` : "";
          const institution = item.institution ? ` | ${item.institution}` : "";
          const endDate = item.endDate ? ` | ${item.endDate}` : "";
          return `- ${degree}${field}${institution}${endDate}`;
        })
      : ["-"]),
    "",
    "Certifications:",
    ...(profile.certifications.length
      ? profile.certifications.map((item) => {
          const issuer = item.issuer ? ` | ${item.issuer}` : "";
          const date = item.date ? ` | ${item.date}` : "";
          return `- ${item.name}${issuer}${date}`;
        })
      : ["-"]),
  ].join("\n");
}

function buildDocumentsFallbackText(documents: StoredDocument[]): string {
  return documents
    .filter((doc) => doc.text.trim())
    .map((doc) => {
      const title = `${doc.fileName}${doc.description ? ` (${doc.description})` : ""}`;
      return `${title}\n${doc.text.trim()}`;
    })
    .join("\n\n---\n\n");
}

function buildStructuredJobText(job: StructuredJob) {
  return [
    `Company: ${job.companyName || "-"}`,
    `Job title: ${job.jobTitle || "-"}`,
    `Location: ${job.location || "-"}`,
    "",
    "Responsibilities:",
    ...(job.responsibilities.length
      ? job.responsibilities.map((item) => `- ${item}`)
      : ["-"]),
    "",
    "Requirements:",
    ...(job.requirements.length
      ? job.requirements.map((item) => `- ${item}`)
      : ["-"]),
    "",
    "Summary:",
    job.summary || "-",
  ].join("\n");
}

function normalizeOutputLanguage(value: string): "de" | "en" {
  const normalized = value.trim().toLowerCase();

  if (normalized === "de" || normalized === "deutsch" || normalized === "german") {
    return "de";
  }

  return "en";
}

function getSourceLabel(source: string) {
  switch (source) {
    case "pasted-text":
      return "Pasted text";
    case "direct-fetch":
      return "Direct fetch";
    case "readable-fallback":
      return "Readable fallback";
    case "direct-fetch+user-text-fallback":
      return "Direct fetch + user text fallback";
    case "readable-fallback+user-text-fallback":
      return "Readable fallback + user text fallback";
    case "blocked-or-thin-content":
      return "Blocked or thin content";
    default:
      return source || "-";
  }
}

function getRecommendationLabel(
  value:
    | "apply_confidently"
    | "apply_with_care"
    | "borderline"
    | "not_recommended"
) {
  switch (value) {
    case "apply_confidently":
      return "Apply confidently";
    case "apply_with_care":
      return "Apply with care";
    case "borderline":
      return "Borderline";
    case "not_recommended":
      return "Not recommended";
    default:
      return value;
  }
}

function getRecommendationTone(
  value:
    | "apply_confidently"
    | "apply_with_care"
    | "borderline"
    | "not_recommended"
) {
  switch (value) {
    case "apply_confidently":
      return {
        border: t.colors.success,
        background: t.colors.accentGreen,
      };
    case "apply_with_care":
      return {
        border: t.colors.border,
        background: t.colors.primarySoft,
      };
    case "borderline":
      return {
        border: t.colors.warning,
        background: t.colors.accentYellow,
      };
    case "not_recommended":
      return {
        border: t.colors.danger,
        background: "#fff5f5",
      };
    default:
      return {
        border: t.colors.border,
        background: t.colors.surface,
      };
  }
}

function saveTailoringState(state: TailoringRunState) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(TAILORING_STATE_STORAGE_KEY, JSON.stringify(state));
}

function buildRecommendationSnapshot(
  applicationRecommendation: ApplicationRecommendationResponse | null
) {
  if (!applicationRecommendation || !applicationRecommendation.ok) return null;

  return {
    label: getRecommendationLabel(applicationRecommendation.applicationRecommendation),
    advisorMessage: applicationRecommendation.advisorMessage,
    reasoningSummary: applicationRecommendation.reasoningSummary,
  };
}

function PageHeader(props: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <header style={{ marginBottom: 24 }}>
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          padding: "7px 11px",
          borderRadius: 999,
          background: t.colors.primarySoft,
          color: t.colors.textOnPrimary,
          fontSize: 12,
          fontWeight: 800,
          marginBottom: 14,
        }}
      >
        {props.eyebrow}
      </div>

      <h1
        style={{
          margin: 0,
          fontSize: 32,
          lineHeight: 1.12,
          letterSpacing: "-0.03em",
          color: t.colors.textPrimary,
        }}
      >
        {props.title}
      </h1>

      <p
        style={{
          margin: "12px 0 0",
          maxWidth: 1040,
          fontSize: 15,
          lineHeight: 1.7,
          color: t.colors.textSecondary,
        }}
      >
        {props.description}
      </p>
    </header>
  );
}

function Section(props: { children: ReactNode }) {
  return (
    <section
      style={{
        maxWidth: 1380,
        margin: "0 auto",
        padding: "28px 20px 40px",
      }}
    >
      {props.children}
    </section>
  );
}

function Card(props: { children: ReactNode }) {
  return (
    <section
      style={{
        background: t.colors.surface,
        border: `1px solid ${t.colors.border}`,
        borderRadius: t.radius.lg,
        boxShadow: t.shadow.md,
        padding: 24,
      }}
    >
      {props.children}
    </section>
  );
}

function ContextList(props: { title: string; items: string[] }) {
  return (
    <div style={subCardStyle}>
      <h3 style={smallHeadingStyle}>{props.title}</h3>

      <ul style={listStyle}>
        {props.items.length ? (
          props.items.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)
        ) : (
          <li>-</li>
        )}
      </ul>
    </div>
  );
}

export default function TailoringPage() {
  const router = useRouter();

  const [candidateName, setCandidateName] = useState("");
  const [cvText, setCvText] = useState("");
  const [candidateProfile, setCandidateProfile] = useState<CandidateProfile | null>(null);
  const [inputDocuments, setInputDocuments] = useState<StoredDocument[]>([]);

  const [jobUrl, setJobUrl] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [outputLanguage, setOutputLanguage] = useState("Deutsch");

  const [extractingJob, setExtractingJob] = useState(false);
  const [analyzingRecommendation, setAnalyzingRecommendation] = useState(false);
  const [error, setError] = useState("");

  const [structuredJob, setStructuredJob] = useState<StructuredJob | null>(null);
  const [extractedText, setExtractedText] = useState("");
  const [extractionSource, setExtractionSource] = useState("");
  const [normalizedUrl, setNormalizedUrl] = useState("");
  const [warnings, setWarnings] = useState<string[]>([]);

  const [companyContext, setCompanyContext] = useState<CompanyContext | null>(null);
  const [applicationRecommendation, setApplicationRecommendation] =
    useState<ApplicationRecommendationResponse | null>(null);

  const [profileLoaded, setProfileLoaded] = useState(false);
  const [profileMetaText, setProfileMetaText] = useState("");
  const [showInsights, setShowInsights] = useState(false);

  const canExtract = useMemo(() => {
    return Boolean(jobUrl.trim() || jobDescription.trim());
  }, [jobUrl, jobDescription]);

  const normalizedLanguage = useMemo(
    () => normalizeOutputLanguage(outputLanguage),
    [outputLanguage]
  );

  const recommendationSnapshot = useMemo(() => {
    return buildRecommendationSnapshot(applicationRecommendation);
  }, [applicationRecommendation]);

  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      if (typeof window === "undefined") return;

      try {
        let loadedProfile: CandidateProfile | null = null;
        let loadedProfileMeta = "";
        let loadedDocuments: StoredDocument[] = [];

        const response = await fetch("/api/profile/load", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        }).catch(() => null);

        if (response?.ok) {
          const data = (await response.json().catch(() => null)) as
            | {
                candidateProfile?: unknown;
                profile?: unknown;
                candidateProfileMeta?: string | null;
                profileMeta?: string | null;
                documents?: unknown;
              }
            | null;

          const apiProfile = data?.candidateProfile ?? data?.profile ?? null;
          const apiDocuments = normalizeStoredDocuments(data?.documents ?? []);

          if (apiProfile) {
            loadedProfile = normalizeStoredCandidateProfile(
              typeof apiProfile === "string" ? JSON.parse(apiProfile) : apiProfile
            );
            loadedProfileMeta =
              data?.candidateProfileMeta ||
              data?.profileMeta ||
              loadedProfile.headline ||
              loadedProfile.fullName ||
              "";
            loadedDocuments = apiDocuments;

            try {
              sessionStorage.setItem(
                CANDIDATE_PROFILE_STORAGE_KEY,
                typeof apiProfile === "string" ? apiProfile : JSON.stringify(apiProfile)
              );
              sessionStorage.setItem(CANDIDATE_PROFILE_META_STORAGE_KEY, loadedProfileMeta);
              sessionStorage.setItem(
                CANDIDATE_DOCUMENTS_STORAGE_KEY,
                JSON.stringify(apiDocuments)
              );
            } catch {
              // ignore session storage write failure
            }
          }
        }

        if (!loadedProfile) {
          const rawProfile = sessionStorage.getItem(CANDIDATE_PROFILE_STORAGE_KEY);
          const rawMeta = sessionStorage.getItem(CANDIDATE_PROFILE_META_STORAGE_KEY);
          const rawDocuments = sessionStorage.getItem(CANDIDATE_DOCUMENTS_STORAGE_KEY);

          if (!rawProfile && !rawDocuments) {
            router.push("/profile");
            return;
          }

          if (rawProfile) {
            loadedProfile = normalizeStoredCandidateProfile(JSON.parse(rawProfile));
          }

          loadedProfileMeta =
            rawMeta || loadedProfile?.headline || loadedProfile?.fullName || "";

          if (rawDocuments) {
            loadedDocuments = normalizeStoredDocuments(JSON.parse(rawDocuments));
          }
        }

        if (!isMounted) return;

        if (loadedProfile) {
          setCandidateProfile(loadedProfile);
          setCandidateName(loadedProfile.fullName || "");
          setCvText(buildCandidateProfileText(loadedProfile));
          setProfileLoaded(true);
        } else {
          setCandidateProfile(null);
          setCandidateName("");
          setCvText(
            loadedDocuments.length ? buildDocumentsFallbackText(loadedDocuments) : ""
          );
          setProfileLoaded(false);
        }

        setProfileMetaText(loadedProfileMeta);
        setInputDocuments(loadedDocuments);
      } catch {
        if (!isMounted) return;

        try {
          const rawProfile = sessionStorage.getItem(CANDIDATE_PROFILE_STORAGE_KEY);
          const rawMeta = sessionStorage.getItem(CANDIDATE_PROFILE_META_STORAGE_KEY);
          const rawDocuments = sessionStorage.getItem(CANDIDATE_DOCUMENTS_STORAGE_KEY);

          if (!rawProfile && !rawDocuments) {
            router.push("/profile");
            return;
          }

          let fallbackProfile: CandidateProfile | null = null;
          if (rawProfile) {
            fallbackProfile = normalizeStoredCandidateProfile(JSON.parse(rawProfile));
          }

          const fallbackDocuments = rawDocuments
            ? normalizeStoredDocuments(JSON.parse(rawDocuments))
            : [];

          if (fallbackProfile) {
            setCandidateProfile(fallbackProfile);
            setCandidateName(fallbackProfile.fullName || "");
            setCvText(buildCandidateProfileText(fallbackProfile));
            setProfileLoaded(true);
          } else {
            setCandidateProfile(null);
            setCandidateName("");
            setCvText(
              fallbackDocuments.length
                ? buildDocumentsFallbackText(fallbackDocuments)
                : ""
            );
            setProfileLoaded(false);
          }

          setProfileMetaText(
            rawMeta || fallbackProfile?.headline || fallbackProfile?.fullName || ""
          );
          setInputDocuments(fallbackDocuments);
        } catch {
          setCandidateProfile(null);
          setCandidateName("");
          setCvText("");
          setProfileLoaded(false);
          setProfileMetaText("");
          setInputDocuments([]);
          router.push("/profile");
        }
      }
    }

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [router]);

  useEffect(() => {
    const state: TailoringRunState = {
      structuredJob,
      extractedText,
      extractionSource,
      normalizedUrl,
      warnings,
      companyContext,
      applicationRecommendation,
      outputLanguage: normalizedLanguage,
      jobUrl,
      jobDescription,
    };

    saveTailoringState(state);
  }, [
    structuredJob,
    extractedText,
    extractionSource,
    normalizedUrl,
    warnings,
    companyContext,
    applicationRecommendation,
    normalizedLanguage,
    jobUrl,
    jobDescription,
  ]);

  async function handleJobExtraction() {
    if (!jobUrl.trim() && !jobDescription.trim()) {
      setError("Please provide either a job URL or a job description.");
      return;
    }

    try {
      setExtractingJob(true);
      setAnalyzingRecommendation(false);
      setError("");
      setStructuredJob(null);
      setExtractedText("");
      setExtractionSource("");
      setNormalizedUrl("");
      setWarnings([]);
      setCompanyContext(null);
      setApplicationRecommendation(null);

      const res = await fetch("/api/tailoring", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: jobUrl.trim() || undefined,
          jobDescription: jobDescription.trim() || undefined,
          outputLanguage: normalizedLanguage,
        }),
      });

      const data = (await res.json()) as TailoringExtractResponse;

      console.log("TAILORING EXTRACT RESPONSE");
      console.log(data);

      if (!res.ok) {
        setError(data?.error || "Could not extract job description.");
        setStructuredJob(data?.structuredJob || null);
        setExtractedText(data?.extractedText || "");
        setExtractionSource(data?.source || "");
        setNormalizedUrl(data?.normalizedUrl || "");
        setWarnings(data?.warnings || []);
        return;
      }

      setStructuredJob(data.structuredJob);
      setExtractedText(data.extractedText || "");
      setExtractionSource(data.source || "");
      setNormalizedUrl(data.normalizedUrl || "");
      setWarnings(data.warnings || []);

      if (data.extractedText) {
        setJobDescription(data.extractedText);
      }

      setAnalyzingRecommendation(true);

      const contextRes = await fetch("/api/company-context", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          locale: normalizedLanguage,
          structuredJob: data.structuredJob,
          extractedText: data.extractedText || "",
        }),
      });

      const contextData = (await contextRes.json()) as CompanyContextResponse;

      console.log("COMPANY CONTEXT RESPONSE");
      console.log(contextData);

      let resolvedCompanyContext: CompanyContext | null = null;

      if (contextRes.ok && contextData.ok) {
        resolvedCompanyContext = contextData.companyContext;
        setCompanyContext(contextData.companyContext);
      } else {
        setCompanyContext(null);
      }

      if (candidateProfile) {
        const recommendationRes = await fetch("/api/application-recommendation", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            locale: normalizedLanguage,
            candidateProfile,
            structuredJob: data.structuredJob,
            companyContext: resolvedCompanyContext,
            extractedText: data.extractedText || "",
          }),
        });

        const recommendationData =
          (await recommendationRes.json()) as ApplicationRecommendationResponse;

        console.log("APPLICATION RECOMMENDATION RESPONSE");
        console.log(recommendationData);

        if (recommendationData.ok) {
          console.log("REQUIREMENTS ANALYSIS");
          console.log(recommendationData.requirementsAnalysis);

          console.log("POSITIONING STRATEGY");
          console.log(recommendationData.positioningStrategy);

          console.log("STRONG MATCHES");
          console.log(recommendationData.strongMatches);

          console.log("STRETCH MATCHES");
          console.log(recommendationData.stretchMatches);

          console.log("RISK AREAS");
          console.log(recommendationData.riskAreas);

          console.log("BLOCKERS");
          console.log(recommendationData.blockers);
        }

        setApplicationRecommendation(recommendationData);
      }
    } catch (caughtError) {
      console.error("TAILORING PAGE ERROR");
      console.error(caughtError);
      setError("Could not extract job description.");
    } finally {
      setExtractingJob(false);
      setAnalyzingRecommendation(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: t.colors.background,
        color: t.colors.textPrimary,
      }}
    >
      <Section>
        <PageHeader
          eyebrow="Job"
          title="Analyse the role before generating final documents"
          description="This step extracts the role, structures the vacancy, and prepares the application context. Final CV and cover letter generation should happen in the next step, not here."
        />

        <Card>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 16,
            }}
          >
            <div>
              <h2 style={sectionTitleStyle}>Candidate profile handoff</h2>
              <p style={sectionCopyStyle}>
                This page loads the candidate profile built in the previous step.
              </p>

              <div
                style={{
                  display: "flex",
                  gap: 10,
                  marginTop: 14,
                  flexWrap: "wrap",
                }}
              >
                <button
                  type="button"
                  onClick={() => router.push("/profile")}
                  style={secondaryButtonStyle}
                >
                  Update / rebuild profile
                </button>

                <button
                  type="button"
                  onClick={() => router.push("/profile")}
                  style={secondaryButtonStyle}
                >
                  Add CV or document
                </button>
              </div>
            </div>

            <div style={infoBoxStyle}>
              {profileLoaded ? (
                <span>
                  Candidate profile loaded successfully
                  {profileMetaText ? ` · ${profileMetaText}` : ""}
                </span>
              ) : (
                <span>
                  No stored candidate profile found yet. You can still continue manually.
                </span>
              )}
            </div>
          </div>
        </Card>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 20,
            marginTop: 20,
          }}
        >
          <Card>
            <label style={labelStyle}>Candidate name</label>
            <input
              type="text"
              value={candidateName}
              onChange={(e) => setCandidateName(e.target.value)}
              placeholder="Enter your name"
              style={{ ...inputStyle, marginBottom: 16 }}
            />

            <label style={labelStyle}>Candidate profile or canonical CV lines</label>
            <textarea
              value={cvText}
              onChange={(e) => setCvText(e.target.value)}
              placeholder="Candidate profile or relevant canonical CV content"
              style={{ ...textareaStyle, minHeight: 320 }}
            />

            <p style={{ ...mutedTextStyle, marginTop: 10 }}>
              This field is prefilled from the profile builder when a stored candidate profile
              is available.
            </p>

            {inputDocuments.length > 0 ? (
              <div style={{ ...subCardStyle, marginTop: 16 }}>
                <div style={smallHeadingStyle}>Supporting documents loaded</div>
                <ul style={listStyle}>
                  {inputDocuments.map((doc, index) => (
                    <li key={`${doc.fileName}-${index}`}>
                      {doc.fileName}
                      {doc.description ? ` · ${doc.description}` : ""}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </Card>

          <Card>
            <label style={labelStyle}>Job posting URL</label>

            <input
              type="text"
              value={jobUrl}
              onChange={(e) => setJobUrl(e.target.value)}
              placeholder="Paste LinkedIn, company career page, or other job URL"
              style={inputStyle}
            />

            <p style={{ ...mutedTextStyle, marginTop: 10 }}>
              If scraping is blocked, pasted job text below will act as fallback.
            </p>

            <label style={{ ...labelStyle, marginTop: 20 }}>Job description</label>
            <textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the job description here if no clean URL is available"
              style={{ ...textareaStyle, minHeight: 320 }}
            />

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 16,
                marginTop: 20,
                alignItems: "end",
              }}
            >
              <div>
                <label style={labelStyle}>Output language</label>
                <select
                  value={normalizedLanguage}
                  onChange={(e) =>
                    setOutputLanguage(e.target.value === "de" ? "Deutsch" : "English")
                  }
                  style={inputStyle}
                >
                  <option value="de">Deutsch</option>
                  <option value="en">English</option>
                </select>
              </div>

              <button
                type="button"
                onClick={handleJobExtraction}
                disabled={!canExtract || extractingJob || analyzingRecommendation}
                style={{
                  ...primaryButtonStyle,
                  width: "100%",
                  opacity: !canExtract || extractingJob || analyzingRecommendation ? 0.65 : 1,
                  cursor:
                    !canExtract || extractingJob || analyzingRecommendation
                      ? "not-allowed"
                      : "pointer",
                }}
              >
                {extractingJob
                  ? "Extracting..."
                  : analyzingRecommendation
                    ? "Analyzing..."
                    : "Analyse job"}
              </button>
            </div>

            {error ? <div style={{ ...errorBoxStyle, marginTop: 14 }}>{error}</div> : null}

            {extractionSource ? (
              <div style={{ ...infoBoxStyle, marginTop: 14 }}>
                <div>
                  Extraction source: <strong>{getSourceLabel(extractionSource)}</strong>
                </div>

                {normalizedUrl ? (
                  <div style={{ marginTop: 4, wordBreak: "break-word" }}>
                    Normalized URL: <strong>{normalizedUrl}</strong>
                  </div>
                ) : null}
              </div>
            ) : null}

            {warnings.length > 0 ? (
              <div style={{ ...infoBoxStyle, marginTop: 14 }}>
                <div style={{ fontWeight: 700, color: t.colors.textPrimary, marginBottom: 6 }}>
                  Warnings
                </div>
                <ul style={{ margin: 0, paddingLeft: 18, color: t.colors.textSecondary }}>
                  {warnings.map((warning, index) => (
                    <li key={`${warning}-${index}`}>{warning}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </Card>
        </div>

        {(structuredJob || recommendationSnapshot) ? (
          <div style={{ marginTop: 20 }}>
            <Card>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: 16,
                }}
              >
                <div>
                  <h2 style={sectionTitleStyle}>Role summary</h2>
                  <p style={sectionCopyStyle}>
                    This is the candidate-facing result of the Job step: a structured role,
                    a clean understanding of the vacancy, and a high-level recommendation
                    snapshot.
                  </p>
                </div>

                {recommendationSnapshot ? (
                  <div
                    style={{
                      ...pillStyle,
                      border: `1px solid ${
                        applicationRecommendation && applicationRecommendation.ok
                          ? getRecommendationTone(
                              applicationRecommendation.applicationRecommendation
                            ).border
                          : t.colors.border
                      }`,
                      background:
                        applicationRecommendation && applicationRecommendation.ok
                          ? getRecommendationTone(
                              applicationRecommendation.applicationRecommendation
                            ).background
                          : t.colors.surface,
                    }}
                  >
                    {recommendationSnapshot.label}
                  </div>
                ) : (
                  <div style={infoBoxStyle}>Structured job ready</div>
                )}
              </div>

              {recommendationSnapshot ? (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 20,
                    marginTop: 20,
                  }}
                >
                  <div style={subCardStyle}>
                    <div style={smallHeadingStyle}>Advisor message</div>
                    <p style={{ ...sectionCopyStyle, marginTop: 10 }}>
                      {recommendationSnapshot.advisorMessage}
                    </p>
                  </div>

                  <div style={subCardStyle}>
                    <div style={smallHeadingStyle}>Recommendation summary</div>
                    <p style={{ ...sectionCopyStyle, marginTop: 10 }}>
                      {recommendationSnapshot.reasoningSummary}
                    </p>
                  </div>
                </div>
              ) : null}

              <div
                style={{
                  display: "flex",
                  gap: 10,
                  flexWrap: "wrap",
                  marginTop: 20,
                }}
              >
                <button
                  type="button"
                  onClick={() => router.push("/test-generate")}
                  disabled={!structuredJob}
                  style={{
                    ...primaryButtonStyle,
                    opacity: structuredJob ? 1 : 0.65,
                    cursor: structuredJob ? "pointer" : "not-allowed",
                  }}
                >
                  Continue to final documents
                </button>

                <button
                  type="button"
                  onClick={() => setShowInsights((prev) => !prev)}
                  style={secondaryButtonStyle}
                >
                  {showInsights ? "Hide insights" : "Show insights"}
                </button>
              </div>
            </Card>
          </div>
        ) : null}

        <div style={{ marginTop: 20 }}>
          <Card>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <div>
                <h2 style={sectionTitleStyle}>Structured job output</h2>
                <p style={sectionCopyStyle}>
                  This is the cleaned, structured result from the extraction route.
                </p>
              </div>

              {structuredJob ? (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(JSON.stringify(structuredJob, null, 2))}
                    style={secondaryButtonStyle}
                  >
                    Copy JSON
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      downloadTxt("structured-job.txt", buildStructuredJobText(structuredJob))
                    }
                    style={secondaryButtonStyle}
                  >
                    Download TXT
                  </button>
                </div>
              ) : null}
            </div>

            <div style={{ ...subCardStyle, marginTop: 20, minHeight: 220 }}>
              {!structuredJob ? (
                <div style={sectionCopyStyle}>
                  No structured job data yet. Paste a URL or job description and click{" "}
                  <strong>Analyse job</strong>.
                </div>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 20,
                  }}
                >
                  <div>
                    <h3 style={smallHeadingStyle}>Core fields</h3>

                    <div
                      style={{
                        display: "grid",
                        gap: 12,
                        marginTop: 12,
                        color: t.colors.textSecondary,
                      }}
                    >
                      <div>
                        <div style={smallHeadingStyle}>Company</div>
                        <div>{structuredJob.companyName || "-"}</div>
                      </div>

                      <div>
                        <div style={smallHeadingStyle}>Job title</div>
                        <div>{structuredJob.jobTitle || "-"}</div>
                      </div>

                      <div>
                        <div style={smallHeadingStyle}>Location</div>
                        <div>{structuredJob.location || "-"}</div>
                      </div>
                    </div>

                    <div style={{ marginTop: 20 }}>
                      <h3 style={smallHeadingStyle}>Summary</h3>
                      <p style={{ ...sectionCopyStyle, marginTop: 10 }}>
                        {structuredJob.summary || "-"}
                      </p>
                    </div>
                  </div>

                  <div>
                    <div>
                      <h3 style={smallHeadingStyle}>Responsibilities</h3>
                      <ul style={listStyle}>
                        {structuredJob.responsibilities.length ? (
                          structuredJob.responsibilities.map((item, index) => (
                            <li key={`${item}-${index}`}>{item}</li>
                          ))
                        ) : (
                          <li>-</li>
                        )}
                      </ul>
                    </div>

                    <div style={{ marginTop: 20 }}>
                      <h3 style={smallHeadingStyle}>Requirements</h3>
                      <ul style={listStyle}>
                        {structuredJob.requirements.length ? (
                          structuredJob.requirements.map((item, index) => (
                            <li key={`${item}-${index}`}>{item}</li>
                          ))
                        ) : (
                          <li>-</li>
                        )}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>

        {showInsights ? (
          <div style={{ marginTop: 20 }}>
            <Card>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <div>
                  <h2 style={sectionTitleStyle}>Insights</h2>
                  <p style={sectionCopyStyle}>
                    Internal reasoning and support layers belong here, not in the main job
                    flow.
                  </p>
                </div>

                <div style={infoBoxStyle}>Development-facing view</div>
              </div>

              {companyContext ? (
                <div style={{ marginTop: 20 }}>
                  <div style={smallHeadingStyle}>Company and role context</div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 20,
                      marginTop: 12,
                    }}
                  >
                    <ContextList title="Industry" items={companyContext.industry} />
                    <ContextList
                      title="Finance environment"
                      items={companyContext.financeEnvironment}
                    />
                    <ContextList
                      title="Reporting environment"
                      items={companyContext.reportingEnvironment}
                    />
                    <ContextList
                      title="Leadership scope"
                      items={companyContext.leadershipScope}
                    />
                    <ContextList
                      title="Operating signals"
                      items={companyContext.operatingSignals}
                    />
                    <ContextList
                      title="Culture signals"
                      items={companyContext.cultureSignals}
                    />
                  </div>

                  <div style={{ ...subCardStyle, marginTop: 20 }}>
                    <div style={smallHeadingStyle}>Context summary</div>
                    <div style={{ ...sectionCopyStyle, marginTop: 10 }}>
                      {companyContext.summary || "-"}
                    </div>
                  </div>
                </div>
              ) : null}

              {applicationRecommendation && applicationRecommendation.ok ? (
                <div style={{ marginTop: 20 }}>
                  <div style={smallHeadingStyle}>Application recommendation</div>

                  <div style={{ ...subCardStyle, marginTop: 12 }}>
                    <div style={smallHeadingStyle}>Positioning strategy</div>
                    <p style={{ ...sectionCopyStyle, marginTop: 10 }}>
                      {applicationRecommendation.positioningStrategy || "-"}
                    </p>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 20,
                      marginTop: 20,
                    }}
                  >
                    <ContextList
                      title="Strong matches"
                      items={applicationRecommendation.strongMatches}
                    />
                    <ContextList
                      title="Stretch matches"
                      items={applicationRecommendation.stretchMatches}
                    />
                    <ContextList
                      title="Risk areas"
                      items={applicationRecommendation.riskAreas}
                    />
                    <ContextList
                      title="Blockers"
                      items={applicationRecommendation.blockers}
                    />
                  </div>

                  <div style={{ marginTop: 20 }}>
                    <div style={smallHeadingStyle}>Requirement analysis</div>

                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 12,
                        marginTop: 12,
                      }}
                    >
                      {applicationRecommendation.requirementsAnalysis.length ? (
                        applicationRecommendation.requirementsAnalysis.map((item, index) => (
                          <div key={`${item.requirement}-${index}`} style={subCardStyle}>
                            <div style={smallHeadingStyle}>{item.requirement}</div>
                            <div
                              style={{
                                display: "flex",
                                gap: 8,
                                flexWrap: "wrap",
                                marginTop: 10,
                              }}
                            >
                              <span style={smallPillStyle}>
                                Importance: {item.importance}
                              </span>
                              <span style={smallPillStyle}>Match: {item.matchStatus}</span>
                            </div>
                            <p style={{ ...sectionCopyStyle, marginTop: 12 }}>
                              {item.notes || "-"}
                            </p>
                          </div>
                        ))
                      ) : (
                        <div style={subCardStyle}>No requirement analysis returned yet.</div>
                      )}
                    </div>
                  </div>
                </div>
              ) : applicationRecommendation && !applicationRecommendation.ok ? (
                <div style={{ marginTop: 20 }}>
                  <div style={errorBoxStyle}>{applicationRecommendation.error}</div>
                </div>
              ) : null}

              <div style={{ marginTop: 20 }}>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                  }}
                >
                  <div>
                    <h3 style={smallHeadingStyle}>Cleaned extracted text</h3>
                    <p style={sectionCopyStyle}>
                      This normalized text supports extraction and internal interpretation.
                    </p>
                  </div>

                  {extractedText ? (
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(extractedText)}
                        style={secondaryButtonStyle}
                      >
                        Copy text
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          downloadTxt("cleaned-job-description.txt", extractedText)
                        }
                        style={secondaryButtonStyle}
                      >
                        Download TXT
                      </button>
                    </div>
                  ) : null}
                </div>

                <textarea
                  value={extractedText}
                  onChange={(e) => setExtractedText(e.target.value)}
                  spellCheck={false}
                  style={{ ...textareaStyle, minHeight: 320, marginTop: 20 }}
                  placeholder="Cleaned extracted text will appear here."
                />
              </div>
            </Card>
          </div>
        ) : null}
      </Section>
    </main>
  );
}

const sectionTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: 18,
  fontWeight: 800,
  color: t.colors.textPrimary,
};

const sectionCopyStyle: CSSProperties = {
  margin: "6px 0 0",
  fontSize: 14,
  lineHeight: 1.7,
  color: t.colors.textSecondary,
};

const labelStyle: CSSProperties = {
  display: "block",
  marginBottom: 8,
  fontSize: 14,
  fontWeight: 700,
  color: t.colors.textPrimary,
};

const inputStyle: CSSProperties = {
  width: "100%",
  height: 46,
  borderRadius: t.radius.sm,
  border: `1px solid ${t.colors.border}`,
  background: t.colors.surface,
  color: t.colors.textPrimary,
  padding: "0 12px",
  fontSize: 14,
  outline: "none",
};

const textareaStyle: CSSProperties = {
  width: "100%",
  borderRadius: t.radius.md,
  border: `1px solid ${t.colors.border}`,
  background: t.colors.surface,
  color: t.colors.textPrimary,
  padding: "12px 14px",
  fontSize: 14,
  lineHeight: 1.7,
  outline: "none",
  resize: "vertical",
  fontFamily:
    'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
};

const infoBoxStyle: CSSProperties = {
  border: `1px solid ${t.colors.border}`,
  background: t.colors.surface,
  borderRadius: t.radius.md,
  padding: "12px 14px",
  fontSize: 13,
  lineHeight: 1.6,
  color: t.colors.textSecondary,
};

const errorBoxStyle: CSSProperties = {
  border: `1px solid ${t.colors.danger}`,
  background: "#fff5f5",
  borderRadius: t.radius.md,
  padding: "12px 14px",
  fontSize: 14,
  lineHeight: 1.6,
  color: t.colors.textPrimary,
};

const subCardStyle: CSSProperties = {
  border: `1px solid ${t.colors.border}`,
  background: t.colors.surface,
  borderRadius: t.radius.md,
  padding: 16,
};

const smallHeadingStyle: CSSProperties = {
  fontSize: 14,
  fontWeight: 700,
  color: t.colors.textPrimary,
};

const primaryButtonStyle: CSSProperties = {
  height: 46,
  border: "none",
  borderRadius: t.radius.sm,
  background: t.colors.primary,
  color: t.colors.textOnPrimary,
  fontSize: 14,
  fontWeight: 700,
  padding: "0 16px",
  boxShadow: t.shadow.sm,
};

const secondaryButtonStyle: CSSProperties = {
  border: `1px solid ${t.colors.border}`,
  borderRadius: t.radius.sm,
  background: t.colors.surface,
  color: t.colors.textPrimary,
  fontSize: 14,
  fontWeight: 700,
  padding: "10px 14px",
  cursor: "pointer",
};

const smallPillStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding: "6px 10px",
  borderRadius: 999,
  border: `1px solid ${t.colors.border}`,
  background: t.colors.backgroundSoft,
  color: t.colors.textSecondary,
  fontSize: 12,
  fontWeight: 600,
};

const pillStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding: "10px 14px",
  borderRadius: t.radius.md,
  color: t.colors.textPrimary,
  fontSize: 14,
  fontWeight: 700,
};

const mutedTextStyle: CSSProperties = {
  fontSize: 13,
  lineHeight: 1.6,
  color: t.colors.textSecondary,
};

const listStyle: CSSProperties = {
  margin: "12px 0 0",
  paddingLeft: 20,
  color: t.colors.textSecondary,
  fontSize: 14,
  lineHeight: 1.7,
};