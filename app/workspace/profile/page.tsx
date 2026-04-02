"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import AppCard from "@/components/ui/AppCard";
import SectionLabel from "@/components/ui/SectionLabel";
import { useWorkspace } from "@/components/workspace/WorkspaceProvider";
import { designTokens } from "@/lib/design/tokens";
import type {
  WorkspaceCandidateProfile,
  WorkspaceCandidateCertification,
  WorkspaceCandidateEducation,
  WorkspaceCandidateLanguage,
  WorkspaceCandidateRole,
  WorkspaceVerifiedClaim,
} from "@/lib/workspace/types";

const t = designTokens;

type ExtractCandidateProfileSuccess = {
  candidateProfile: Record<string, unknown>;
  warnings?: string[];
};

type ExtractCandidateProfileError = {
  error?: string;
};

type ExtractCandidateProfileResponse =
  | ExtractCandidateProfileSuccess
  | ExtractCandidateProfileError;

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

function normalizeRole(input: unknown): WorkspaceCandidateRole | null {
  const role = asRecord(input);
  if (!role) return null;

  const title = asString(role.title) ?? "";
  if (!title) return null;

  return {
    title,
    company: asString(role.company),
    startDate: asString(role.startDate),
    endDate: asString(role.endDate),
    isCurrent: Boolean(role.isCurrent),
    location: asString(role.location),
    achievements: asStringArray(role.achievements),
  };
}

function normalizeLanguage(input: unknown): WorkspaceCandidateLanguage | null {
  const item = asRecord(input);
  if (!item) return null;

  const language = asString(item.language) ?? "";
  if (!language) return null;

  return {
    language,
    proficiency: asString(item.proficiency),
  };
}

function normalizeEducation(input: unknown): WorkspaceCandidateEducation | null {
  const item = asRecord(input);
  if (!item) return null;

  const degree = asString(item.degree) ?? "";
  if (!degree) return null;

  return {
    degree,
    field: asString(item.field),
    institution: asString(item.institution),
    endDate: asString(item.endDate),
  };
}

function normalizeCertification(
  input: unknown,
): WorkspaceCandidateCertification | null {
  const item = asRecord(input);
  if (!item) return null;

  const name = asString(item.name) ?? "";
  if (!name) return null;

  return {
    name,
    issuer: asString(item.issuer),
    date: asString(item.date) ?? asString(item.year),
  };
}

function normalizeVerifiedClaim(input: unknown): WorkspaceVerifiedClaim | null {
  const item = asRecord(input);
  if (!item) return null;

  const claim = asString(item.claim) ?? "";
  if (!claim) return null;

  return {
    claim,
    evidence: asStringArray(item.evidence),
    confidence: item.confidence === "medium" ? "medium" : "high",
  };
}

function normalizeWorkspaceCandidateProfile(
  input: unknown,
): WorkspaceCandidateProfile {
  const raw = asRecord(input) ?? {};

  const roleCandidates = Array.isArray(raw.roles)
    ? raw.roles
    : Array.isArray(raw.experience)
      ? raw.experience
      : [];

  const coreSkills = uniqueStrings([
    ...asStringArray(raw.coreSkills),
    ...asStringArray(raw.skills),
  ]);

  const strengths = asStringArray(raw.strengths);

  return {
    fullName: asString(raw.fullName),
    headline: asString(raw.headline),
    summary: asString(raw.summary),
    roles: roleCandidates
      .map(normalizeRole)
      .filter((item): item is WorkspaceCandidateRole => Boolean(item)),
    coreSkills,
    tools: asStringArray(raw.tools),
    standards: uniqueStrings([
      ...asStringArray(raw.standards),
      ...asStringArray(raw.domains),
    ]),
    industries: asStringArray(raw.industries),
    languages: (Array.isArray(raw.languages) ? raw.languages : [])
      .map(normalizeLanguage)
      .filter((item): item is WorkspaceCandidateLanguage => Boolean(item)),
    education: (Array.isArray(raw.education) ? raw.education : [])
      .map(normalizeEducation)
      .filter((item): item is WorkspaceCandidateEducation => Boolean(item)),
    certifications: (Array.isArray(raw.certifications) ? raw.certifications : [])
      .map(normalizeCertification)
      .filter((item): item is WorkspaceCandidateCertification => Boolean(item)),
    leadershipSignals: asStringArray(raw.leadershipSignals),
    strengths,
    constraints: asStringArray(raw.constraints),
    verifiedClaims: (Array.isArray(raw.verifiedClaims) ? raw.verifiedClaims : [])
      .map(normalizeVerifiedClaim)
      .filter((item): item is WorkspaceVerifiedClaim => Boolean(item)),
    openQuestions: asStringArray(raw.openQuestions),
    competencies: coreSkills,
    evidenceNotes: asStringArray(raw.evidenceNotes).length
      ? asStringArray(raw.evidenceNotes)
      : strengths,
    rawResponse: raw,
  };
}

function toDisplayStatus(value: string): string {
  switch (value) {
    case "idle":
      return "Idle";
    case "loading":
      return "Loading";
    case "ready":
      return "Ready";
    case "error":
      return "Error";
    default:
      return value;
  }
}

export default function WorkspaceProfilePage() {
  const router = useRouter();

  const {
    state,
    setUploadedFiles,
    setCandidateProfile,
    setProfileStatus,
    setProfileError,
  } = useWorkspace();

  const [candidateText, setCandidateText] = useState("");
  const [supportingText, setSupportingText] = useState("");

  useEffect(() => {
    if (state.candidateProfile && !candidateText.trim()) {
      const raw = asRecord(state.candidateProfile.rawResponse);
      const rawSummary = asString(raw?.summary);
      if (rawSummary) {
        setCandidateText((current) => current || rawSummary);
      }
    }
  }, [candidateText, state.candidateProfile]);

  const profile = state.candidateProfile ?? null;
  const profileRoles = profile?.roles ?? [];
  const profileCoreSkills = profile?.coreSkills ?? [];
  const profileTools = profile?.tools ?? [];
  const profileStandards = profile?.standards ?? [];
  const profileVerifiedClaims = profile?.verifiedClaims ?? [];

  const profileStats = useMemo(
    () => ({
      roles: profileRoles.length,
      skills: profileCoreSkills.length,
      tools: profileTools.length,
      standards: profileStandards.length,
      claims: profileVerifiedClaims.length,
    }),
    [
      profileRoles.length,
      profileCoreSkills.length,
      profileTools.length,
      profileStandards.length,
      profileVerifiedClaims.length,
    ],
  );

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
          outputLanguage: "en",
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

      if (
        !response.ok ||
        !("candidateProfile" in data) ||
        !data.candidateProfile
      ) {
        throw new Error(
          "error" in data && data.error
            ? data.error
            : "Could not build candidate profile.",
        );
      }

      const normalizedProfile = normalizeWorkspaceCandidateProfile(
        data.candidateProfile,
      );

      const uploadedFiles = [
        candidateText.trim() ? "Primary CV" : null,
        supportingText.trim() ? "Supporting Notes" : null,
      ].filter((item): item is string => Boolean(item));

      setCandidateProfile(normalizedProfile);
      setUploadedFiles(uploadedFiles);

      const saveResponse = await fetch("/api/profile/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          profile: normalizedProfile.rawResponse ?? normalizedProfile,
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
          meta: {
            locale: "en",
            sourceCount: uploadedFiles.length,
            readinessLabel: "Profile built",
            bootstrapStatus: "profile_ready",
          },
        }),
      });

      if (!saveResponse.ok) {
        const saveData = (await saveResponse.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(saveData.error || "Profile was built but could not be saved.");
      }

      setProfileStatus("ready");
      setProfileError(null);
    } catch (error) {
      setProfileStatus("error");
      setProfileError(
        error instanceof Error ? error.message : "Unexpected profile error.",
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
          Build the candidate profile
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
          Paste the CV text and build the candidate truth layer before moving to
          job analysis.
        </p>
      </AppCard>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.2fr) minmax(320px, 0.8fr)",
          gap: 20,
          alignItems: "start",
        }}
      >
        <div style={{ display: "grid", gap: 20 }}>
          <AppCard className="p-6">
            <h2 style={titleStyle}>Primary CV</h2>
            <p style={copyStyle}>
              Paste the main CV text that should anchor the canonical candidate profile.
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
              Add clarifications, project details, or extra evidence that should
              support the profile build.
            </p>

            <textarea
              value={supportingText}
              onChange={(e) => setSupportingText(e.target.value)}
              placeholder="Add clarifications or additional achievements..."
              style={{
                ...textareaStyle,
                minHeight: 220,
                marginTop: 14,
              }}
            />
          </AppCard>

          {profile ? (
            <AppCard className="p-6">
              <h2 style={titleStyle}>Built profile preview</h2>
              <p style={copyStyle}>
                This confirms the structured candidate profile is present in workspace state.
              </p>

              <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
                <PreviewLine label="Name" value={profile.fullName || "Not captured"} />
                <PreviewLine label="Headline" value={profile.headline || "Not captured"} />
                <PreviewLine label="Summary" value={profile.summary || "Not captured"} />
                <PreviewLine
                  label="Core skills"
                  value={
                    profileCoreSkills.length ? profileCoreSkills.join(", ") : "None yet"
                  }
                />
                <PreviewLine
                  label="Standards"
                  value={
                    profileStandards.length ? profileStandards.join(", ") : "None yet"
                  }
                />
                <PreviewLine
                  label="Tools"
                  value={profileTools.length ? profileTools.join(", ") : "None yet"}
                />
              </div>

              <div style={{ marginTop: 18 }}>
                <h3 style={subTitleStyle}>Roles</h3>
                {profileRoles.length ? (
                  <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
                    {profileRoles.slice(0, 6).map((role, index) => (
                      <div
                        key={`${role.title}-${role.company ?? "company"}-${index}`}
                        style={listCardStyle}
                      >
                        <div style={{ fontWeight: 700, color: t.colors.textPrimary }}>
                          {role.title}
                        </div>
                        <div
                          style={{
                            marginTop: 4,
                            color: t.colors.textSecondary,
                            fontSize: 14,
                          }}
                        >
                          {[role.company, role.startDate, role.endDate]
                            .filter(Boolean)
                            .join(" • ") || "No company/date captured"}
                        </div>
                        {role.achievements.length ? (
                          <div
                            style={{
                              marginTop: 8,
                              color: t.colors.textSecondary,
                              fontSize: 14,
                              lineHeight: 1.6,
                            }}
                          >
                            {role.achievements.slice(0, 3).join(" · ")}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ ...copyStyle, marginTop: 10 }}>
                    No structured roles captured yet.
                  </p>
                )}
              </div>

              <div style={{ marginTop: 18 }}>
                <h3 style={subTitleStyle}>Verified claims</h3>
                {profileVerifiedClaims.length ? (
                  <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
                    {profileVerifiedClaims.slice(0, 6).map((claim, index) => (
                      <div key={`${claim.claim}-${index}`} style={listCardStyle}>
                        <div style={{ fontWeight: 700, color: t.colors.textPrimary }}>
                          {claim.claim}
                        </div>
                        <div
                          style={{
                            marginTop: 4,
                            color: t.colors.textSecondary,
                            fontSize: 14,
                          }}
                        >
                          Confidence: {claim.confidence}
                        </div>
                        {claim.evidence.length ? (
                          <div
                            style={{
                              marginTop: 8,
                              color: t.colors.textSecondary,
                              fontSize: 14,
                              lineHeight: 1.6,
                            }}
                          >
                            {claim.evidence.join(" · ")}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ ...copyStyle, marginTop: 10 }}>
                    No verified claims captured yet.
                  </p>
                )}
              </div>
            </AppCard>
          ) : null}
        </div>

        <div style={{ display: "grid", gap: 20 }}>
          <AppCard className="p-6">
            <h2 style={titleStyle}>Profile status</h2>

            <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
              <StatusLine
                label="Current status"
                value={toDisplayStatus(state.profileStatus)}
              />
              <StatusLine
                label="Uploaded sources"
                value={
                  state.uploadedFiles.length
                    ? state.uploadedFiles.join(", ")
                    : "None yet"
                }
              />
              <StatusLine label="Profile" value={profile ? "Ready" : "Not built"} />
              <StatusLine label="Roles" value={String(profileStats.roles)} />
              <StatusLine label="Skills" value={String(profileStats.skills)} />
              <StatusLine label="Verified claims" value={String(profileStats.claims)} />
            </div>

            {state.profileError ? (
              <div style={errorBoxStyle}>{state.profileError}</div>
            ) : null}

            <button
              type="button"
              onClick={handleBuildProfile}
              disabled={state.profileStatus === "loading"}
              style={{
                ...primaryButtonStyle,
                width: "100%",
                marginTop: 16,
                opacity: state.profileStatus === "loading" ? 0.8 : 1,
                cursor:
                  state.profileStatus === "loading" ? "not-allowed" : "pointer",
              }}
            >
              {state.profileStatus === "loading"
                ? "Building profile..."
                : profile
                  ? "Rebuild profile"
                  : "Build profile"}
            </button>

            <button
              type="button"
              onClick={() => router.push("/workspace/job")}
              disabled={!profile}
              style={{
                ...secondaryButtonStyle,
                width: "100%",
                marginTop: 12,
                opacity: profile ? 1 : 0.6,
                cursor: profile ? "pointer" : "not-allowed",
              }}
            >
              Continue to job
            </button>
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
      <span style={{ color: t.colors.textMuted }}>{label}</span>
      <span
        style={{
          color: t.colors.textPrimary,
          fontWeight: 700,
          textAlign: "right",
        }}
      >
        {value}
      </span>
    </div>
  );
}

function PreviewLine({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "grid", gap: 4 }}>
      <div
        style={{
          fontSize: 13,
          fontWeight: 700,
          color: t.colors.textMuted,
          textTransform: "uppercase",
          letterSpacing: "0.04em",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 14,
          lineHeight: 1.7,
          color: t.colors.textPrimary,
        }}
      >
        {value}
      </div>
    </div>
  );
}

const titleStyle: CSSProperties = {
  margin: 0,
  fontSize: 20,
  fontWeight: 800,
  color: t.colors.textPrimary,
};

const subTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: 16,
  fontWeight: 800,
  color: t.colors.textPrimary,
};

const copyStyle: CSSProperties = {
  margin: "8px 0 0",
  fontSize: 14,
  lineHeight: 1.7,
  color: t.colors.textSecondary,
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
};

const errorBoxStyle: CSSProperties = {
  marginTop: 14,
  padding: 12,
  borderRadius: t.radius.md,
  border: `1px solid ${t.colors.border}`,
  background: t.colors.backgroundSoft,
  color: t.colors.textPrimary,
  fontSize: 14,
  lineHeight: 1.6,
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
};

const secondaryButtonStyle: CSSProperties = {
  height: 46,
  borderRadius: t.radius.sm,
  border: `1px solid ${t.colors.border}`,
  background: t.colors.surface,
  color: t.colors.textPrimary,
  fontSize: 14,
  fontWeight: 700,
  padding: "0 16px",
};

const listCardStyle: CSSProperties = {
  border: `1px solid ${t.colors.border}`,
  borderRadius: t.radius.md,
  background: t.colors.surface,
  padding: 12,
};