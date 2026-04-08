"use client";

import {
  type CSSProperties,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
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
  WorkspaceDocument,
  WorkspaceDocumentType,
  WorkspaceVerifiedClaim,
} from "@/lib/workspace/types";

const t = designTokens;

// ── Types ─────────────────────────────────────────────────────────────────────

// DocType re-exported from workspace types for convenience in this file.
type DocType = WorkspaceDocumentType;

// AccumulatedDoc extends the persisted WorkspaceDocument with a browser-only blobUrl
// for in-session file previews. blobUrl is never stored in state.
type AccumulatedDoc = WorkspaceDocument & { blobUrl: string | null };

type ProfileDiff = {
  addedRoles: number;
  addedSkills: number;
  addedClaims: number;
  addedTools: number;
};

type UploadStatus =
  | { status: "idle" }
  | { status: "uploading" }
  | { status: "error"; message: string };

// Holds an uploaded file that is awaiting type confirmation before being
// committed to the document library.
type PendingDoc = {
  fileName: string;
  text: string;
  chars: number;
  blobUrl: string;
  docType: DocType;
  customLabel: string;
};

type ExtractCandidateProfileSuccess = {
  candidateProfile: Record<string, unknown>;
  warnings?: string[];
};
type ExtractCandidateProfileError = { error?: string };
type ExtractCandidateProfileResponse =
  | ExtractCandidateProfileSuccess
  | ExtractCandidateProfileError;

const BUILD_MESSAGES = [
  "Reading your experience…",
  "Extracting skills and achievements…",
  "Identifying key strengths…",
  "Almost there…",
];

const DOC_TYPE_LABELS: Record<DocType, string> = {
  cv: "CV",
  certificate: "Certificate",
  reference: "Reference",
  other: "Other",
};

// ── Profile normalisation helpers ─────────────────────────────────────────────

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

function extractYear(dateStr: string | null): number {
  if (!dateStr) return 0;
  const match = dateStr.match(/\b(19|20)\d{2}\b/);
  return match ? parseInt(match[0], 10) : 0;
}

function sortRolesDescending(
  roles: WorkspaceCandidateRole[],
): WorkspaceCandidateRole[] {
  return [...roles].sort((a, b) => {
    if (a.isCurrent && !b.isCurrent) return -1;
    if (!a.isCurrent && b.isCurrent) return 1;
    const startA = extractYear(a.startDate);
    const startB = extractYear(b.startDate);
    if (startA !== startB) return startB - startA;
    return extractYear(b.endDate) - extractYear(a.endDate);
  });
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
  return { language, proficiency: asString(item.proficiency) };
}

function normalizeEducation(
  input: unknown,
): WorkspaceCandidateEducation | null {
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

// (client-side mergeProfiles removed — the server is now the single authority for
// all profile merging. Same-doc rebuilds return fresh as authoritative; new-doc
// enrichments are unioned + canonicalized server-side. Client-side union was the
// primary inflation source: AI rephrasing of the same evidence was accepted as
// new knowledge on every rebuild.)

// ── Style constants ───────────────────────────────────────────────────────────

const titleStyle: CSSProperties = {
  margin: 0,
  fontSize: 20,
  fontWeight: 800,
  color: t.colors.textPrimary,
};

const subTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: 15,
  fontWeight: 700,
  color: t.colors.textPrimary,
};

const copyStyle: CSSProperties = {
  margin: "6px 0 0",
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
  boxSizing: "border-box",
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
  cursor: "pointer",
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
  cursor: "pointer",
};

const listCardStyle: CSSProperties = {
  border: `1px solid ${t.colors.border}`,
  borderRadius: t.radius.md,
  background: t.colors.surface,
  padding: 12,
};

// ── Main component ────────────────────────────────────────────────────────────

export default function WorkspaceProfilePage() {
  const router = useRouter();
  const {
    state,
    setDocuments,
    setCandidateProfile,
    setUploadedFiles,
    setProfileStatus,
    setProfileError,
    resetWorkspace,
  } = useWorkspace();

  // Document library
  const [docs, setDocs] = useState<AccumulatedDoc[]>([]);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>({
    status: "idle",
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const docIdRef = useRef(0);
  const [pendingDoc, setPendingDoc] = useState<PendingDoc | null>(null);
  // Guards the Document Library hydration so it fires exactly once — the first
  // time state.documents becomes non-empty (whether from sessionStorage on mount
  // or from the DB load that arrives after mount).
  const hasHydratedDocs = useRef(false);

  // Paste-text staging
  const [pasteText, setPasteText] = useState("");
  const [pasteDocType, setPasteDocType] = useState<DocType>("cv");
  const [pasteCustomLabel, setPasteCustomLabel] = useState("");

  // Language preference (UI only — no pipeline behavior)
  const [preferredLang, setPreferredLang] = useState<"en" | "de" | "es">("en");

  // Build state
  const [isBuilding, setIsBuilding] = useState(false);
  const [buildProgress, setBuildProgress] = useState(0);
  const [buildMsgIdx, setBuildMsgIdx] = useState(0);
  const [profileDiff, setProfileDiff] = useState<ProfileDiff | null>(null);

  // Delete modal
  const [deleteState, setDeleteState] = useState<
    "idle" | "confirming" | "deleting"
  >("idle");

  // Enrichment hint for paste field
  const [pasteHint, setPasteHint] = useState<string | null>(null);
  const [pasteHintLoading, setPasteHintLoading] = useState(false);

  const profile = state.candidateProfile ?? null;
  const isEnrichMode = Boolean(profile) && !docs.some((d) => d.docType === "cv");

  function generateDocId(): string {
    return `doc-${++docIdRef.current}-${Date.now()}`;
  }

  // ── Hydrate Document Library from persisted state ─────────────────────────
  // No dep array: runs after every render until hydration fires once.
  // This avoids the "dep array changed size" warning that occurs when switching
  // from [] (mount-only) to [state.documents] (size-1) during a hot reload —
  // React's size check is skipped when the new dep array is null (omitted).
  // After hasHydratedDocs is set, the body is a cheap early-return on every
  // subsequent render.
  // Catches both sources:
  //   1. sessionStorage restoration — state.documents is populated at mount
  //   2. DB load via /api/profile/load — state.documents arrives after mount
  // The hasHydratedDocs ref prevents a sync loop with the write-back effect.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (hasHydratedDocs.current) return;
    if (state.documents.length > 0) {
      hasHydratedDocs.current = true;
      setDocs(state.documents.map((d) => ({ ...d, blobUrl: null })));
    }
  });

  // ── Sync Document Library back to persisted state when docs change ──────────
  // Strips the blobUrl (browser-only) before persisting.
  useEffect(() => {
    const persisted: WorkspaceDocument[] = docs.map(
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      ({ blobUrl: _b, ...rest }) => rest,
    );
    setDocuments(persisted);
  }, [docs, setDocuments]);

  // ── Behavioural field for paste area ───────────────────────────────────────

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
            metrics,
            profileClaimCount: profile?.verifiedClaims?.length ?? 0,
            profileRoleCount: profile?.roles?.length ?? 0,
          }),
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

  const handlePasteStuck = useCallback(
    (metrics: FieldMetrics) => {
      void fetchHint("paste-text", metrics, setPasteHint, setPasteHintLoading);
    },
    [fetchHint],
  );

  const pasteField = useBehaviouralField(
    "paste-text",
    "profile",
    pasteText.length,
    handlePasteStuck,
  );

  // ── Build progress animation ───────────────────────────────────────────────

  useEffect(() => {
    if (!isBuilding) {
      setBuildProgress(0);
      setBuildMsgIdx(0);
      return;
    }
    const progressInterval = setInterval(() => {
      setBuildProgress((prev) => Math.min(prev + 88 / 28, 88));
    }, 1000);
    const msgInterval = setInterval(() => {
      setBuildMsgIdx((prev) => (prev + 1) % BUILD_MESSAGES.length);
    }, 7000);
    return () => {
      clearInterval(progressInterval);
      clearInterval(msgInterval);
    };
  }, [isBuilding]);

  // ── File upload ────────────────────────────────────────────────────────────

  async function handleFileUpload(file: File) {
    setUploadStatus({ status: "uploading" });
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
        setUploadStatus({
          status: "error",
          message: data.error ?? "The file couldn't be read. Try a different format.",
        });
        return;
      }
      const fileName = data.fileName ?? file.name;
      const chars = data.metrics?.extractedChars ?? data.extractedText.length;
      // Don't add to docs yet — hold in pendingDoc so the user confirms type first.
      setPendingDoc({
        fileName,
        text: data.extractedText!,
        chars,
        blobUrl,
        docType: "cv",
        customLabel: "",
      });
      setUploadStatus({ status: "idle" });
    } catch {
      URL.revokeObjectURL(blobUrl);
      setUploadStatus({
        status: "error",
        message: "Upload failed. Check your connection and try again.",
      });
    }
  }

  // ── Paste text → document entry ────────────────────────────────────────────

  function handleAddPasted() {
    const text = pasteText.trim();
    if (!text) return;
    const id = generateDocId();
    const fileName =
      pasteDocType === "other" && pasteCustomLabel.trim()
        ? pasteCustomLabel.trim()
        : pasteDocType === "cv"
          ? "Pasted CV"
          : pasteDocType === "certificate"
            ? "Pasted Certificate"
            : pasteDocType === "reference"
              ? "Pasted Reference"
              : "Pasted text";
    setDocs((prev) => [
      ...prev,
      {
        id,
        fileName,
        docType: pasteDocType,
        customLabel: pasteCustomLabel,
        text,
        chars: text.length,
        uploadedAt: new Date().toLocaleTimeString(),
        blobUrl: null,
      },
    ]);
    setPasteText("");
    setPasteCustomLabel("");
    pasteField.resetField();
  }

  // ── Document library controls ──────────────────────────────────────────────

  function handleDocTypeChange(id: string, docType: DocType) {
    setDocs((prev) =>
      prev.map((d) => (d.id === id ? { ...d, docType } : d)),
    );
  }

  function handleDocLabelChange(id: string, label: string) {
    setDocs((prev) =>
      prev.map((d) => (d.id === id ? { ...d, customLabel: label } : d)),
    );
  }

  function handleRemoveDoc(id: string) {
    setDocs((prev) => {
      const doc = prev.find((d) => d.id === id);
      if (doc?.blobUrl) URL.revokeObjectURL(doc.blobUrl);
      return prev.filter((d) => d.id !== id);
    });
  }

  function handleConfirmPendingDoc() {
    if (!pendingDoc) return;
    const id = generateDocId();
    setDocs((prev) => {
      // Replace if same filename already exists
      const existing = prev.find((d) => d.fileName === pendingDoc.fileName && d.blobUrl !== null);
      if (existing?.blobUrl) URL.revokeObjectURL(existing.blobUrl);
      return [
        ...prev.filter((d) => !(d.fileName === pendingDoc.fileName && d.blobUrl !== null)),
        {
          id,
          fileName: pendingDoc.fileName,
          docType: pendingDoc.docType,
          customLabel: pendingDoc.customLabel,
          text: pendingDoc.text,
          chars: pendingDoc.chars,
          uploadedAt: new Date().toLocaleTimeString(),
          blobUrl: pendingDoc.blobUrl,
        },
      ];
    });
    setPendingDoc(null);
  }

  function handleCancelPendingDoc() {
    if (pendingDoc?.blobUrl) URL.revokeObjectURL(pendingDoc.blobUrl);
    setPendingDoc(null);
  }

  function handleClearDocs() {
    for (const doc of docs) {
      if (doc.blobUrl) URL.revokeObjectURL(doc.blobUrl);
    }
    if (pendingDoc?.blobUrl) URL.revokeObjectURL(pendingDoc.blobUrl);
    setPendingDoc(null);
    setDocs([]);
    setUploadStatus({ status: "idle" });
  }

  // ── Build profile ──────────────────────────────────────────────────────────

  async function handleBuildProfile() {
    if (docs.length === 0) {
      setProfileError(
        profile
          ? "Add at least one document to enrich your profile."
          : "Add at least one document to build your profile.",
      );
      setProfileStatus("error");
      return;
    }

    setProfileDiff(null);
    setIsBuilding(true);
    setProfileStatus("loading");
    setProfileError(null);

    const preStats = {
      roles: profile?.roles?.length ?? 0,
      skills: profile?.coreSkills?.length ?? 0,
      claims: profile?.verifiedClaims?.length ?? 0,
      tools: profile?.tools?.length ?? 0,
    };

    const documents = docs.map((doc) => ({
      fileName: doc.fileName,
      kind: doc.docType === "cv" ? "primary_cv" : doc.docType === "reference" ? "arbeitszeugnis" : doc.docType,
      text: doc.text,
      isPrimary: doc.docType === "cv",
      description:
        doc.docType === "other" && doc.customLabel ? doc.customLabel : undefined,
    }));

    // Always send the existing profile to the server when one exists.
    // The server uses sourceFingerprint to decide: same-doc rebuild (authoritative fresh)
    // vs new-doc enrichment (union + canonicalize). isEnrichMode must not gate this —
    // rebuilds with a CV doc also need fingerprint comparison.
    const existingProfilePayload = profile
      ? ((profile.rawResponse as Record<string, unknown> | null | undefined) ??
          (profile as unknown as Record<string, unknown>))
      : null;

    const buildAbort = new AbortController();
    const buildTimeoutId = setTimeout(() => buildAbort.abort(), 90000);

    try {
      const response = await fetch("/api/extract-candidate-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outputLanguage: "en",
          documents,
          existingProfile: existingProfilePayload,
        }),
        signal: buildAbort.signal,
      });
      clearTimeout(buildTimeoutId);

      const data =
        (await response.json()) as ExtractCandidateProfileResponse;

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

      // The server is the single authority for profile merging.
      // Same-doc rebuilds: server returns fresh as authoritative (no union).
      // New-doc enrichments: server unions + canonicalizes, then returns result.
      // No client-side union — it was the primary inflation source.
      const normalizedProfile = normalizeWorkspaceCandidateProfile(
        data.candidateProfile,
      );
      const uploadedFiles = documents.map((d) => d.fileName);

      setCandidateProfile(normalizedProfile);
      setUploadedFiles(uploadedFiles);

      if (profile) {
        const diff: ProfileDiff = {
          addedRoles: Math.max(
            0,
            (normalizedProfile.roles?.length ?? 0) - preStats.roles,
          ),
          addedSkills: Math.max(
            0,
            (normalizedProfile.coreSkills?.length ?? 0) - preStats.skills,
          ),
          addedClaims: Math.max(
            0,
            (normalizedProfile.verifiedClaims?.length ?? 0) - preStats.claims,
          ),
          addedTools: Math.max(
            0,
            (normalizedProfile.tools?.length ?? 0) - preStats.tools,
          ),
        };
        const anyChange =
          diff.addedRoles + diff.addedSkills + diff.addedClaims + diff.addedTools > 0;
        setProfileDiff(anyChange ? diff : null);
      }

      const saveResponse = await fetch("/api/profile/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
        throw new Error(
          saveData.error ||
            "Your profile was built but we couldn't save it. Please try again.",
        );
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

  // ── Delete profile ─────────────────────────────────────────────────────────

  async function handleDeleteProfile() {
    setDeleteState("deleting");
    try {
      const res = await fetch("/api/profile/delete", { method: "POST" });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? "Delete failed.");
      }
      for (const doc of docs) {
        if (doc.blobUrl) URL.revokeObjectURL(doc.blobUrl);
      }
      setDocs([]);
      setProfileDiff(null);
      resetWorkspace();
      setDeleteState("idle");
    } catch {
      setDeleteState("idle");
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: "grid", gap: 20 }}>
      {/* Language switch — top right */}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <LanguageSwitch value={preferredLang} onChange={setPreferredLang} />
      </div>

      {/* Document Library — full width */}
      <AppCard className="p-6">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 14,
          }}
        >
          <h2 style={titleStyle}>Document Library</h2>
          {docs.length > 0 && (
            <button
              type="button"
              onClick={handleClearDocs}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 600,
                color: t.colors.textMuted,
                padding: "4px 8px",
              }}
            >
              Clear all
            </button>
          )}
        </div>

        {/* Horizontal document shelf — fixed height, does not grow with more docs */}
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            gap: 10,
            overflowX: "auto",
            overflowY: "hidden",
            minHeight: 162,
            maxHeight: 162,
            alignItems: "stretch",
            paddingBottom: 4,
          }}
        >
          {/* Empty state */}
          {docs.length === 0 && !pendingDoc && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                color: t.colors.textMuted,
                fontSize: 13,
                paddingLeft: 2,
                whiteSpace: "nowrap",
              }}
            >
              No documents yet — upload a file or paste text below.
            </div>
          )}

          {/* Confirmed doc tiles */}
          {docs.map((doc) => (
            <div
              key={doc.id}
              style={{
                display: "flex",
                flexDirection: "column",
                width: 152,
                minWidth: 152,
                padding: "8px 10px",
                borderRadius: t.radius.md,
                border: `1px solid ${t.colors.border}`,
                background: t.colors.surface,
                flexShrink: 0,
                overflow: "hidden",
              }}
            >
              {/* Icon + remove */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                <span aria-hidden style={{ fontSize: 15 }}>
                  {doc.blobUrl ? "📄" : "📝"}
                </span>
                <button
                  type="button"
                  onClick={() => handleRemoveDoc(doc.id)}
                  aria-label={`Remove ${doc.fileName}`}
                  style={{ background: "none", border: "none", cursor: "pointer", fontSize: 15, color: t.colors.textMuted, lineHeight: 1, padding: 0 }}
                >
                  ×
                </button>
              </div>

              {/* Filename */}
              {doc.blobUrl ? (
                <a
                  href={doc.blobUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={doc.fileName}
                  style={{ fontWeight: 700, fontSize: 12, color: t.colors.textPrimary, textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block", marginBottom: 6, flex: 1 }}
                >
                  {doc.fileName}
                </a>
              ) : (
                <span
                  title={doc.fileName}
                  style={{ fontWeight: 700, fontSize: 12, color: t.colors.textPrimary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block", marginBottom: 6, flex: 1 }}
                >
                  {doc.fileName}
                </span>
              )}

              {/* Type selector */}
              <select
                value={doc.docType}
                onChange={(e) => handleDocTypeChange(doc.id, e.target.value as DocType)}
                style={{ fontSize: 11, fontWeight: 600, border: `1px solid ${t.colors.border}`, borderRadius: t.radius.sm, background: t.colors.surface, color: t.colors.textPrimary, padding: "2px 4px", cursor: "pointer", width: "100%", marginBottom: 4 }}
              >
                {(["cv", "reference", "certificate", "other"] as DocType[]).map((dt) => (
                  <option key={dt} value={dt}>{DOC_TYPE_LABELS[dt]}</option>
                ))}
              </select>

              {/* Custom label for Other */}
              {doc.docType === "other" && (
                <input
                  type="text"
                  placeholder="Label…"
                  value={doc.customLabel}
                  onChange={(e) => handleDocLabelChange(doc.id, e.target.value)}
                  style={{ fontSize: 11, border: `1px solid ${t.colors.border}`, borderRadius: t.radius.sm, background: t.colors.surface, color: t.colors.textPrimary, padding: "2px 6px", width: "100%", outline: "none", marginBottom: 4, boxSizing: "border-box" }}
                />
              )}

              {/* Char count */}
              <span style={{ fontSize: 10, color: t.colors.textMuted, marginTop: "auto" }}>
                {doc.chars.toLocaleString()} chars
              </span>
            </div>
          ))}

          {/* Pending tile — awaiting type confirmation */}
          {pendingDoc && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                width: 230,
                minWidth: 230,
                padding: "10px 12px",
                borderRadius: t.radius.md,
                border: `2px solid ${t.colors.primary}`,
                background: t.colors.primarySoft,
                flexShrink: 0,
                gap: 6,
                overflow: "hidden",
              }}
            >
              {/* Filename + cancel */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 6 }}>
                <span style={{ fontWeight: 700, fontSize: 12, color: t.colors.textPrimary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }} title={pendingDoc.fileName}>
                  {pendingDoc.fileName}
                </span>
                <button
                  type="button"
                  onClick={handleCancelPendingDoc}
                  aria-label="Cancel"
                  style={{ background: "none", border: "none", cursor: "pointer", fontSize: 15, color: t.colors.textMuted, padding: 0, flexShrink: 0 }}
                >
                  ×
                </button>
              </div>

              <span style={{ fontSize: 11, fontWeight: 700, color: t.colors.textSecondary }}>
                Choose type:
              </span>

              {/* Type buttons */}
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {(["cv", "reference", "certificate", "other"] as DocType[]).map((dt) => (
                  <button
                    key={dt}
                    type="button"
                    onClick={() => setPendingDoc((p) => p ? { ...p, docType: dt } : p)}
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      padding: "3px 7px",
                      borderRadius: t.radius.sm,
                      border: `1px solid ${pendingDoc.docType === dt ? t.colors.textPrimary : t.colors.border}`,
                      background: pendingDoc.docType === dt ? t.colors.textPrimary : t.colors.surface,
                      color: pendingDoc.docType === dt ? t.colors.surface : t.colors.textPrimary,
                      cursor: "pointer",
                    }}
                  >
                    {dt === "reference" ? "Zeugnis/Ref" : DOC_TYPE_LABELS[dt]}
                  </button>
                ))}
              </div>

              {/* Custom label for Other */}
              {pendingDoc.docType === "other" && (
                <input
                  type="text"
                  placeholder="Short label…"
                  value={pendingDoc.customLabel}
                  onChange={(e) => setPendingDoc((p) => p ? { ...p, customLabel: e.target.value } : p)}
                  style={{ fontSize: 11, border: `1px solid ${t.colors.border}`, borderRadius: t.radius.sm, background: t.colors.surface, color: t.colors.textPrimary, padding: "3px 6px", outline: "none", width: "100%", boxSizing: "border-box" }}
                />
              )}

              {/* Confirm */}
              <button
                type="button"
                onClick={handleConfirmPendingDoc}
                style={{ marginTop: "auto", fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: t.radius.sm, border: "none", background: t.colors.textPrimary, color: t.colors.surface, cursor: "pointer", alignSelf: "flex-start" }}
              >
                Add to library →
              </button>
            </div>
          )}

          {/* Upload tile — always at the end */}
          <button
            type="button"
            onClick={() => { if (!pendingDoc) fileInputRef.current?.click(); }}
            disabled={uploadStatus.status === "uploading" || !!pendingDoc}
            title={pendingDoc ? "Confirm the current document type first" : "Upload a file"}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              width: 90,
              minWidth: 90,
              borderRadius: t.radius.md,
              border: `1px dashed ${t.colors.border}`,
              background: "transparent",
              color: t.colors.textMuted,
              cursor: (uploadStatus.status === "uploading" || !!pendingDoc) ? "not-allowed" : "pointer",
              opacity: (uploadStatus.status === "uploading" || !!pendingDoc) ? 0.5 : 1,
              flexShrink: 0,
              gap: 6,
            }}
          >
            <span style={{ fontSize: uploadStatus.status === "uploading" ? 16 : 24, lineHeight: 1 }}>
              {uploadStatus.status === "uploading" ? "⏳" : "+"}
            </span>
            <span style={{ fontSize: 11, fontWeight: 600 }}>
              {uploadStatus.status === "uploading" ? "Reading…" : "Upload file"}
            </span>
          </button>
        </div>

        {uploadStatus.status === "error" && (
          <div
            style={{
              marginTop: 10,
              padding: "8px 12px",
              borderRadius: t.radius.sm,
              background: t.colors.danger,
              color: t.colors.textPrimary,
              fontSize: 13,
            }}
          >
            {uploadStatus.message}
          </div>
        )}
      </AppCard>

      {/* Row 1: Add Information | System Insights */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)",
          gap: 20,
          alignItems: "start",
        }}
      >
        {/* ── Add Information ── */}
        <AppCard className="p-6">
          <h2 style={titleStyle}>Add information</h2>
          <p style={copyStyle}>
            Upload a file or paste text to add it to the Document Library.
            Documents are processed together in one pass.
          </p>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.png,.jpg,.jpeg"
            style={{ display: "none" }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFileUpload(file);
              e.target.value = "";
            }}
          />

          {/* Upload button */}
          <div style={{ marginTop: 16, display: "flex", gap: 10, alignItems: "center" }}>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadStatus.status === "uploading"}
              style={{
                height: 36,
                border: `1px solid ${t.colors.border}`,
                borderRadius: t.radius.sm,
                background: t.colors.surface,
                color: t.colors.textPrimary,
                fontSize: 13,
                fontWeight: 700,
                padding: "0 14px",
                cursor:
                  uploadStatus.status === "uploading"
                    ? "not-allowed"
                    : "pointer",
                opacity: uploadStatus.status === "uploading" ? 0.6 : 1,
                flexShrink: 0,
              }}
            >
              {uploadStatus.status === "uploading"
                ? "Extracting…"
                : "Upload file"}
            </button>
            <span style={{ fontSize: 12, color: t.colors.textMuted }}>
              PDF, DOCX, PNG, JPG — up to 10 MB
            </span>
          </div>

          {/* Paste area */}
          <div style={{ marginTop: 16 }}>
            <textarea
              value={pasteText}
              onChange={(e) => {
                setPasteText(e.target.value);
                pasteField.fieldProps.onChange(e.target.value);
              }}
              onFocus={pasteField.fieldProps.onFocus}
              onBlur={pasteField.fieldProps.onBlur}
              onKeyDown={pasteField.fieldProps.onKeyDown}
              placeholder="Paste CV text, a reference letter, certificate details, or any supporting text here…"
              style={{ ...textareaStyle, minHeight: 140, marginTop: 0 }}
            />
            <EnrichmentHint
              behaviouralState={pasteField.behaviouralState}
              hint={pasteHint}
              loading={pasteHintLoading}
              onDismiss={() => setPasteHint(null)}
            />
          </div>

          {/* Paste: type selector + add button */}
          {pasteText.trim().length > 0 && (
            <div
              style={{
                marginTop: 10,
                display: "flex",
                gap: 8,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <select
                value={pasteDocType}
                onChange={(e) => setPasteDocType(e.target.value as DocType)}
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  border: `1px solid ${t.colors.border}`,
                  borderRadius: t.radius.sm,
                  background: t.colors.surface,
                  color: t.colors.textPrimary,
                  padding: "5px 8px",
                  cursor: "pointer",
                }}
              >
                {(["cv", "certificate", "reference", "other"] as DocType[]).map(
                  (dt) => (
                    <option key={dt} value={dt}>
                      {DOC_TYPE_LABELS[dt]}
                    </option>
                  ),
                )}
              </select>
              {pasteDocType === "other" && (
                <input
                  type="text"
                  placeholder="What is this document?"
                  value={pasteCustomLabel}
                  onChange={(e) => setPasteCustomLabel(e.target.value)}
                  style={{
                    fontSize: 13,
                    border: `1px solid ${t.colors.border}`,
                    borderRadius: t.radius.sm,
                    background: t.colors.surface,
                    color: t.colors.textPrimary,
                    padding: "5px 10px",
                    outline: "none",
                    flex: 1,
                    minWidth: 140,
                  }}
                />
              )}
              <button
                type="button"
                onClick={handleAddPasted}
                style={{
                  height: 34,
                  border: "none",
                  borderRadius: t.radius.sm,
                  background: t.colors.primary,
                  color: t.colors.textOnPrimary,
                  fontSize: 13,
                  fontWeight: 700,
                  padding: "0 14px",
                  cursor: "pointer",
                  flexShrink: 0,
                }}
              >
                Add to library
              </button>
            </div>
          )}

          {/* Build / enrich button */}
          <div style={{ marginTop: 20 }}>
            {isBuilding ? (
              <div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: t.colors.textPrimary,
                    marginBottom: 8,
                  }}
                >
                  {BUILD_MESSAGES[buildMsgIdx]}
                </div>
                <div
                  style={{
                    background: t.colors.backgroundSoft,
                    borderRadius: 6,
                    height: 6,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      background: t.colors.primary,
                      width: `${buildProgress}%`,
                      transition: "width 1s linear",
                      borderRadius: 6,
                    }}
                  />
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => void handleBuildProfile()}
                disabled={state.profileStatus === "loading"}
                style={{
                  ...primaryButtonStyle,
                  width: "100%",
                  opacity: state.profileStatus === "loading" ? 0.8 : 1,
                  cursor:
                    state.profileStatus === "loading"
                      ? "not-allowed"
                      : "pointer",
                }}
              >
                {isEnrichMode
                  ? "Enrich profile"
                  : profile
                    ? "Rebuild profile"
                    : "Build profile"}
              </button>
            )}

            {state.profileError && (
              <div
                style={{
                  marginTop: 10,
                  padding: "10px 12px",
                  borderRadius: t.radius.md,
                  border: `1px solid ${t.colors.border}`,
                  background: t.colors.backgroundSoft,
                  color: t.colors.textPrimary,
                  fontSize: 14,
                  lineHeight: 1.6,
                }}
              >
                {state.profileError}
              </div>
            )}

            <button
              type="button"
              onClick={() => router.push("/workspace/job")}
              disabled={!profile}
              style={{
                ...secondaryButtonStyle,
                width: "100%",
                marginTop: 10,
                opacity: profile ? 1 : 0.5,
                cursor: profile ? "pointer" : "not-allowed",
              }}
            >
              Continue to job
            </button>
          </div>
        </AppCard>

        {/* ── System Insights ── */}
        <AppCard className="p-6">
          <h2 style={titleStyle}>System insights</h2>

          {!profile ? (
            <p style={copyStyle}>
              Build your profile to see insights here.
            </p>
          ) : (
            <>
              {/* Counts */}
              <div style={{ marginTop: 14, display: "grid", gap: 6 }}>
                {[
                  ["Roles", profile.roles?.length ?? 0],
                  ["Education entries", profile.education?.length ?? 0],
                  ["Certifications", profile.certifications?.length ?? 0],
                  ["Languages", profile.languages?.length ?? 0],
                  ["Core skills", profile.coreSkills?.length ?? 0],
                  ["Tools", profile.tools?.length ?? 0],
                  ["Standards / domains", profile.standards?.length ?? 0],
                  ["Industries", profile.industries?.length ?? 0],
                  ["Leadership signals", profile.leadershipSignals?.length ?? 0],
                  ["Verified claims", profile.verifiedClaims?.length ?? 0],
                  [
                    "Open questions",
                    profile.openQuestions?.length ?? 0,
                  ],
                ].map(([label, count]) => (
                  <div
                    key={label}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 13,
                    }}
                  >
                    <span style={{ color: t.colors.textMuted }}>{label}</span>
                    <span
                      style={{
                        fontWeight: 700,
                        color:
                          (count as number) > 0
                            ? t.colors.textPrimary
                            : t.colors.textMuted,
                      }}
                    >
                      {count as number}
                    </span>
                  </div>
                ))}
              </div>

              {/* Open questions brief */}
              {(profile.openQuestions?.length ?? 0) > 0 && (
                <div
                  style={{
                    marginTop: 14,
                    padding: "10px 12px",
                    borderRadius: t.radius.md,
                    background: t.colors.accentYellow,
                    fontSize: 13,
                    color: t.colors.textSecondary,
                  }}
                >
                  <strong style={{ color: t.colors.textPrimary }}>
                    {profile.openQuestions!.length} open question
                    {profile.openQuestions!.length !== 1 ? "s" : ""}
                  </strong>{" "}
                  — see the Conversation section below.
                </div>
              )}

              {/* Delete */}
              <button
                type="button"
                onClick={() => setDeleteState("confirming")}
                style={{
                  marginTop: 18,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 500,
                  color: t.colors.textMuted,
                  padding: 0,
                  textAlign: "left",
                }}
              >
                Delete profile
              </button>
            </>
          )}
        </AppCard>
      </div>

      {/* Conversation — full width */}
      <AppCard className="p-6">
        <h2 style={titleStyle}>Questions &amp; conversation</h2>

        {/* Question list — fixed height, scrollable */}
        <div
          style={{
            overflowY: "auto",
            maxHeight: 220,
            marginTop: 10,
            paddingRight: 4,
          }}
        >
          {!profile ? (
            <p style={{ ...copyStyle, margin: 0 }}>
              Build your profile to see system questions here.
            </p>
          ) : (profile.openQuestions?.length ?? 0) > 0 ? (
            <>
              <p style={{ ...copyStyle, marginTop: 0, marginBottom: 12 }}>
                The system flagged these questions while reading your documents.
                They may indicate ambiguities or gaps worth addressing.
              </p>
              <div style={{ display: "grid", gap: 8 }}>
                {profile.openQuestions!.map((q, i) => (
                  <div
                    key={i}
                    style={{
                      padding: "10px 14px",
                      borderRadius: t.radius.md,
                      background: t.colors.accentYellow,
                      fontSize: 14,
                      color: t.colors.textSecondary,
                      lineHeight: 1.6,
                      display: "flex",
                      gap: 10,
                      alignItems: "flex-start",
                    }}
                  >
                    <span
                      style={{
                        flexShrink: 0,
                        fontWeight: 800,
                        color: t.colors.textPrimary,
                        fontSize: 13,
                        marginTop: 2,
                      }}
                    >
                      Q{i + 1}
                    </span>
                    <span>{q}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p style={{ ...copyStyle, margin: 0 }}>
              No open questions from the system. Your profile looks complete.
            </p>
          )}
        </div>

        {/* Answer / Clarification — placeholder for future interactive clarification */}
        <div
          style={{
            marginTop: 16,
            padding: "12px 16px",
            borderRadius: t.radius.md,
            border: `1px dashed ${t.colors.border}`,
            background: t.colors.backgroundSoft,
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 13,
              color: t.colors.textMuted,
              fontStyle: "italic",
            }}
          >
            Answer / Clarification — future versions will allow answering these
            questions to enrich the profile.
          </p>
        </div>
      </AppCard>

      {/* Row 3: Extracted Profile | What shaped this profile */}
      {profile && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0,1.3fr) minmax(0,0.7fr)",
            gap: 20,
            alignItems: "start",
          }}
        >
          {/* ── Extracted Profile ── */}
          <AppCard className="p-6">
            <h2 style={titleStyle}>Extracted profile</h2>

            {/* Identity */}
            {(profile.fullName || profile.headline || profile.summary) && (
              <div style={{ marginTop: 16 }}>
                {profile.fullName && (
                  <div
                    style={{
                      fontSize: 20,
                      fontWeight: 800,
                      color: t.colors.textPrimary,
                    }}
                  >
                    {profile.fullName}
                  </div>
                )}
                {profile.headline && (
                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: 600,
                      color: t.colors.textSecondary,
                      marginTop: 4,
                    }}
                  >
                    {profile.headline}
                  </div>
                )}
                {profile.summary && (
                  <div
                    style={{
                      fontSize: 14,
                      lineHeight: 1.7,
                      color: t.colors.textSecondary,
                      marginTop: 8,
                    }}
                  >
                    {profile.summary}
                  </div>
                )}
              </div>
            )}

            {/* Experience */}
            {(profile.roles?.length ?? 0) > 0 && (
              <div style={{ marginTop: 22 }}>
                <ProfileSectionLabel>Experience</ProfileSectionLabel>
                <div style={{ display: "grid", gap: 10, marginTop: 8 }}>
                  {profile.roles!.map((role, i) => (
                    <div key={i} style={listCardStyle}>
                      <div
                        style={{
                          fontWeight: 700,
                          color: t.colors.textPrimary,
                          fontSize: 14,
                        }}
                      >
                        {role.title}
                        {role.isCurrent && (
                          <span
                            style={{
                              marginLeft: 8,
                              fontSize: 11,
                              fontWeight: 700,
                              background: t.colors.accentGreen,
                              color: t.colors.textSecondary,
                              borderRadius: 20,
                              padding: "1px 7px",
                              verticalAlign: "middle",
                            }}
                          >
                            Current
                          </span>
                        )}
                      </div>
                      <div
                        style={{
                          fontSize: 13,
                          color: t.colors.textSecondary,
                          marginTop: 3,
                        }}
                      >
                        {[role.company, role.startDate, role.endDate]
                          .filter(Boolean)
                          .join(" · ") || "No company / date captured"}
                      </div>
                      {role.achievements.length > 0 && (
                        <div
                          style={{
                            marginTop: 6,
                            fontSize: 13,
                            color: t.colors.textSecondary,
                            lineHeight: 1.6,
                          }}
                        >
                          {role.achievements.slice(0, 3).join(" · ")}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Education */}
            {(profile.education?.length ?? 0) > 0 && (
              <div style={{ marginTop: 22 }}>
                <ProfileSectionLabel>Education</ProfileSectionLabel>
                <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
                  {profile.education!.map((edu, i) => (
                    <div
                      key={i}
                      style={{
                        fontSize: 14,
                        color: t.colors.textSecondary,
                        lineHeight: 1.6,
                      }}
                    >
                      <span
                        style={{ fontWeight: 700, color: t.colors.textPrimary }}
                      >
                        {edu.degree}
                        {edu.field ? ` · ${edu.field}` : ""}
                      </span>
                      {(edu.institution || edu.endDate) && (
                        <span>
                          {" — "}
                          {[edu.institution, edu.endDate]
                            .filter(Boolean)
                            .join(", ")}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Certifications */}
            {(profile.certifications?.length ?? 0) > 0 && (
              <div style={{ marginTop: 22 }}>
                <ProfileSectionLabel>Certifications</ProfileSectionLabel>
                <div style={{ display: "grid", gap: 6, marginTop: 8 }}>
                  {profile.certifications!.map((cert, i) => (
                    <div
                      key={i}
                      style={{
                        fontSize: 14,
                        color: t.colors.textSecondary,
                        lineHeight: 1.6,
                      }}
                    >
                      <span
                        style={{ fontWeight: 700, color: t.colors.textPrimary }}
                      >
                        {cert.name}
                      </span>
                      {(cert.issuer || cert.date) && (
                        <span>
                          {" — "}
                          {[cert.issuer, cert.date].filter(Boolean).join(", ")}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Languages */}
            {(profile.languages?.length ?? 0) > 0 && (
              <div style={{ marginTop: 22 }}>
                <ProfileSectionLabel>Languages</ProfileSectionLabel>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 6,
                    marginTop: 8,
                  }}
                >
                  {profile.languages!.map((lang, i) => (
                    <span
                      key={i}
                      style={{
                        padding: "3px 10px",
                        borderRadius: 20,
                        background: t.colors.backgroundSoft,
                        border: `1px solid ${t.colors.border}`,
                        fontSize: 13,
                        color: t.colors.textSecondary,
                      }}
                    >
                      {lang.language}
                      {lang.proficiency ? ` · ${lang.proficiency}` : ""}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Tools */}
            {(profile.tools?.length ?? 0) > 0 && (
              <div style={{ marginTop: 22 }}>
                <ProfileSectionLabel>Tools</ProfileSectionLabel>
                <TagGroup items={profile.tools!} />
              </div>
            )}

            {/* Standards / Domains */}
            {(profile.standards?.length ?? 0) > 0 && (
              <div style={{ marginTop: 22 }}>
                <ProfileSectionLabel>Standards &amp; domains</ProfileSectionLabel>
                <TagGroup items={profile.standards!} />
              </div>
            )}

            {/* Core Skills */}
            {(profile.coreSkills?.length ?? 0) > 0 && (
              <div style={{ marginTop: 22 }}>
                <ProfileSectionLabel>Core skills</ProfileSectionLabel>
                <TagGroup items={profile.coreSkills!} />
              </div>
            )}

            {/* Industries */}
            {(profile.industries?.length ?? 0) > 0 && (
              <div style={{ marginTop: 22 }}>
                <ProfileSectionLabel>Industries</ProfileSectionLabel>
                <TagGroup items={profile.industries!} />
              </div>
            )}

            {/* Leadership signals */}
            {(profile.leadershipSignals?.length ?? 0) > 0 && (
              <div style={{ marginTop: 22 }}>
                <ProfileSectionLabel>Leadership signals</ProfileSectionLabel>
                <ul
                  style={{
                    margin: "8px 0 0",
                    padding: "0 0 0 18px",
                    display: "grid",
                    gap: 4,
                  }}
                >
                  {profile.leadershipSignals!.map((s, i) => (
                    <li
                      key={i}
                      style={{
                        fontSize: 14,
                        color: t.colors.textSecondary,
                        lineHeight: 1.6,
                      }}
                    >
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Verified claims */}
            {(profile.verifiedClaims?.length ?? 0) > 0 && (
              <div style={{ marginTop: 22 }}>
                <ProfileSectionLabel>Verified claims</ProfileSectionLabel>
                <div style={{ display: "grid", gap: 10, marginTop: 8 }}>
                  {profile.verifiedClaims!.map((claim, i) => (
                    <div key={i} style={listCardStyle}>
                      <div
                        style={{ fontWeight: 700, color: t.colors.textPrimary, fontSize: 14 }}
                      >
                        {claim.claim}
                      </div>
                      <div
                        style={{
                          marginTop: 4,
                          fontSize: 12,
                          color: t.colors.textMuted,
                          fontWeight: 600,
                          textTransform: "uppercase",
                          letterSpacing: "0.04em",
                        }}
                      >
                        Confidence: {claim.confidence}
                      </div>
                      {claim.evidence.length > 0 && (
                        <div
                          style={{
                            marginTop: 6,
                            fontSize: 13,
                            color: t.colors.textSecondary,
                            lineHeight: 1.6,
                          }}
                        >
                          {claim.evidence.join(" · ")}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Open questions inline reference */}
            {(profile.openQuestions?.length ?? 0) > 0 && (
              <div style={{ marginTop: 22 }}>
                <ProfileSectionLabel>Open questions</ProfileSectionLabel>
                <div style={{ display: "grid", gap: 6, marginTop: 8 }}>
                  {profile.openQuestions!.map((q, i) => (
                    <div
                      key={i}
                      style={{
                        fontSize: 13,
                        color: t.colors.textSecondary,
                        lineHeight: 1.6,
                        padding: "6px 10px",
                        borderRadius: t.radius.sm,
                        background: t.colors.accentYellow,
                      }}
                    >
                      {q}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </AppCard>

          {/* ── What shaped this profile ── */}
          <AppCard className="p-6">
            <h2 style={titleStyle}>What shaped this profile</h2>

            {/* Build diff */}
            {profileDiff ? (
              <div
                style={{
                  marginTop: 14,
                  padding: "12px 14px",
                  borderRadius: t.radius.md,
                  background: t.colors.accentGreen,
                  fontSize: 13,
                  color: t.colors.textSecondary,
                }}
              >
                <div
                  style={{
                    fontWeight: 700,
                    color: t.colors.textPrimary,
                    marginBottom: 6,
                  }}
                >
                  Last build added
                </div>
                <div style={{ display: "grid", gap: 3 }}>
                  {profileDiff.addedRoles > 0 && (
                    <span>
                      +{profileDiff.addedRoles} role
                      {profileDiff.addedRoles !== 1 ? "s" : ""}
                    </span>
                  )}
                  {profileDiff.addedSkills > 0 && (
                    <span>
                      +{profileDiff.addedSkills} skill
                      {profileDiff.addedSkills !== 1 ? "s" : ""}
                    </span>
                  )}
                  {profileDiff.addedTools > 0 && (
                    <span>
                      +{profileDiff.addedTools} tool
                      {profileDiff.addedTools !== 1 ? "s" : ""}
                    </span>
                  )}
                  {profileDiff.addedClaims > 0 && (
                    <span>
                      +{profileDiff.addedClaims} verified claim
                      {profileDiff.addedClaims !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>
              </div>
            ) : profile ? (
              <p style={{ ...copyStyle, marginTop: 14 }}>
                No changes from the last build, or this is the first build.
              </p>
            ) : null}

            {/* Document sources */}
            {state.uploadedFiles.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <h3 style={subTitleStyle}>Sources in last build</h3>
                <div style={{ display: "grid", gap: 6, marginTop: 10 }}>
                  {state.uploadedFiles.map((name, i) => (
                    <div
                      key={i}
                      style={{
                        fontSize: 13,
                        color: t.colors.textSecondary,
                        padding: "6px 10px",
                        borderRadius: t.radius.sm,
                        border: `1px solid ${t.colors.border}`,
                        background: t.colors.surface,
                      }}
                    >
                      {name}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Placeholder for future per-document attribution */}
            <div
              style={{
                marginTop: 20,
                padding: "10px 12px",
                borderRadius: t.radius.md,
                background: t.colors.backgroundSoft,
                fontSize: 13,
                color: t.colors.textMuted,
                lineHeight: 1.6,
              }}
            >
              Per-document contribution detail will appear here in a future
              update.
            </div>
          </AppCard>
        </div>
      )}

      {/* Delete confirmation modal */}
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
              This will permanently delete your candidate profile and all saved
              data. Your documents remain on your device.
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
                  cursor:
                    deleteState === "deleting" ? "not-allowed" : "pointer",
                  opacity: deleteState === "deleting" ? 0.6 : 1,
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleDeleteProfile()}
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
                  cursor:
                    deleteState === "deleting" ? "not-allowed" : "pointer",
                  opacity: deleteState === "deleting" ? 0.7 : 1,
                }}
              >
                {deleteState === "deleting"
                  ? "Deleting…"
                  : "Yes, delete everything"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function LanguageSwitch({
  value,
  onChange,
}: {
  value: "en" | "de" | "es";
  onChange: (lang: "en" | "de" | "es") => void;
}) {
  const tooltips: Record<string, string> = {
    en: "English",
    de: "Deutsch",
    es: "Español",
  };
  return (
    <div style={{ display: "flex", gap: 2 }}>
      {(["en", "de", "es"] as const).map((lang) => (
        <button
          key={lang}
          type="button"
          title={tooltips[lang]}
          onClick={() => onChange(lang)}
          style={{
            padding: "3px 8px",
            borderRadius: 6,
            border:
              value === lang
                ? `1px solid ${t.colors.primary}`
                : "1px solid transparent",
            background:
              value === lang ? t.colors.primarySoft : "transparent",
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
            color:
              value === lang ? t.colors.textPrimary : t.colors.textMuted,
            letterSpacing: "0.04em",
          }}
        >
          {lang.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

function ProfileSectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 700,
        color: t.colors.textMuted,
        textTransform: "uppercase",
        letterSpacing: "0.08em",
      }}
    >
      {children}
    </div>
  );
}

function TagGroup({ items }: { items: string[] }) {
  if (!items.length)
    return (
      <span style={{ fontSize: 13, color: t.colors.textMuted }}>—</span>
    );
  return (
    <div
      style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}
    >
      {items.map((item, i) => (
        <span
          key={i}
          style={{
            padding: "2px 10px",
            borderRadius: 20,
            background: t.colors.backgroundSoft,
            border: `1px solid ${t.colors.border}`,
            fontSize: 13,
            color: t.colors.textSecondary,
          }}
        >
          {item}
        </span>
      ))}
    </div>
  );
}
