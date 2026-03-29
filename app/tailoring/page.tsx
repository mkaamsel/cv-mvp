"use client";

import { useEffect, useMemo, useState } from "react";
import Card from "@/components/ui/Card";
import DownloadDocxButton from "@/components/ui/DownloadDocxButton";
import PageHeader from "@/components/ui/PageHeader";
import Section from "@/components/ui/Section";

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

type CvDocxPayload = {
  fullName: string;
  targetRole?: string;
  city?: string;
  email?: string;
  phone?: string;
  linkedin?: string;
  summary?: string;
  sections: {
    heading: string;
    items: string[];
  }[];
};

type CoverLetterDocxPayload = {
  fullName: string;
  addressLines?: string[];
  email?: string;
  phone?: string;
  linkedin?: string;
  city?: string;
  dateLine?: string;
  recipientName?: string;
  recipientRole?: string;
  companyName?: string;
  companyAddressLines?: string[];
  subject?: string;
  greeting?: string;
  bodyParagraphs: string[];
  closing?: string;
};

const CANDIDATE_PROFILE_STORAGE_KEY = "cvmvp_candidate_profile";
const CANDIDATE_PROFILE_META_STORAGE_KEY = "cvmvp_candidate_profile_meta";
const CANDIDATE_DOCUMENTS_STORAGE_KEY = "cvmvp_candidate_documents";

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

  const confidence =
    item.confidence === "medium" ? "medium" : "high";

  return {
    claim,
    evidence: asStringArray(item.evidence),
    confidence,
  };
}

function normalizeStoredCandidateProfile(input: unknown): CandidateProfile {
  const raw = input && typeof input === "object" ? (input as Record<string, unknown>) : {};

  const legacyRoles = Array.isArray(raw.roles) ? raw.roles : [];
  const newExperience = Array.isArray(raw.experience) ? raw.experience : [];

  return {
    fullName: asString(raw.fullName),
    headline: asString(raw.headline),
    summary: asString(raw.summary),
    roles: [...legacyRoles, ...newExperience]
      .map(normalizeRole)
      .filter((item): item is CandidateRole => Boolean(item)),
    coreSkills: [
      ...asStringArray(raw.coreSkills),
      ...asStringArray(raw.skills),
    ],
    tools: asStringArray(raw.tools),
    standards: [
      ...asStringArray(raw.standards),
      ...asStringArray(raw.domains),
    ],
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

  if (
    normalized === "de" ||
    normalized === "deutsch" ||
    normalized === "german"
  ) {
    return "de";
  }

  return "en";
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
      return "border-green-300 bg-green-50";
    case "apply_with_care":
      return "border-blue-300 bg-blue-50";
    case "borderline":
      return "border-amber-300 bg-amber-50";
    case "not_recommended":
      return "border-red-300 bg-red-50";
    default:
      return "border-[var(--color-border)] bg-[var(--color-surface)]";
  }
}

function dedupeItems(items: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();

  return items
    .map((item) => (item || "").trim())
    .filter(Boolean)
    .filter((item) => {
      const key = item.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function buildCvDocxPayload(
  profile: CandidateProfile | null,
  candidateName: string,
  structuredJob: StructuredJob | null,
  cvText: string
): CvDocxPayload {
  const fullName =
    candidateName.trim() || profile?.fullName?.trim() || "Candidate Name";

  const targetRole =
    structuredJob?.jobTitle?.trim() || profile?.headline?.trim() || undefined;

  const profileSummary =
    profile?.summary?.trim() ||
    (structuredJob
      ? `Finance and accounting professional positioning for ${structuredJob.jobTitle || "the target role"} at ${structuredJob.companyName || "the target company"}.`
      : cvText.trim().slice(0, 600) || "Professional profile.");

  const sections: CvDocxPayload["sections"] = [];

  if (profile?.roles?.length) {
    sections.push({
      heading: "Professional Experience",
      items: profile.roles.map((role) => {
        const company = role.company || "-";
        const dates = `${role.startDate || "-"} – ${
          role.isCurrent ? "Present" : role.endDate || "-"
        }`;
        const achievementText = role.achievements?.length
          ? ` | ${role.achievements.slice(0, 2).join(" | ")}`
          : "";
        return `${role.title || "-"} | ${company} | ${dates}${achievementText}`;
      }),
    });
  }

  const combinedSkills = dedupeItems([
    ...(profile?.coreSkills || []),
    ...(profile?.tools || []),
    ...(profile?.standards || []),
  ]);

  if (combinedSkills.length) {
    sections.push({
      heading: "Core Skills and Tools",
      items: combinedSkills,
    });
  }

  if (profile?.strengths?.length) {
    sections.push({
      heading: "Strengths",
      items: profile.strengths,
    });
  }

  if (profile?.education?.length) {
    sections.push({
      heading: "Education",
      items: profile.education.map((item) => {
        const degree = item.degree || "-";
        const field = item.field ? `, ${item.field}` : "";
        const institution = item.institution ? ` | ${item.institution}` : "";
        const endDate = item.endDate ? ` | ${item.endDate}` : "";
        return `${degree}${field}${institution}${endDate}`;
      }),
    });
  }

  if (profile?.certifications?.length) {
    sections.push({
      heading: "Certifications",
      items: profile.certifications.map((item) => {
        const issuer = item.issuer ? ` | ${item.issuer}` : "";
        const date = item.date ? ` | ${item.date}` : "";
        return `${item.name}${issuer}${date}`;
      }),
    });
  }

  if (profile?.languages?.length) {
    sections.push({
      heading: "Languages",
      items: profile.languages.map((item) =>
        item.proficiency ? `${item.language} (${item.proficiency})` : item.language
      ),
    });
  }

  if (!sections.length) {
    sections.push({
      heading: "Candidate Profile",
      items: cvText.trim()
        ? cvText
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean)
            .slice(0, 12)
        : ["No structured candidate profile available yet."],
    });
  }

  return {
    fullName,
    targetRole,
    summary: profileSummary,
    sections,
  };
}

function buildCoverLetterDocxPayload(
  profile: CandidateProfile | null,
  candidateName: string,
  structuredJob: StructuredJob | null,
  applicationRecommendation: ApplicationRecommendationResponse | null,
  outputLanguage: "de" | "en"
): CoverLetterDocxPayload {
  const fullName =
    candidateName.trim() || profile?.fullName?.trim() || "Candidate Name";

  const companyName = structuredJob?.companyName?.trim() || "Target Company";
  const jobTitle = structuredJob?.jobTitle?.trim() || "Target Role";
  const city = structuredJob?.location?.trim() || "";

  const today = new Date();
  const dateLine = today.toLocaleDateString(
    outputLanguage === "de" ? "de-DE" : "en-GB",
    {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }
  );

  const intro =
    outputLanguage === "de"
      ? `mit großem Interesse bewerbe ich mich auf die Position ${jobTitle}${
          structuredJob?.companyName ? ` bei ${structuredJob.companyName}` : ""
        }.`
      : `I am writing to apply for the ${jobTitle}${
          structuredJob?.companyName ? ` position at ${structuredJob.companyName}` : ""
        }.`;

  const experienceParagraph =
    outputLanguage === "de"
      ? profile?.summary?.trim() ||
        `Mein Profil verbindet praktische Erfahrung in Accounting-, Reporting- und Abschlussprozessen mit einer strukturierten und verlässlichen Arbeitsweise.`
      : profile?.summary?.trim() ||
        `My background combines practical experience across accounting, reporting, and close-related processes with a structured and reliable working style.`;

  const positioningParagraph =
    applicationRecommendation && applicationRecommendation.ok
      ? applicationRecommendation.positioningStrategy ||
        applicationRecommendation.advisorMessage ||
        applicationRecommendation.reasoningSummary
      : outputLanguage === "de"
        ? `Besonders relevant erscheint mir an dieser Rolle die Verbindung aus fachlicher Verantwortung, sauberem Prozessverständnis und der Möglichkeit, vorhandene Erfahrung gezielt einzubringen.`
        : `What makes this role particularly attractive to me is the combination of technical responsibility, process discipline, and the opportunity to contribute existing experience in a focused way.`;

  const closingParagraph =
    outputLanguage === "de"
      ? `Ich freue mich über die Möglichkeit, mein Profil und meinen Beitrag zu dieser Position in einem persönlichen Gespräch näher zu erläutern.`
      : `I would welcome the opportunity to discuss my profile and my potential contribution to this role in more detail.`;

  return {
    fullName,
    city,
    dateLine: city ? `${city}, ${dateLine}` : dateLine,
    companyName,
    subject:
      outputLanguage === "de"
        ? `Bewerbung als ${jobTitle}`
        : `Application for ${jobTitle}`,
    greeting: outputLanguage === "de" ? "Sehr geehrte Damen und Herren," : "Dear Hiring Team,",
    bodyParagraphs: [
      intro,
      experienceParagraph,
      positioningParagraph,
      closingParagraph,
    ],
    closing: outputLanguage === "de" ? "Mit freundlichen Grüßen" : "Kind regards,",
  };
}

export default function TailoringPage() {
  const [candidateName, setCandidateName] = useState("");
  const [cvText, setCvText] = useState("");
  const [candidateProfile, setCandidateProfile] = useState<CandidateProfile | null>(null);

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

  const canExtract = useMemo(() => {
    return Boolean(jobUrl.trim() || jobDescription.trim());
  }, [jobUrl, jobDescription]);

  const normalizedLanguage = useMemo(
    () => normalizeOutputLanguage(outputLanguage),
    [outputLanguage]
  );

  const cvDocxPayload = useMemo(() => {
    return buildCvDocxPayload(
      candidateProfile,
      candidateName,
      structuredJob,
      cvText
    );
  }, [candidateProfile, candidateName, structuredJob, cvText]);

  const coverLetterDocxPayload = useMemo(() => {
    return buildCoverLetterDocxPayload(
      candidateProfile,
      candidateName,
      structuredJob,
      applicationRecommendation,
      normalizedLanguage
    );
  }, [
    candidateProfile,
    candidateName,
    structuredJob,
    applicationRecommendation,
    normalizedLanguage,
  ]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const rawProfile = sessionStorage.getItem(CANDIDATE_PROFILE_STORAGE_KEY);
      const rawMeta = sessionStorage.getItem(CANDIDATE_PROFILE_META_STORAGE_KEY);
      const rawDocuments = sessionStorage.getItem(CANDIDATE_DOCUMENTS_STORAGE_KEY);

      let loadedProfile = false;

      if (rawProfile) {
        const parsedProfile = normalizeStoredCandidateProfile(JSON.parse(rawProfile));
        setCandidateProfile(parsedProfile);
        setCandidateName(parsedProfile.fullName || "");
        setCvText(buildCandidateProfileText(parsedProfile));
        loadedProfile = true;
      }

      if (!loadedProfile && rawDocuments) {
        const parsedDocuments = JSON.parse(rawDocuments) as StoredDocument[];
        setCvText(buildDocumentsFallbackText(parsedDocuments));
      }

      if (rawMeta) {
        const parsedMeta = JSON.parse(rawMeta) as {
          locale?: string;
          storedAt?: string;
          sourceCount?: number;
          readinessLabel?: string;
        };

        const parts: string[] = [];

        if (typeof parsedMeta.sourceCount === "number") {
          parts.push(
            `${parsedMeta.sourceCount} source${
              parsedMeta.sourceCount === 1 ? "" : "s"
            } loaded`
          );
        }

        if (parsedMeta.readinessLabel) {
          parts.push(`profile status: ${parsedMeta.readinessLabel}`);
        }

        if (parsedMeta.storedAt) {
          parts.push(`stored at: ${new Date(parsedMeta.storedAt).toLocaleString()}`);
        }

        setProfileMetaText(parts.join(" · "));
      }

      setProfileLoaded(Boolean(rawProfile));
    } catch {
      setProfileLoaded(false);
      setProfileMetaText("");
    }
  }, []);

  async function handleJobExtraction() {
    if (!jobUrl.trim() && !jobDescription.trim()) {
      setError("Please provide either a job URL or pasted job description text.");
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
          outputLanguage: normalizeOutputLanguage(outputLanguage),
        }),
      });

      const data = (await res.json()) as TailoringExtractResponse;

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
          locale: normalizeOutputLanguage(outputLanguage),
          structuredJob: data.structuredJob,
          extractedText: data.extractedText || "",
        }),
      });

      const contextData =
        (await contextRes.json()) as CompanyContextResponse;

      if (contextRes.ok && contextData.ok) {
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
            locale: normalizeOutputLanguage(outputLanguage),
            candidateProfile,
            structuredJob: data.structuredJob,
            companyContext:
              contextRes.ok && contextData.ok ? contextData.companyContext : null,
            extractedText: data.extractedText || "",
          }),
        });

        const recommendationData =
          (await recommendationRes.json()) as ApplicationRecommendationResponse;

        setApplicationRecommendation(recommendationData);
      }
    } catch {
      setError("Could not extract job description.");
    } finally {
      setExtractingJob(false);
      setAnalyzingRecommendation(false);
    }
  }

  return (
    <main>
      <Section>
        <PageHeader
          eyebrow="Quick Tailoring"
          title="Extract a job cleanly before tailoring"
          description="Paste a job URL or raw job description text. The system will fetch safely, clean noisy content, infer the role environment, and evaluate whether the application is credible before document generation."
        />

        <Card className="mb-6 p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
                Candidate profile handoff
              </h2>
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                This page loads the candidate profile built on the previous step.
              </p>
            </div>

            <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-text-secondary)]">
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

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="p-6">
            <label className="mb-2 block text-sm font-medium text-[var(--color-text-primary)]">
              Candidate name
            </label>
            <input
              type="text"
              value={candidateName}
              onChange={(e) => setCandidateName(e.target.value)}
              placeholder="Enter your name"
              className="mb-4 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 py-3 text-sm outline-none"
            />

            <label className="mb-2 block text-sm font-medium text-[var(--color-text-primary)]">
              Candidate profile or canonical CV lines
            </label>
            <textarea
              value={cvText}
              onChange={(e) => setCvText(e.target.value)}
              placeholder="Candidate profile or relevant canonical CV content"
              className="min-h-[320px] w-full rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 py-3 text-sm text-[var(--color-text-primary)] outline-none"
            />

            <p className="mt-3 text-sm text-[var(--color-text-secondary)]">
              This field is prefilled from the profile builder when a stored candidate
              profile is available.
            </p>
          </Card>

          <Card className="p-6">
            <label className="mb-2 block text-sm font-medium text-[var(--color-text-primary)]">
              Job posting URL
            </label>

            <input
              type="text"
              value={jobUrl}
              onChange={(e) => setJobUrl(e.target.value)}
              placeholder="Paste LinkedIn, company career page, or other job URL"
              className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 py-3 text-sm outline-none"
            />

            <p className="mt-3 text-sm text-[var(--color-text-secondary)]">
              If scraping is blocked, pasted job text below will act as fallback.
            </p>

            <label className="mb-2 mt-6 block text-sm font-medium text-[var(--color-text-primary)]">
              Job description
            </label>
            <textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the job description here if no clean URL is available"
              className="min-h-[320px] w-full rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 py-3 text-sm text-[var(--color-text-primary)] outline-none"
            />

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--color-text-primary)]">
                  Output language
                </label>
                <select
                  value={normalizeOutputLanguage(outputLanguage)}
                  onChange={(e) =>
                    setOutputLanguage(e.target.value === "de" ? "Deutsch" : "English")
                  }
                  className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 py-3 text-sm outline-none"
                >
                  <option value="de">Deutsch</option>
                  <option value="en">English</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={handleJobExtraction}
                  disabled={!canExtract || extractingJob || analyzingRecommendation}
                  className="inline-flex w-full items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-primary)] px-6 py-3 text-sm font-medium text-[var(--color-text-on-primary)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {extractingJob
                    ? "Extracting..."
                    : analyzingRecommendation
                      ? "Analyzing..."
                      : "Extract job"}
                </button>
              </div>
            </div>

            {error ? (
              <div className="mt-4 rounded-[var(--radius-md)] border border-[#E8B4B4] bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-text-primary)]">
                {error}
              </div>
            ) : null}

            {extractionSource ? (
              <div className="mt-4 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-text-secondary)]">
                <div>
                  Extraction source:{" "}
                  <span className="font-medium">{getSourceLabel(extractionSource)}</span>
                </div>

                {normalizedUrl ? (
                  <div className="mt-1 break-all">
                    Normalized URL: <span className="font-medium">{normalizedUrl}</span>
                  </div>
                ) : null}
              </div>
            ) : null}

            {warnings.length > 0 ? (
              <div className="mt-4 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-text-secondary)]">
                <div className="font-medium text-[var(--color-text-primary)]">
                  Warnings
                </div>
                <ul className="mt-2 space-y-1">
                  {warnings.map((warning, index) => (
                    <li key={`${warning}-${index}`}>• {warning}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </Card>
        </div>

        {(structuredJob || profileLoaded) ? (
          <Card className="mt-6 p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
                  Application documents
                </h2>
                <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                  This is the first downloadable document layer. It builds a basic CV and
                  cover letter from the current candidate profile, extracted role, and
                  recommendation context.
                </p>
              </div>

              <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-text-secondary)]">
                {structuredJob
                  ? "Document payload ready for this role"
                  : "Candidate-based document payload ready"}
              </div>
            </div>

            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
                <div className="text-sm font-medium text-[var(--color-text-primary)]">
                  CV document
                </div>
                <p className="mt-2 text-sm leading-7 text-[var(--color-text-secondary)]">
                  Builds a plain editable DOCX using the candidate profile, role title,
                  profile summary, experience, skills, education, certifications, and
                  languages.
                </p>

                <div className="mt-4">
                  <DownloadDocxButton
                    apiUrl="/api/download/cv"
                    fallbackFilename="candidate-cv.docx"
                    label="Download CV (.docx)"
                    payload={cvDocxPayload}
                  />
                </div>
              </div>

              <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
                <div className="text-sm font-medium text-[var(--color-text-primary)]">
                  Cover letter document
                </div>
                <p className="mt-2 text-sm leading-7 text-[var(--color-text-secondary)]">
                  Builds a basic DOCX cover letter using the target role, company, candidate
                  summary, and the recommendation layer where available.
                </p>

                <div className="mt-4">
                  <DownloadDocxButton
                    apiUrl="/api/download/cover-letter"
                    fallbackFilename="candidate-cover-letter.docx"
                    label="Download Cover Letter (.docx)"
                    payload={coverLetterDocxPayload}
                  />
                </div>
              </div>
            </div>
          </Card>
        ) : null}

        {companyContext ? (
          <Card className="mt-6 p-6">
            <div>
              <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
                Company and role context
              </h2>
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                This inferred environment layer helps interpret the role before applying.
              </p>
            </div>

            <div className="mt-6 grid gap-6 md:grid-cols-2">
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

            <div className="mt-6 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-sm leading-7 text-[var(--color-text-secondary)]">
              <div className="mb-2 font-medium text-[var(--color-text-primary)]">
                Context summary
              </div>
              {companyContext.summary || "-"}
            </div>
          </Card>
        ) : null}

        {applicationRecommendation && applicationRecommendation.ok ? (
          <Card className="mt-6 p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
                  Application recommendation
                </h2>
                <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                  This is the decision layer based on the candidate profile, job, and
                  inferred role environment.
                </p>
              </div>

              <div
                className={`rounded-[var(--radius-md)] border px-4 py-3 text-sm font-medium ${getRecommendationTone(
                  applicationRecommendation.applicationRecommendation
                )}`}
              >
                {getRecommendationLabel(
                  applicationRecommendation.applicationRecommendation
                )}
              </div>
            </div>

            <div className="mt-6 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
              <div className="text-sm font-medium text-[var(--color-text-primary)]">
                Advisor message
              </div>
              <p className="mt-2 text-sm leading-7 text-[var(--color-text-secondary)]">
                {applicationRecommendation.advisorMessage}
              </p>
            </div>

            <div className="mt-6 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
              <div className="text-sm font-medium text-[var(--color-text-primary)]">
                Reasoning summary
              </div>
              <p className="mt-2 text-sm leading-7 text-[var(--color-text-secondary)]">
                {applicationRecommendation.reasoningSummary}
              </p>
            </div>

            <div className="mt-6 grid gap-6 md:grid-cols-2">
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

            <div className="mt-6 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
              <div className="text-sm font-medium text-[var(--color-text-primary)]">
                Positioning strategy
              </div>
              <p className="mt-2 text-sm leading-7 text-[var(--color-text-secondary)]">
                {applicationRecommendation.positioningStrategy || "-"}
              </p>
            </div>

            <div className="mt-6">
              <div className="mb-3 text-sm font-medium text-[var(--color-text-primary)]">
                Requirement analysis
              </div>

              <div className="space-y-3">
                {applicationRecommendation.requirementsAnalysis.length ? (
                  applicationRecommendation.requirementsAnalysis.map((item, index) => (
                    <div
                      key={`${item.requirement}-${index}`}
                      className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
                    >
                      <div className="text-sm font-medium text-[var(--color-text-primary)]">
                        {item.requirement}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <span className="rounded-full border border-[var(--color-border)] px-2 py-1 text-xs text-[var(--color-text-secondary)]">
                          Importance: {item.importance}
                        </span>
                        <span className="rounded-full border border-[var(--color-border)] px-2 py-1 text-xs text-[var(--color-text-secondary)]">
                          Match: {item.matchStatus}
                        </span>
                      </div>
                      <p className="mt-3 text-sm leading-7 text-[var(--color-text-secondary)]">
                        {item.notes || "-"}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-sm text-[var(--color-text-secondary)]">
                    No requirement analysis returned yet.
                  </div>
                )}
              </div>
            </div>
          </Card>
        ) : applicationRecommendation && !applicationRecommendation.ok ? (
          <Card className="mt-6 p-6">
            <div className="rounded-[var(--radius-md)] border border-[#E8B4B4] bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-text-primary)]">
              {applicationRecommendation.error}
            </div>
          </Card>
        ) : null}

        <Card className="mt-6 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
                Structured job output
              </h2>
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                This is the cleaned, structured result from the extraction route.
              </p>
            </div>

            {structuredJob ? (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => copyToClipboard(JSON.stringify(structuredJob, null, 2))}
                  className="rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2 text-sm"
                >
                  Copy JSON
                </button>

                <button
                  type="button"
                  onClick={() =>
                    downloadTxt("structured-job.txt", buildStructuredJobText(structuredJob))
                  }
                  className="rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2 text-sm"
                >
                  Download TXT
                </button>
              </div>
            ) : null}
          </div>

          <div className="mt-6 min-h-[220px] rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
            {!structuredJob ? (
              <div className="text-sm leading-7 text-[var(--color-text-secondary)]">
                No structured job data yet. Paste a URL or job description and click{" "}
                <strong>Extract job</strong>.
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
                    Core fields
                  </h3>

                  <div className="mt-3 space-y-3 text-sm text-[var(--color-text-secondary)]">
                    <div>
                      <div className="font-medium text-[var(--color-text-primary)]">
                        Company
                      </div>
                      <div>{structuredJob.companyName || "-"}</div>
                    </div>

                    <div>
                      <div className="font-medium text-[var(--color-text-primary)]">
                        Job title
                      </div>
                      <div>{structuredJob.jobTitle || "-"}</div>
                    </div>

                    <div>
                      <div className="font-medium text-[var(--color-text-primary)]">
                        Location
                      </div>
                      <div>{structuredJob.location || "-"}</div>
                    </div>
                  </div>

                  <div className="mt-6">
                    <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
                      Summary
                    </h3>
                    <p className="mt-3 text-sm leading-7 text-[var(--color-text-secondary)]">
                      {structuredJob.summary || "-"}
                    </p>
                  </div>
                </div>

                <div>
                  <div>
                    <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
                      Responsibilities
                    </h3>
                    <ul className="mt-3 space-y-2 text-sm leading-7 text-[var(--color-text-secondary)]">
                      {structuredJob.responsibilities.length ? (
                        structuredJob.responsibilities.map((item, index) => (
                          <li key={`${item}-${index}`}>• {item}</li>
                        ))
                      ) : (
                        <li>-</li>
                      )}
                    </ul>
                  </div>

                  <div className="mt-6">
                    <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
                      Requirements
                    </h3>
                    <ul className="mt-3 space-y-2 text-sm leading-7 text-[var(--color-text-secondary)]">
                      {structuredJob.requirements.length ? (
                        structuredJob.requirements.map((item, index) => (
                          <li key={`${item}-${index}`}>• {item}</li>
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

        <Card className="mt-6 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
                Cleaned extracted text
              </h2>
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                This is the normalized text that was sent into the extraction step.
              </p>
            </div>

            {extractedText ? (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => copyToClipboard(extractedText)}
                  className="rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2 text-sm"
                >
                  Copy text
                </button>

                <button
                  type="button"
                  onClick={() =>
                    downloadTxt("cleaned-job-description.txt", extractedText)
                  }
                  className="rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2 text-sm"
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
            className="mt-6 min-h-[320px] w-full rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 py-3 text-sm leading-7 text-[var(--color-text-secondary)] outline-none"
            placeholder="Cleaned extracted text will appear here."
          />
        </Card>
      </Section>
    </main>
  );
}

function ContextList(props: { title: string; items: string[] }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
        {props.title}
      </h3>

      <ul className="mt-3 space-y-2 text-sm leading-7 text-[var(--color-text-secondary)]">
        {props.items.length ? (
          props.items.map((item, index) => <li key={`${item}-${index}`}>• {item}</li>)
        ) : (
          <li>-</li>
        )}
      </ul>
    </div>
  );
}