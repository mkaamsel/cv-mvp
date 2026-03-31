"use client";

import { useState, type CSSProperties } from "react";
import AppCard from "@/components/ui/AppCard";
import SectionLabel from "@/components/ui/SectionLabel";
import { useWorkspace } from "@/components/workspace/WorkspaceProvider";
import { designTokens } from "@/lib/design/tokens";
import type { WorkspaceCandidateProfile } from "@/lib/workspace/types";

const t = designTokens;

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

type ExtractCandidateProfileResponse =
  | {
      ok: true;
      profile: Record<string, unknown>;
    }
  | {
      ok: false;
      error?: string;
    };

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

function normalizeWorkspaceCandidateProfile(input: unknown): WorkspaceCandidateProfile {
  const raw =
    input && typeof input === "object" ? (input as Record<string, unknown>) : {};

  const legacyRoles = Array.isArray(raw.roles) ? raw.roles : [];
  const experienceRoles = Array.isArray(raw.experience) ? raw.experience : [];

  return {
    fullName: asString(raw.fullName),
    headline: asString(raw.headline),
    summary: asString(raw.summary),

    roles: [...legacyRoles, ...experienceRoles]
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

    competencies: [...asStringArray(raw.coreSkills), ...asStringArray(raw.skills)],
    evidenceNotes: asStringArray(raw.strengths),

    rawResponse: raw,
  };
}

export default function WorkspaceProfilePage() {
  const {
    state,
    setUploadedFiles,
    setCandidateProfile,
    setProfileStatus,
    setProfileError,
  } = useWorkspace();

  const [candidateText, setCandidateText] = useState("");
  const [supportingText, setSupportingText] = useState("");

  async function handleBuildProfile() {
    if (!candidateText.trim()) {
      setProfileError("Please paste the main CV text first.");
      setProfileStatus("error");
      return;
    }

    setProfileError(null);
    setProfileStatus("loading");

    try {
      const response = await fetch("/api/extract-candidate-profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          locale: "en",
          documents: [
            {
              fileName: "Primary CV",
              kind: "primary_cv",
              text: candidateText,
              isPrimary: true,
            },
            ...(supportingText.trim()
              ? [
                  {
                    fileName: "Supporting Notes",
                    kind: "user_note",
                    text: supportingText,
                    isPrimary: false,
                  },
                ]
              : []),
          ],
        }),
      });

      const data = (await response.json()) as ExtractCandidateProfileResponse;

      if (!response.ok || !data?.ok || !data.profile) {
        throw new Error(
          "error" in data && data.error
            ? data.error
            : "Could not build candidate profile."
        );
      }

      const normalizedProfile = normalizeWorkspaceCandidateProfile(data.profile);

      setCandidateProfile(normalizedProfile);

      setUploadedFiles(
        [
          candidateText.trim() ? "Primary CV" : null,
          supportingText.trim() ? "Supporting Notes" : null,
        ].filter((item): item is string => Boolean(item))
      );

      setProfileStatus("ready");
      setProfileError(null);
    } catch (error) {
      setProfileStatus("error");
      setProfileError(
        error instanceof Error ? error.message : "Unexpected profile error."
      );
    }
  }

  return (
    <div
      style={{
        display: "grid",
        gap: 20,
      }}
    >
      <AppCard className="p-6">
        <SectionLabel tone="blue">Profile</SectionLabel>

        <h1
          style={{
            margin: "14px 0 0",
            fontSize: 32,
            lineHeight: 1.15,
            letterSpacing: "-0.03em",
            color: t.colors.textPrimary,
          }}
        >
          Build the candidate profile first
        </h1>

        <p
          style={{
            margin: "12px 0 0",
            maxWidth: 920,
            fontSize: 15,
            lineHeight: 1.7,
            color: t.colors.textSecondary,
          }}
        >
          Start with the candidate truth layer. Paste the main CV text, add any
          supporting notes, and let the engine build a reusable profile before
          moving to job analysis.
        </p>
      </AppCard>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.2fr 0.8fr",
          gap: 20,
          alignItems: "start",
        }}
      >
        <div style={{ display: "grid", gap: 20 }}>
          <AppCard className="p-6">
            <h2 style={titleStyle}>Primary CV</h2>
            <p style={copyStyle}>
              Paste the main CV text here. This is the core source used to build
              the profile.
            </p>

            <textarea
              value={candidateText}
              onChange={(e) => setCandidateText(e.target.value)}
              placeholder="Paste primary CV text here..."
              style={{
                ...textareaStyle,
                minHeight: 320,
                marginTop: 14,
              }}
            />
          </AppCard>

          <AppCard className="p-6" soft>
            <h2 style={titleStyle}>Supporting notes</h2>
            <p style={copyStyle}>
              Add supporting context, candidate-confirmed clarifications, or useful
              details that should feed the profile build.
            </p>

            <textarea
              value={supportingText}
              onChange={(e) => setSupportingText(e.target.value)}
              placeholder="Paste supporting notes, achievements, or clarifications here..."
              style={{
                ...textareaStyle,
                minHeight: 220,
                marginTop: 14,
              }}
            />
          </AppCard>
        </div>

        <div style={{ display: "grid", gap: 20 }}>
          <AppCard className="p-6">
            <h2 style={titleStyle}>Profile status</h2>

            <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
              <StatusLine
                label="Current status"
                value={state.profileStatus}
              />
              <StatusLine
                label="Uploaded sources"
                value={
                  state.uploadedFiles.length
                    ? state.uploadedFiles.join(", ")
                    : "None yet"
                }
              />
              <StatusLine
                label="Summary"
                value={
                  state.candidateProfile?.summary
                    ? "Profile available"
                    : "No profile yet"
                }
              />
            </div>

            {state.profileError ? (
              <div
                style={{
                  marginTop: 14,
                  padding: 12,
                  borderRadius: t.radius.md,
                  border: `1px solid ${t.colors.danger}`,
                  background: "#fff5f5",
                  color: t.colors.textPrimary,
                  fontSize: 14,
                  lineHeight: 1.6,
                }}
              >
                {state.profileError}
              </div>
            ) : null}

            <button
              type="button"
              onClick={handleBuildProfile}
              disabled={state.profileStatus === "loading"}
              style={{
                ...primaryButtonStyle,
                width: "100%",
                marginTop: 16,
                opacity: state.profileStatus === "loading" ? 0.75 : 1,
                cursor:
                  state.profileStatus === "loading" ? "not-allowed" : "pointer",
              }}
            >
              {state.profileStatus === "loading"
                ? "Building profile..."
                : "Build profile"}
            </button>
          </AppCard>

          <AppCard className="p-6" soft>
            <h2 style={titleStyle}>Why this step matters</h2>

            <ul
              style={{
                margin: "14px 0 0",
                paddingLeft: 18,
                color: t.colors.textSecondary,
                fontSize: 14,
                lineHeight: 1.8,
              }}
            >
              <li>It creates one reusable candidate truth layer.</li>
              <li>It reduces weak tailoring later.</li>
              <li>It keeps generated applications credible.</li>
            </ul>
          </AppCard>
        </div>
      </div>
    </div>
  );
}

function StatusLine({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 12,
        fontSize: 14,
      }}
    >
      <span style={{ color: designTokens.colors.textMuted }}>{label}</span>
      <span
        style={{
          color: designTokens.colors.textPrimary,
          fontWeight: 700,
          textAlign: "right",
        }}
      >
        {value}
      </span>
    </div>
  );
}

const titleStyle: CSSProperties = {
  margin: 0,
  fontSize: 20,
  fontWeight: 800,
  color: designTokens.colors.textPrimary,
};

const copyStyle: CSSProperties = {
  margin: "8px 0 0",
  fontSize: 14,
  lineHeight: 1.7,
  color: designTokens.colors.textSecondary,
};

const textareaStyle: CSSProperties = {
  width: "100%",
  borderRadius: designTokens.radius.md,
  border: `1px solid ${designTokens.colors.border}`,
  background: designTokens.colors.surface,
  color: designTokens.colors.textPrimary,
  padding: "12px 14px",
  fontSize: 14,
  lineHeight: 1.7,
  outline: "none",
  resize: "vertical",
  fontFamily:
    'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
};

const primaryButtonStyle: CSSProperties = {
  height: 46,
  border: "none",
  borderRadius: designTokens.radius.sm,
  background: designTokens.colors.primary,
  color: designTokens.colors.textOnPrimary,
  fontSize: 14,
  fontWeight: 700,
  padding: "0 16px",
  boxShadow: designTokens.shadow.sm,
};