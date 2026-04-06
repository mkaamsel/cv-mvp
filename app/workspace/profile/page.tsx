"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import AppCard from "@/components/ui/AppCard";
import { useWorkspace } from "@/components/workspace/WorkspaceProvider";
import EnrichmentHint from "@/components/workspace/EnrichmentHint";
import { useBehaviouralField } from "@/lib/workspace/useBehaviouralField";
import { designTokens } from "@/lib/design/tokens";
import type { FieldMetrics } from "@/lib/workspace/behaviouralTelemetry";
import type {
  WorkspaceCandidateProfile,
  WorkspaceCandidateCertification,
  WorkspaceCandidateEducation,
  WorkspaceCandidateLanguage,
  WorkspaceCandidateRole,
  WorkspaceVerifiedClaim,
} from "@/lib/workspace/types";

const t = designTokens;

const BUILD_MESSAGES = [
  "Reading your experience…",
  "Extracting skills and achievements…",
  "Identifying key strengths…",
  "Almost there…",
];

type UploadState =
  | { status: "idle" }
  | { status: "uploading" }
  | { status: "done"; fileName: string; chars: number; warnings: string[] }
  | { status: "error"; message: string };

// Each uploaded document accumulates its extracted text for dumb-append build.
// blobUrl is kept so the user can preview the original file.
type AccumulatedDoc = {
  name: string;
  kind: "primary_cv" | "supporting";
  text: string;     // extracted text — sent to AI at build time
  chars: number;
  addedAt: string;
  blobUrl: string;  // for in-browser preview
};

type ProfileDiff = {
  addedRoles: number;
  addedSkills: number;
  addedClaims: number;
  addedTools: number;
};

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

/** Extract a 4-digit year from a date string like "Jan 2023", "2023-01", "2023", etc. */
function extractYear(dateStr: string | null): number {
  if (!dateStr) return 0;
  const match = dateStr.match(/\b(19|20)\d{2}\b/);
  return match ? parseInt(match[0], 10) : 0;
}

/** Sort roles descending: isCurrent first, then by startDate year descending, then endDate year. */
function sortRolesDescending(roles: WorkspaceCandidateRole[]): WorkspaceCandidateRole[] {
  return [...roles].sort((a, b) => {
    // Current roles always first
    if (a.isCurrent && !b.isCurrent) return -1;
    if (!a.isCurrent && b.isCurrent) return 1;
    // Then by startDate descending
    const startA = extractYear(a.startDate);
    const startB = extractYear(b.startDate);
    if (startA !== startB) return startB - startA;
    // Tiebreak by endDate descending
    const endA = extractYear(a.endDate);
    const endB = extractYear(b.endDate);
    return endB - endA;
  });
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
    roles: sortRolesDescending(
      roleCandidates
        .map(normalizeRole)
        .filter((item): item is WorkspaceCandidateRole => Boolean(item)),
    ),
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
    resetWorkspace,
  } = useWorkspace();

  const [candidateText, setCandidateText] = useState("");
  const [supportingText, setSupportingText] = useState("");
  const [cvUpload, setCvUpload] = useState<UploadState>({ status: "idle" });
  const [supportUpload, setSupportUpload] = useState<UploadState>({ status: "idle" });
  const [profileDiff, setProfileDiff] = useState<ProfileDiff | null>(null);

  // ── Accumulated raw record ──────────────────────────────────────────────────
  // Each uploaded file appends here. Build sends all entries as separate documents
  // in a single AI extraction pass — dumb append, then one AI call on everything.
  const [accumulatedDocs, setAccumulatedDocs] = useState<AccumulatedDoc[]>([]);

  const [panelOpen, setPanelOpen] = useState(true);
  const [deleteState, setDeleteState] = useState<"idle" | "confirming" | "deleting">("idle");
  const [isBuilding, setIsBuilding] = useState(false);
  const [buildProgress, setBuildProgress] = useState(0);
  const [buildMsgIdx, setBuildMsgIdx] = useState(0);
  const cvFileInputRef = useRef<HTMLInputElement>(null);
  const supportFileInputRef = useRef<HTMLInputElement>(null);

  // Derive profile early so hint callbacks can reference it
  const profile = state.candidateProfile ?? null;

  // Behavioural enrichment hints
  const [cvHint, setCvHint] = useState<string | null>(null);
  const [cvHintLoading, setCvHintLoading] = useState(false);
  const [supportHint, setSupportHint] = useState<string | null>(null);
  const [supportHintLoading, setSupportHintLoading] = useState(false);

  const fetchHint = useCallback(
    async (
      fieldId: string,
      metrics: FieldMetrics,
      setHint: (h: string | null) => void,
      setLoading: (v: boolean) => void,
    ) => {
      setLoading(true);
      setHint(null);
      try {
        const res = await fetch("/api/workspace/enrich-hint", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fieldId,
            page: "profile",
            currentLength: metrics.currentLength,
            charsTyped: metrics.charsTyped,
            focusDurationMs:
              metrics.totalFocusDurationMs + metrics.currentFocusDurationMs,
            hasExistingProfile: Boolean(profile),
            profileSummary: profile?.summary ?? null,
            profileRoleCount: profile?.roles?.length ?? 0,
            profileClaimCount: profile?.verifiedClaims?.length ?? 0,
          } satisfies Record<string, unknown>),
        });
        const data = (await res.json()) as { ok: boolean; hint: string | null };
        setHint(data.hint ?? null);
      } catch {
        setHint(null);
      } finally {
        setLoading(false);
      }
    },
    [profile],
  );

  const handleCvStuck = useCallback(
    (metrics: FieldMetrics) => {
      void fetchHint("primary-cv", metrics, setCvHint, setCvHintLoading);
    },
    [fetchHint],
  );

  const handleSupportStuck = useCallback(
    (metrics: FieldMetrics) => {
      void fetchHint("supporting-docs", metrics, setSupportHint, setSupportHintLoading);
    },
    [fetchHint],
  );

  const cvField = useBehaviouralField(
    "primary-cv",
    "profile",
    candidateText.length,
    handleCvStuck,
  );

  const supportField = useBehaviouralField(
    "supporting-docs",
    "profile",
    supportingText.length,
    handleSupportStuck,
  );

  useEffect(() => {
    if (!isBuilding) {
      setBuildProgress(0);
      setBuildMsgIdx(0);
      return;
    }
    // Advance progress ~3.14% per second to reach 88% at 28s (under the 30s abort threshold)
    const progressInterval = setInterval(() => {
      setBuildProgress((prev) => Math.min(prev + 88 / 28, 88));
    }, 1000);
    // Cycle messages every 7 seconds (4 messages × 7s = 28s)
    const msgInterval = setInterval(() => {
      setBuildMsgIdx((prev) => (prev + 1) % BUILD_MESSAGES.length);
    }, 7000);
    return () => {
      clearInterval(progressInterval);
      clearInterval(msgInterval);
    };
  }, [isBuilding]);

  // ── File upload ─────────────────────────────────────────────────────────────
  // Each uploaded file is appended to the accumulated raw record.
  // The text is stored in accumulatedDocs and sent to AI at build time.
  // The blobUrl is kept so the user can preview the original file.
  async function handleFileUpload(
    file: File,
    setUpload: (s: UploadState) => void,
    docKind: "primary_cv" | "supporting",
  ) {
    setUpload({ status: "uploading" });
    const blobUrl = URL.createObjectURL(file);

    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/profile/upload-document", {
        method: "POST",
        body: form,
      });
      const data = (await res.json()) as {
        extractedText?: string;
        fileName?: string;
        warnings?: string[];
        metrics?: { extractedChars?: number };
        error?: string;
      };
      if (!res.ok || !data.extractedText) {
        URL.revokeObjectURL(blobUrl);
        setUpload({
          status: "error",
          message: data.error ?? "The file couldn't be read. Try a different format.",
        });
        return;
      }

      const resolvedName = data.fileName ?? file.name;
      const chars = data.metrics?.extractedChars ?? data.extractedText.length;

      // Append to accumulated raw record — never overwrite.
      setAccumulatedDocs((prev) => {
        // Replace if same filename + kind already exists (re-upload), revoke old blob.
        const existing = prev.find((d) => d.name === resolvedName && d.kind === docKind);
        if (existing) URL.revokeObjectURL(existing.blobUrl);
        return [
          ...prev.filter((d) => !(d.name === resolvedName && d.kind === docKind)),
          {
            name: resolvedName,
            kind: docKind,
            text: data.extractedText!,
            chars,
            addedAt: new Date().toLocaleTimeString(),
            blobUrl,
          },
        ];
      });

      setUpload({
        status: "done",
        fileName: resolvedName,
        chars,
        warnings: data.warnings ?? [],
      });
    } catch {
      URL.revokeObjectURL(blobUrl);
      setUpload({
        status: "error",
        message: "Upload failed. Check your connection and try again.",
      });
    }
  }

  function handleClearAccumulatedDocs() {
    for (const doc of accumulatedDocs) {
      URL.revokeObjectURL(doc.blobUrl);
    }
    setAccumulatedDocs([]);
    setCvUpload({ status: "idle" });
    setSupportUpload({ status: "idle" });
  }

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
    const hasCvText = candidateText.trim().length > 0;
    const hasProfile = Boolean(profile);
    const hasSupportingText = supportingText.trim().length > 0;
    const hasAccumulatedDocs = accumulatedDocs.length > 0;

    console.log("[handleBuildProfile] fired", {
      hasCvText,
      hasProfile,
      hasSupportingText,
      accumulatedDocCount: accumulatedDocs.length,
      profileStatus: state.profileStatus,
    });

    setProfileDiff(null);

    // isEnrichMode: profile exists and user is not providing a new primary CV
    const isEnrichMode = Boolean(profile) && !hasCvText && !accumulatedDocs.some((d) => d.kind === "primary_cv");

    // Capture pre-build stats for diff display
    const preStats = {
      roles: profile?.roles?.length ?? 0,
      skills: profile?.coreSkills?.length ?? 0,
      claims: profile?.verifiedClaims?.length ?? 0,
      tools: profile?.tools?.length ?? 0,
    };

    // Require at least one input source
    if (!hasCvText && !hasSupportingText && !hasAccumulatedDocs && !profile) {
      setProfileError("Paste your CV text or upload a document to build your profile.");
      setProfileStatus("error");
      return;
    }

    // Enrichment mode needs at least one new source
    if (isEnrichMode && !hasSupportingText && !hasAccumulatedDocs) {
      setProfileError(
        "Upload an Arbeitszeugnis, certificate, or add notes in the supporting field to enrich your existing profile.",
      );
      setProfileStatus("error");
      return;
    }

    setProfileError(null);
    setIsBuilding(true);
    setProfileStatus("loading");

    // ── Dumb append: assemble full raw record from all sources ─────────────────
    // Order: primary CV first, then accumulated uploads in order, then manual notes.
    // Each source is labelled. The AI receives them as separate labeled documents.
    // This is a single-pass extraction — one AI call on everything together.
    const documents: Array<{
      fileName: string;
      kind: string;
      text: string;
      isPrimary: boolean;
    }> = [];

    if (hasCvText) {
      documents.push({
        fileName: "Primary CV",
        kind: "primary_cv",
        text: candidateText.trim(),
        isPrimary: true,
      });
    }

    for (const doc of accumulatedDocs) {
      documents.push({
        fileName: doc.name,
        kind: doc.kind === "primary_cv" ? "primary_cv" : "uploaded_document",
        text: doc.text,
        isPrimary: doc.kind === "primary_cv",
      });
    }

    if (hasSupportingText) {
      documents.push({
        fileName: "Supporting Notes",
        kind: "user_note",
        text: supportingText.trim(),
        isPrimary: false,
      });
    }

    // Only pass existingProfile in enrich mode.
    const existingProfilePayload = isEnrichMode
      ? ((profile!.rawResponse as Record<string, unknown> | null | undefined) ??
          (profile as unknown as Record<string, unknown>))
      : null;

    // ── Merge audit log ────────────────────────────────────────────────────────
    if (isEnrichMode && profile) {
      const preTitles = (profile.roles ?? []).map((r) => r.title);
      console.group("[Profile merge audit] BEFORE enrichment");
      console.log("Roles (%d):", preTitles.length, preTitles);
      console.log("Core skills (%d):", (profile.coreSkills ?? []).length, profile.coreSkills ?? []);
      console.log("Tools (%d):", (profile.tools ?? []).length, profile.tools ?? []);
      console.log("Verified claims (%d):", (profile.verifiedClaims ?? []).length,
        (profile.verifiedClaims ?? []).map((c) => c.claim));
      console.groupEnd();
    }

    console.log("[handleBuildProfile] document sources:", documents.map((d) => `${d.fileName} (${d.text.length} chars)`));

    // 30-second client-side timeout — aborts the fetch if the AI takes too long.
    const buildAbort = new AbortController();
    const buildTimeoutId = setTimeout(() => buildAbort.abort(), 30000);

    try {
      const response = await fetch("/api/extract-candidate-profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          outputLanguage: "en",
          documents,
          existingProfile: existingProfilePayload,
        }),
        signal: buildAbort.signal,
      });
      clearTimeout(buildTimeoutId);

      const data = (await response.json()) as ExtractCandidateProfileResponse;

      if (
        !response.ok ||
        !("candidateProfile" in data) ||
        !data.candidateProfile
      ) {
        throw new Error(
          "error" in data && data.error
            ? data.error
            : "We ran into a problem building your profile. Please try again.",
        );
      }

      const normalizedProfile = normalizeWorkspaceCandidateProfile(
        data.candidateProfile,
      );

      // ── Post-build merge audit ───────────────────────────────────────────────
      if (isEnrichMode && profile) {
        const preTitles = new Set((profile.roles ?? []).map((r) => r.title));
        const postTitles = (normalizedProfile.roles ?? []).map((r) => r.title);
        const addedRoleTitles = postTitles.filter((t) => !preTitles.has(t));
        const survivingRoleTitles = postTitles.filter((t) => preTitles.has(t));
        const missingRoleTitles = [...preTitles].filter((t) => !postTitles.includes(t));

        console.group("[Profile merge audit] AFTER enrichment");
        console.log("Surviving roles (%d):", survivingRoleTitles.length, survivingRoleTitles);
        console.log("Added roles (%d):", addedRoleTitles.length, addedRoleTitles);
        if (missingRoleTitles.length > 0) {
          console.warn("⚠ MISSING roles (were in pre-state, gone after merge):", missingRoleTitles);
        } else {
          console.log("All pre-existing roles survived ✓");
        }
        const preSkills = new Set(profile.coreSkills ?? []);
        const addedSkills = (normalizedProfile.coreSkills ?? []).filter((s) => !preSkills.has(s));
        console.log("Added skills (%d):", addedSkills.length, addedSkills);
        console.log("Total roles:", postTitles.length, "| Total skills:", (normalizedProfile.coreSkills ?? []).length);
        console.groupEnd();
      } else {
        console.log("[Profile build] Fresh build — %d roles, %d skills",
          normalizedProfile.roles?.length ?? 0, normalizedProfile.coreSkills?.length ?? 0);
      }

      const uploadedFiles = documents.map((d) => d.fileName);

      setCandidateProfile(normalizedProfile);
      setUploadedFiles(uploadedFiles);

      // Compute what changed vs pre-build state
      if (profile) {
        const diff: ProfileDiff = {
          addedRoles: Math.max(0, (normalizedProfile.roles?.length ?? 0) - preStats.roles),
          addedSkills: Math.max(0, (normalizedProfile.coreSkills?.length ?? 0) - preStats.skills),
          addedClaims: Math.max(0, (normalizedProfile.verifiedClaims?.length ?? 0) - preStats.claims),
          addedTools: Math.max(0, (normalizedProfile.tools?.length ?? 0) - preStats.tools),
        };
        const anyChange = diff.addedRoles + diff.addedSkills + diff.addedClaims + diff.addedTools > 0;
        setProfileDiff(anyChange ? diff : null);
      }

      const saveResponse = await fetch("/api/profile/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          profile: normalizedProfile.rawResponse ?? normalizedProfile,
          documents,
          meta: {
            locale: "en",
            sourceCount: uploadedFiles.length,
            readinessLabel: isEnrichMode ? "Profile enriched" : "Profile built",
            bootstrapStatus: "profile_ready",
          },
        }),
      });

      if (!saveResponse.ok) {
        const saveData = (await saveResponse.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(saveData.error || "Your profile was built but we couldn't save it. Please try again.");
      }

      setIsBuilding(false);
      setProfileStatus("ready");
      setProfileError(null);
    } catch (error) {
      clearTimeout(buildTimeoutId);
      setIsBuilding(false);
      setProfileStatus("error");
      setProfileError(
        error instanceof Error && error.name === "AbortError"
          ? "Building your profile is taking longer than expected. Please try again."
          : error instanceof Error
            ? error.message
            : "Unexpected profile error.",
      );
    }
  }

  async function handleDeleteProfile() {
    setDeleteState("deleting");
    try {
      const res = await fetch("/api/profile/delete", { method: "POST" });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? "Delete failed.");
      }
      // Revoke all accumulated blob URLs before clearing state
      for (const doc of accumulatedDocs) {
        URL.revokeObjectURL(doc.blobUrl);
      }
      setAccumulatedDocs([]);
      resetWorkspace();
      setDeleteState("idle");
    } catch {
      // Delete failed — close modal and leave profile intact
      setDeleteState("idle");
    }
  }

  return (
    <div
      style={{
        display: "grid",
        gap: 20,
      }}
    >
      <AccumulatedDocList
        docs={accumulatedDocs}
        onClear={handleClearAccumulatedDocs}
      />

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
              {profile
                ? "Your CV is already in your profile. Leave this empty to enrich your existing profile with supporting documents, or paste an updated CV here to rebuild it."
                : "Paste the main CV text that should anchor the canonical candidate profile."}
            </p>

            <input
              ref={cvFileInputRef}
              type="file"
              accept=".pdf,.docx,.png,.jpg,.jpeg"
              style={{ display: "none" }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  void handleFileUpload(file, setCvUpload, "primary_cv");
                }
                e.target.value = "";
              }}
            />

            <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 10 }}>
              <button
                type="button"
                onClick={() => cvFileInputRef.current?.click()}
                disabled={cvUpload.status === "uploading"}
                style={{
                  ...uploadButtonStyle,
                  opacity: cvUpload.status === "uploading" ? 0.6 : 1,
                  cursor: cvUpload.status === "uploading" ? "not-allowed" : "pointer",
                }}
              >
                {cvUpload.status === "uploading" ? "Extracting..." : "Upload file"}
              </button>
              <span style={{ fontSize: 13, color: t.colors.textMuted }}>
                PDF, DOCX, PNG, JPG — up to 10 MB
              </span>
            </div>

            {cvUpload.status === "done" && (
              <div style={uploadSuccessStyle}>
                Added <strong>{cvUpload.fileName}</strong> ({cvUpload.chars.toLocaleString()} chars) to document list
                {cvUpload.warnings.length > 0 && (
                  <span style={{ color: t.colors.textMuted }}>
                    {" "}({cvUpload.warnings[0]})
                  </span>
                )}
              </div>
            )}
            {cvUpload.status === "error" && (
              <div style={uploadErrorStyle}>{cvUpload.message}</div>
            )}

            <textarea
              value={candidateText}
              onChange={(e) => {
                setCandidateText(e.target.value);
                cvField.fieldProps.onChange(e.target.value);
              }}
              onFocus={cvField.fieldProps.onFocus}
              onBlur={cvField.fieldProps.onBlur}
              onKeyDown={cvField.fieldProps.onKeyDown}
              placeholder={
                profile
                  ? "Leave empty to enrich existing profile, or paste an updated CV to rebuild..."
                  : "Paste primary CV text here, or upload a file above..."
              }
              style={{
                ...textareaStyle,
                minHeight: 320,
                marginTop: 12,
              }}
            />
            <EnrichmentHint
              behaviouralState={cvField.behaviouralState}
              hint={cvHint}
              loading={cvHintLoading}
              onDismiss={() => setCvHint(null)}
            />
          </AppCard>

          <AppCard className="p-6" soft>
            <h2 style={titleStyle}>Supporting documents</h2>
            <p style={copyStyle}>
              {profile
                ? "Upload or paste an Arbeitszeugnis, certificate, reference letter, or any additional evidence. Each upload is added to the document list and included in the next build."
                : "Add clarifications, project details, or extra evidence. Each upload appends to the raw record — all sources are read together in one AI pass."}
            </p>

            <input
              ref={supportFileInputRef}
              type="file"
              accept=".pdf,.docx,.png,.jpg,.jpeg"
              style={{ display: "none" }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  void handleFileUpload(file, setSupportUpload, "supporting");
                }
                e.target.value = "";
              }}
            />

            <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 10 }}>
              <button
                type="button"
                onClick={() => supportFileInputRef.current?.click()}
                disabled={supportUpload.status === "uploading"}
                style={{
                  ...uploadButtonStyle,
                  opacity: supportUpload.status === "uploading" ? 0.6 : 1,
                  cursor: supportUpload.status === "uploading" ? "not-allowed" : "pointer",
                }}
              >
                {supportUpload.status === "uploading" ? "Extracting..." : "Upload file"}
              </button>
              <span style={{ fontSize: 13, color: t.colors.textMuted }}>
                PDF, DOCX, PNG, JPG — up to 10 MB
              </span>
            </div>

            {supportUpload.status === "done" && (
              <div style={uploadSuccessStyle}>
                Added <strong>{supportUpload.fileName}</strong> ({supportUpload.chars.toLocaleString()} chars) to document list
                {supportUpload.warnings.length > 0 && (
                  <span style={{ color: t.colors.textMuted }}>
                    {" "}({supportUpload.warnings[0]})
                  </span>
                )}
              </div>
            )}
            {supportUpload.status === "error" && (
              <div style={uploadErrorStyle}>{supportUpload.message}</div>
            )}

            <textarea
              value={supportingText}
              onChange={(e) => {
                setSupportingText(e.target.value);
                supportField.fieldProps.onChange(e.target.value);
              }}
              onFocus={supportField.fieldProps.onFocus}
              onBlur={supportField.fieldProps.onBlur}
              onKeyDown={supportField.fieldProps.onKeyDown}
              placeholder={
                profile
                  ? "Paste Arbeitszeugnis, certificate, or reference letter here, or upload a file above..."
                  : "Add clarifications or additional achievements, or upload a file above..."
              }
              style={{
                ...textareaStyle,
                minHeight: 220,
                marginTop: 12,
              }}
            />
            <EnrichmentHint
              behaviouralState={supportField.behaviouralState}
              hint={supportHint}
              loading={supportHintLoading}
              onDismiss={() => setSupportHint(null)}
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
            {/* Panel header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h2 style={titleStyle}>Profile</h2>
              <button
                type="button"
                onClick={() => setPanelOpen((v) => !v)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: t.colors.textMuted,
                  fontSize: 13,
                  fontWeight: 600,
                  padding: "4px 8px",
                  borderRadius: 6,
                }}
              >
                {panelOpen ? "Hide" : "Details"}
              </button>
            </div>

            {/* Expanded: ring + status side by side */}
            {panelOpen && (
              <div style={{ marginTop: 16 }}>
                <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                  <ProfileCompletenessRing
                    profile={profile}
                    uploadedDocCount={accumulatedDocs.length}
                  />
                  <div style={{ flex: 1, display: "grid", gap: 10 }}>
                    <StatusLine label="Status" value={toDisplayStatus(state.profileStatus)} />
                    <StatusLine
                      label="Sources"
                      value={state.uploadedFiles.length ? state.uploadedFiles.join(", ") : "None yet"}
                    />
                    <StatusLine label="Profile" value={profile ? "Ready" : "Not built"} />
                    <StatusLine label="Roles" value={String(profileStats.roles)} />
                    <StatusLine label="Skills" value={String(profileStats.skills)} />
                    <StatusLine label="Claims" value={String(profileStats.claims)} />
                  </div>
                </div>
              </div>
            )}

            {/* Collapsed: slim status bar */}
            {!panelOpen && (
              <div
                style={{
                  marginTop: 10,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 13,
                  color: t.colors.textSecondary,
                }}
              >
                <span style={{ fontWeight: 700, color: t.colors.textPrimary }}>
                  {profile ? "Ready" : "Not built"}
                </span>
                {profile && (
                  <>
                    <span style={{ color: t.colors.border }}>·</span>
                    <span>{profileStats.roles} roles</span>
                    <span style={{ color: t.colors.border }}>·</span>
                    <span>{profileStats.skills} skills</span>
                    <span style={{ color: t.colors.border }}>·</span>
                    <span>{profileStats.claims} claims</span>
                  </>
                )}
              </div>
            )}

            {/* Always visible: diff, error, action buttons */}
            {profileDiff && (
              <div style={diffBoxStyle}>
                <span style={{ fontWeight: 700, color: t.colors.textPrimary }}>
                  Profile updated
                </span>
                <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: "4px 12px" }}>
                  {profileDiff.addedRoles > 0 && (
                    <span>+{profileDiff.addedRoles} role{profileDiff.addedRoles > 1 ? "s" : ""}</span>
                  )}
                  {profileDiff.addedSkills > 0 && (
                    <span>+{profileDiff.addedSkills} skill{profileDiff.addedSkills > 1 ? "s" : ""}</span>
                  )}
                  {profileDiff.addedTools > 0 && (
                    <span>+{profileDiff.addedTools} tool{profileDiff.addedTools > 1 ? "s" : ""}</span>
                  )}
                  {profileDiff.addedClaims > 0 && (
                    <span>+{profileDiff.addedClaims} verified claim{profileDiff.addedClaims > 1 ? "s" : ""}</span>
                  )}
                </div>
              </div>
            )}

            {state.profileError ? (
              <div>
                <div style={errorBoxStyle}>{state.profileError}</div>
                <button
                  type="button"
                  onClick={handleBuildProfile}
                  style={{
                    ...secondaryButtonStyle,
                    width: "100%",
                    marginTop: 10,
                  }}
                >
                  Try again
                </button>
              </div>
            ) : null}

            {isBuilding ? (
              <div style={{ marginTop: 16 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: t.colors.textPrimary,
                    marginBottom: 10,
                  }}
                >
                  {BUILD_MESSAGES[buildMsgIdx]}
                </div>
                <div
                  style={{
                    background: "#f1f5f9",
                    borderRadius: 6,
                    height: 6,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      background: "#0f172a",
                      borderRadius: 6,
                      width: `${buildProgress}%`,
                      transition: "width 1s linear",
                    }}
                  />
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleBuildProfile}
                disabled={state.profileStatus === "loading"}
                style={{
                  ...primaryButtonStyle,
                  width: "100%",
                  marginTop: 16,
                  opacity: state.profileStatus === "loading" ? 0.8 : 1,
                  cursor: state.profileStatus === "loading" ? "not-allowed" : "pointer",
                }}
              >
                {profile && !candidateText.trim() && !accumulatedDocs.some((d) => d.kind === "primary_cv")
                  ? "Enrich profile"
                  : profile
                    ? "Rebuild profile"
                    : "Build profile"}
              </button>
            )}

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

            {profile && (
              <button
                type="button"
                onClick={() => setDeleteState("confirming")}
                style={{
                  marginTop: 16,
                  width: "100%",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 500,
                  color: t.colors.textMuted,
                  padding: "2px 0",
                  textAlign: "center",
                }}
              >
                Delete profile
              </button>
            )}
          </AppCard>
        </div>
      </div>

      {/* ── Delete confirmation modal ──────────────────────────── */}
      {deleteState !== "idle" && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 200,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && deleteState !== "deleting") {
              setDeleteState("idle");
            }
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: 12,
              padding: "28px 32px",
              maxWidth: 420,
              width: "90%",
              boxShadow: "0 20px 48px rgba(0,0,0,0.18)",
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: 18,
                fontWeight: 800,
                color: t.colors.textPrimary,
              }}
            >
              Delete your profile?
            </h2>
            <p
              style={{
                margin: "12px 0 0",
                fontSize: 14,
                lineHeight: 1.7,
                color: t.colors.textSecondary,
              }}
            >
              This will permanently delete your profile data and all uploaded
              documents. This cannot be undone.
            </p>
            <div
              style={{
                display: "flex",
                gap: 10,
                marginTop: 24,
                justifyContent: "flex-end",
              }}
            >
              <button
                type="button"
                onClick={() => setDeleteState("idle")}
                disabled={deleteState === "deleting"}
                style={{
                  height: 38,
                  padding: "0 16px",
                  borderRadius: t.radius.sm,
                  border: `1px solid ${t.colors.border}`,
                  background: t.colors.surface,
                  color: t.colors.textPrimary,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: deleteState === "deleting" ? "not-allowed" : "pointer",
                  opacity: deleteState === "deleting" ? 0.6 : 1,
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteProfile}
                disabled={deleteState === "deleting"}
                style={{
                  height: 38,
                  padding: "0 16px",
                  borderRadius: t.radius.sm,
                  border: "none",
                  background: "#DC2626",
                  color: "#ffffff",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: deleteState === "deleting" ? "not-allowed" : "pointer",
                  opacity: deleteState === "deleting" ? 0.7 : 1,
                }}
              >
                {deleteState === "deleting" ? "Deleting…" : "Yes, delete everything"}
              </button>
            </div>
          </div>
        </div>
      )}
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

const uploadButtonStyle: CSSProperties = {
  height: 36,
  border: `1px solid ${t.colors.border}`,
  borderRadius: t.radius.sm,
  background: t.colors.surface,
  color: t.colors.textPrimary,
  fontSize: 13,
  fontWeight: 700,
  padding: "0 14px",
  flexShrink: 0,
};

const uploadSuccessStyle: CSSProperties = {
  marginTop: 10,
  padding: "8px 12px",
  borderRadius: t.radius.sm,
  background: t.colors.accentGreen,
  color: t.colors.textSecondary,
  fontSize: 13,
  lineHeight: 1.5,
};

const uploadErrorStyle: CSSProperties = {
  marginTop: 10,
  padding: "8px 12px",
  borderRadius: t.radius.sm,
  background: t.colors.danger,
  color: t.colors.textPrimary,
  fontSize: 13,
  lineHeight: 1.5,
};

const diffBoxStyle: CSSProperties = {
  marginTop: 14,
  padding: "10px 12px",
  borderRadius: t.radius.sm,
  background: t.colors.accentGreen,
  color: t.colors.textSecondary,
  fontSize: 13,
  lineHeight: 1.5,
};

// ── Accumulated document list ─────────────────────────────────────────────────
// Replaces the old DocumentBookshelf. Shows every accumulated source with its
// char count and kind. Clear button revokes all blob URLs and resets the list.

function AccumulatedDocList({
  docs,
  onClear,
}: {
  docs: AccumulatedDoc[];
  onClear: () => void;
}) {
  return (
    <AppCard className="p-4">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", minHeight: 36 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: t.colors.textPrimary }}>
          {docs.length === 0
            ? "Document list — empty"
            : `${docs.length} document${docs.length > 1 ? "s" : ""} queued for next build`}
        </span>
        {docs.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            style={{
              background: "none",
              border: `1px solid ${t.colors.border}`,
              borderRadius: t.radius.sm,
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 600,
              color: t.colors.textMuted,
              padding: "4px 10px",
            }}
          >
            Clear all
          </button>
        )}
      </div>

      {docs.length === 0 ? (
        <p style={{ fontSize: 13, color: t.colors.textMuted, margin: "8px 0 0" }}>
          Upload your CV and supporting documents above. Each upload is added here and sent together in one AI extraction pass.
        </p>
      ) : (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
          {docs.map((doc) => {
            const ext = doc.name.split(".").pop()?.toLowerCase() ?? "";
            const icon = ext === "pdf" ? "📄" : ext === "docx" ? "📝" : "🖼";
            return (
              <a
                key={`${doc.kind}-${doc.name}`}
                href={doc.blobUrl}
                target="_blank"
                rel="noopener noreferrer"
                title={`${doc.name}\n${doc.kind === "primary_cv" ? "Primary CV" : "Supporting"} · added ${doc.addedAt} · ${doc.chars.toLocaleString()} chars`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "5px 10px",
                  borderRadius: t.radius.sm,
                  border: `1px solid ${t.colors.border}`,
                  background: t.colors.surface,
                  textDecoration: "none",
                  fontSize: 13,
                  color: t.colors.textPrimary,
                  flexShrink: 0,
                }}
              >
                <span aria-hidden>{icon}</span>
                <span style={{ fontWeight: 600 }}>{doc.name}</span>
                <span style={{ color: t.colors.textMuted, fontSize: 11 }}>
                  {doc.chars.toLocaleString()} chars
                </span>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                    color: doc.kind === "primary_cv" ? "#2563EB" : t.colors.textMuted,
                  }}
                >
                  {doc.kind === "primary_cv" ? "CV" : "Support"}
                </span>
              </a>
            );
          })}
        </div>
      )}
    </AppCard>
  );
}

// ── Profile completeness ring ──────────────────────────────────────────────────

type RingSection = {
  label: string;
  fill: number; // 0–1
  color: string;
};

function ProfileCompletenessRing({
  profile,
  uploadedDocCount,
}: {
  profile: WorkspaceCandidateProfile | null;
  uploadedDocCount: number;
}) {
  const sections: RingSection[] = [
    {
      label: "Personal info",
      fill: profile
        ? Math.min(
            ((profile.fullName ? 1 : 0) +
              (profile.headline ? 1 : 0) +
              (profile.summary ? 1 : 0)) /
              3,
            1,
          )
        : 0,
      color: "#9EC5FF",
    },
    {
      label: "Experience",
      fill: Math.min((profile?.roles?.length ?? 0) / 5, 1),
      color: "#BDE7D0",
    },
    {
      label: "Education",
      fill: Math.min((profile?.education?.length ?? 0) / 2, 1),
      color: "#F7E7A8",
    },
    {
      label: "Skills",
      fill: Math.min((profile?.coreSkills?.length ?? 0) / 10, 1),
      color: "#F9C5D1",
    },
    {
      label: "Claims",
      fill: Math.min((profile?.verifiedClaims?.length ?? 0) / 5, 1),
      color: "#D4B5F0",
    },
    {
      label: "Documents",
      fill: Math.min(uploadedDocCount / 3, 1),
      color: "#FFD7A8",
    },
  ];

  const size = 80;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const cx = size / 2;
  const cy = size / 2;
  const totalFill = sections.reduce((acc, s) => acc + s.fill, 0) / sections.length;

  const segmentAngle = 360 / sections.length;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        {/* Background track */}
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke="#f1f5f9"
          strokeWidth={strokeWidth}
        />
        {/* Filled arc */}
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke={totalFill >= 0.8 ? "#BDE7D0" : totalFill >= 0.5 ? "#F7E7A8" : "#9EC5FF"}
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference * totalFill} ${circumference * (1 - totalFill)}`}
          strokeLinecap="round"
        />
        {/* Center text */}
        <text
          x={cx}
          y={cy}
          textAnchor="middle"
          dominantBaseline="central"
          style={{
            fontSize: 16,
            fontWeight: 800,
            fill: "#0f172a",
            transform: "rotate(90deg)",
            transformOrigin: `${cx}px ${cy}px`,
          }}
        >
          {Math.round(totalFill * 100)}%
        </text>
      </svg>
      <div style={{ fontSize: 11, color: t.colors.textMuted, textAlign: "center" }}>
        {sections.map((s) => (
          <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: s.fill > 0 ? s.color : "#e2e8f0",
                flexShrink: 0,
              }}
            />
            <span>{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Suppress unused var warning — segmentAngle computed above but ring uses totalFill arc.
void (0 as unknown as typeof segmentAngle);
