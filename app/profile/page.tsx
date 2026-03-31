"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { designTokens } from "@/lib/design/tokens";

const t = designTokens;

type SourceKind =
  | "primary_cv"
  | "additional_cv"
  | "arbeitszeugnis"
  | "certificate"
  | "user_note"
  | "other";

type InputDocument = {
  id: string;
  fileName: string;
  kind: SourceKind;
  text: string;
  isPrimary?: boolean;
  description?: string;
};

type DraftSource = {
  id: string | null;
  fileName: string;
  kind: SourceKind;
  text: string;
  description: string;
  isStored: boolean;
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

type ExtractCandidateProfileResponse =
  | {
      ok: true;
      profile: CandidateProfile;
      meta: {
        model: string;
        documentCount: number;
        sourceKinds: SourceKind[];
      };
    }
  | {
      ok: false;
      error: string;
      details?: unknown;
    };

type SuggestedAction =
  | "add_manual_summary"
  | "paste_into_primary_cv"
  | "add_user_note"
  | "click_build_profile"
  | "answer_active_prompt"
  | "no_action";

type ProfileChatResponse =
  | {
      ok: true;
      assistantMessage: string;
      answeredActivePrompt: boolean;
      shouldCaptureAsNote: boolean;
      suggestedAction?: SuggestedAction;
    }
  | {
      ok: false;
      error: string;
    };

type ChatMessage = {
  id: string;
  sender: "assistant" | "user";
  tone: "status" | "question" | "success" | "error" | "neutral";
  text: string;
};

type ActivePrompt = {
  id: string;
  text: string;
  relatedRoleKey?: string | null;
};

type LoadWorkspaceResponse =
  | {
      ok: true;
      workspace: {
        profile: CandidateProfile | null;
        documents: Array<{
          fileName: string;
          kind: SourceKind;
          text: string;
          description?: string;
          isPrimary?: boolean;
        }>;
        meta: Record<string, unknown>;
        createdAt: string | null;
        updatedAt: string | null;
      } | null;
    }
  | {
      ok: false;
      error: string;
    };

type ExtractDocxResponse =
  | {
      ok: true;
      text: string;
      fileName: string;
      warnings: string[];
    }
  | {
      ok: false;
      error: string;
    };

const KIND_LABELS: Record<SourceKind, string> = {
  primary_cv: "Primary CV",
  additional_cv: "Additional CV",
  arbeitszeugnis: "Arbeitszeugnis",
  certificate: "Certificate",
  user_note: "User note",
  other: "Other / Misc",
};

const CANDIDATE_PROFILE_STORAGE_KEY = "cvmvp_candidate_profile";
const CANDIDATE_PROFILE_META_STORAGE_KEY = "cvmvp_candidate_profile_meta";
const CANDIDATE_DOCUMENTS_STORAGE_KEY = "cvmvp_candidate_documents";

export default function ProfilePage(): React.JSX.Element {
  const router = useRouter();
  const saveTimerRef = useRef<number | null>(null);
  const hasLoadedWorkspaceRef = useRef(false);
  const isHydratingWorkspaceRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [locale, setLocale] = useState<"en" | "de">("en");
  const [documents, setDocuments] = useState<InputDocument[]>([]);
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [draftSource, setDraftSource] = useState<DraftSource>(createEmptyDraft("primary_cv"));
  const [selectedStoredDocumentId, setSelectedStoredDocumentId] = useState<string | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([
    createAssistantMessage(
      "status",
      "Welcome. Build the candidate truth layer from source documents first, then move to job analysis."
    ),
    createAssistantMessage(
      "neutral",
      "Paste source text or upload a Word CV, save it into Stored Documents, then rebuild the canonical profile."
    ),
  ]);

  const [pendingPrompts, setPendingPrompts] = useState<ActivePrompt[]>([]);
  const [activePrompt, setActivePrompt] = useState<ActivePrompt | null>(null);
  const [replyText, setReplyText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isSavingSource, setIsSavingSource] = useState(false);
  const [isChatting, setIsChatting] = useState(false);
  const [isUploadingDocx, setIsUploadingDocx] = useState(false);
  const [workspaceStatus, setWorkspaceStatus] = useState("Loading workspace...");
  const [workspaceLoadedAt, setWorkspaceLoadedAt] = useState<string | null>(null);

  const validDocuments = useMemo(() => {
    return documents.filter((doc) => doc.text.trim().length > 0);
  }, [documents]);

  const readinessLabel = useMemo(() => {
    if (!profile) return validDocuments.length > 0 ? "Building" : "Early";
    if (profile.roles.length >= 2 && profile.verifiedClaims.length >= 2) return "Strong";
    if (profile.roles.length >= 1) return "Building";
    return "Early";
  }, [profile, validDocuments.length]);

  useEffect(() => {
    void loadWorkspace();
  }, []);

  useEffect(() => {
    if (!hasLoadedWorkspaceRef.current) return;
    if (isHydratingWorkspaceRef.current) return;

    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = window.setTimeout(() => {
      void persistWorkspace();
    }, 700);

    return () => {
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
      }
    };
  }, [documents, profile, locale]);

  async function loadWorkspace(): Promise<void> {
    try {
      isHydratingWorkspaceRef.current = true;
      setWorkspaceStatus("Loading workspace...");

      const response = await fetch("/api/profile/load", {
        method: "GET",
        cache: "no-store",
      });

      const data = (await response.json()) as LoadWorkspaceResponse;

      if (!response.ok || !data.ok) {
        throw new Error(data.ok ? "Could not load workspace." : data.error);
      }

      if (!data.workspace) {
        hasLoadedWorkspaceRef.current = true;
        setDocuments([]);
        setDraftSource(createEmptyDraft("primary_cv"));
        setWorkspaceStatus("No saved workspace yet.");
        return;
      }

      const savedDocuments = data.workspace.documents.map((doc, index) => ({
        id: createId(),
        fileName:
          typeof doc.fileName === "string" && doc.fileName.trim()
            ? doc.fileName
            : autoFileNameForKind(doc.kind, index + 1),
        kind: doc.kind,
        text: doc.text ?? "",
        description: doc.description ?? "",
        isPrimary: Boolean(doc.isPrimary ?? doc.kind === "primary_cv"),
      }));

      setDocuments(savedDocuments);
      setProfile(data.workspace.profile ?? null);

      if (data.workspace.profile) {
        const prompts = buildPromptsFromProfile(data.workspace.profile);
        setPendingPrompts(prompts);
        setActivePrompt(prompts[0] ?? null);
      }

      const savedLocale =
        data.workspace.meta.locale === "de" || data.workspace.meta.locale === "en"
          ? (data.workspace.meta.locale as "en" | "de")
          : null;

      if (savedLocale) {
        setLocale(savedLocale);
      }

      if (data.workspace.updatedAt) {
        setWorkspaceLoadedAt(data.workspace.updatedAt);
      }

      setDraftSource(createEmptyDraft(savedDocuments[0]?.kind ?? "primary_cv"));
      setWorkspaceStatus(
        data.workspace.updatedAt
          ? `Workspace loaded · ${new Date(data.workspace.updatedAt).toLocaleString()}`
          : "Workspace loaded"
      );
      hasLoadedWorkspaceRef.current = true;
    } catch (caughtError) {
      const message =
        caughtError instanceof Error ? caughtError.message : "Could not load saved workspace.";
      setWorkspaceStatus("Workspace load failed.");
      appendMessage(createAssistantMessage("error", message));
      hasLoadedWorkspaceRef.current = true;
    } finally {
      isHydratingWorkspaceRef.current = false;
    }
  }

  async function persistWorkspace(): Promise<void> {
    try {
      const response = await fetch("/api/profile/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          profile,
          documents: documents.map((doc) => ({
            fileName: doc.fileName,
            kind: doc.kind,
            text: doc.text,
            description: doc.description ?? "",
            isPrimary: Boolean(doc.isPrimary),
          })),
          meta: {
            locale,
            sourceCount: validDocuments.length,
            readinessLabel,
            lastSavedAt: new Date().toISOString(),
          },
        }),
      });

      const data = (await response.json()) as
        | { ok: true; workspace: { updatedAt: string | null } }
        | { ok: false; error: string };

      if (!response.ok || !data.ok) {
        throw new Error(data.ok ? "Could not save workspace." : data.error);
      }

      setWorkspaceLoadedAt(data.workspace.updatedAt ?? null);
      setWorkspaceStatus(
        data.workspace.updatedAt
          ? `Workspace saved · ${new Date(data.workspace.updatedAt).toLocaleString()}`
          : "Workspace saved"
      );
    } catch {
      setWorkspaceStatus("Workspace save failed.");
    }
  }

  function appendMessage(message: ChatMessage): void {
    setMessages((prev) => [...prev, message]);
  }

  function createNewDraft(kind: SourceKind): void {
    setSelectedStoredDocumentId(null);
    setDraftSource(createEmptyDraft(kind));
    setError(null);
  }

  function handleStoredDocumentSelect(docId: string): void {
    const doc = documents.find((item) => item.id === docId);
    if (!doc) return;

    setSelectedStoredDocumentId(docId);
    setDraftSource({
      id: doc.id,
      fileName: doc.fileName,
      kind: doc.kind,
      text: doc.text,
      description: doc.description ?? "",
      isStored: true,
    });
    setError(null);
  }

  async function handleDocxUpload(event: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploadingDocx(true);
    setError(null);

    try {
      if (!file.name.toLowerCase().endsWith(".docx")) {
        throw new Error("Please upload a .docx file.");
      }

      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/profile/extract-docx", {
        method: "POST",
        body: formData,
      });

      const data = (await response.json()) as ExtractDocxResponse;

      if (!response.ok || !data.ok) {
        throw new Error(data.ok ? "DOCX extraction failed." : data.error);
      }

      setSelectedStoredDocumentId(null);
      setDraftSource({
        id: null,
        fileName: stripDocxExtension(data.fileName) || "Uploaded CV",
        kind: "primary_cv",
        text: data.text,
        description: "",
        isStored: false,
      });

      appendMessage(
        createAssistantMessage(
          "success",
          `DOCX extracted successfully from ${data.fileName}. Review the text in Incoming Source Text, then save it to Stored Documents.`
        )
      );

      if (data.warnings.length > 0) {
        appendMessage(
          createAssistantMessage(
            "status",
            `DOCX extraction notes: ${data.warnings.join(" | ")}`
          )
        );
      }
    } catch (caughtError) {
      const message =
        caughtError instanceof Error ? caughtError.message : "DOCX upload failed.";
      setError(message);
      appendMessage(createAssistantMessage("error", message));
    } finally {
      setIsUploadingDocx(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  async function handleSaveSource(): Promise<void> {
    if (!draftSource.text.trim()) {
      setError("Please paste or upload some source text before saving.");
      return;
    }

    setIsSavingSource(true);
    setError(null);

    try {
      setDocuments((prev) => {
        if (draftSource.id && prev.some((doc) => doc.id === draftSource.id)) {
          return prev.map((doc) =>
            doc.id === draftSource.id
              ? {
                  ...doc,
                  fileName: draftSource.fileName.trim() || doc.fileName,
                  kind: draftSource.kind,
                  text: draftSource.text,
                  description: draftSource.description.trim(),
                  isPrimary: draftSource.kind === "primary_cv",
                }
              : doc
          );
        }

        const nextCount = prev.filter((doc) => doc.kind === draftSource.kind).length + 1;
        return [
          ...prev,
          {
            id: createId(),
            fileName:
              draftSource.fileName.trim() || autoFileNameForKind(draftSource.kind, nextCount),
            kind: draftSource.kind,
            text: draftSource.text,
            description: draftSource.description.trim(),
            isPrimary: draftSource.kind === "primary_cv",
          },
        ];
      });

      appendMessage(
        createAssistantMessage(
          "success",
          `${KIND_LABELS[draftSource.kind]} saved to Stored Documents. Rebuild profile when you want the canonical profile refreshed.`
        )
      );

      setSelectedStoredDocumentId(null);
      setDraftSource(createEmptyDraft("primary_cv"));
    } finally {
      setIsSavingSource(false);
    }
  }

  function removeStoredDocument(id: string): void {
    setDocuments((prev) => prev.filter((doc) => doc.id !== id));

    if (selectedStoredDocumentId === id) {
      setSelectedStoredDocumentId(null);
      setDraftSource(createEmptyDraft("primary_cv"));
    }
  }

  async function handleBuildProfile(): Promise<void> {
    setError(null);

    if (!validDocuments.length) {
      const message = "Please save at least one source document first.";
      setError(message);
      appendMessage(createAssistantMessage("error", message));
      return;
    }

    appendMessage(
      createAssistantMessage(
        "status",
        `I’m rebuilding the canonical candidate profile from ${validDocuments.length} stored source ${
          validDocuments.length === 1 ? "document" : "documents"
        }.`
      )
    );

    setIsExtracting(true);

    try {
      const response = await fetch("/api/extract-candidate-profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          locale,
          documents: validDocuments.map((doc) => ({
            fileName: doc.fileName,
            kind: doc.kind,
            text: doc.description?.trim()
              ? `Document description: ${doc.description.trim()}\n\n${doc.text}`
              : doc.text,
            isPrimary: doc.kind === "primary_cv",
          })),
        }),
      });

      const data = (await response.json()) as ExtractCandidateProfileResponse;

      if (!response.ok || !data.ok) {
        throw new Error(data.ok ? "Failed to build profile." : data.error);
      }

      setProfile(data.profile);
      const prompts = buildPromptsFromProfile(data.profile);
      setPendingPrompts(prompts);
      setActivePrompt(prompts[0] ?? null);
      appendMessage(
        createAssistantMessage(
          "success",
          "Canonical candidate profile refreshed. Review it below, then move to job analysis when ready."
        )
      );
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Unexpected error while building profile.";
      setError(message);
      appendMessage(createAssistantMessage("error", message));
    } finally {
      setIsExtracting(false);
    }
  }

  function handleGoToJobAnalysis(): void {
    if (!profile) {
      setError("Build the canonical profile first before moving to job analysis.");
      return;
    }

    persistProfileForTailoring(profile, documents, locale, readinessLabel);
    router.push("/workspace/job");
  }

  async function handleReplySubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    const trimmed = replyText.trim();
    if (!trimmed) return;

    appendMessage({
      id: createId(),
      sender: "user",
      tone: "neutral",
      text: trimmed,
    });

    setReplyText("");
    setIsChatting(true);

    try {
      const response = await fetch("/api/profile-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          locale,
          userMessage: trimmed,
          activePrompt: activePrompt?.text ?? null,
          pendingPromptCount: pendingPrompts.length,
          currentProfile: profile,
        }),
      });

      const data = (await response.json()) as ProfileChatResponse;

      if (!response.ok || !data.ok) {
        throw new Error(data.ok ? "Profile chat failed." : data.error);
      }

      appendMessage(createAssistantMessage("neutral", data.assistantMessage));

      if (data.shouldCaptureAsNote) {
        setDraftSource({
          id: null,
          fileName: autoFileNameForKind(
            "user_note",
            documents.filter((d) => d.kind === "user_note").length + 1
          ),
          kind: "user_note",
          text: activePrompt ? `Prompt: ${activePrompt.text}\nAnswer: ${trimmed}` : trimmed,
          description: "",
          isStored: false,
        });
        setSelectedStoredDocumentId(null);

        appendMessage(
          createAssistantMessage(
            "status",
            "I prepared this reply as a user note in Incoming Source Text. Save it to Stored Documents when you want it committed to the system."
          )
        );
      }

      if (data.answeredActivePrompt && activePrompt) {
        const remaining = pendingPrompts.filter((item) => item.id !== activePrompt.id);
        setPendingPrompts(remaining);
        setActivePrompt(remaining[0] ?? null);
      }
    } catch (caughtError) {
      const message =
        caughtError instanceof Error ? caughtError.message : "Unexpected chat error.";
      appendMessage(createAssistantMessage("error", message));
    } finally {
      setIsChatting(false);
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
      <div
        style={{
          maxWidth: 1480,
          margin: "0 auto",
          padding: "22px 20px 36px",
        }}
      >
        <header style={{ marginBottom: 16 }}>
          <span style={eyebrowStyle}>Candidate Profile Builder</span>
          <h1 style={titleStyle}>Build the canonical candidate profile</h1>
          <p style={subtitleStyle}>
            Paste source text or upload a Word CV, save it into Stored Documents,
            then rebuild the canonical profile from stored evidence only.
          </p>
        </header>

        <div style={topBarStyle}>
          <StatusPill label={readinessLabel} tone={profile ? "green" : "blue"} />
          <StatusPill
            label={`${validDocuments.length} stored source${validDocuments.length === 1 ? "" : "s"}`}
            tone="blue"
          />
          <StatusPill
            label={workspaceStatus}
            tone={workspaceStatus.toLowerCase().includes("failed") ? "amber" : "blue"}
          />

          <div style={{ marginLeft: "auto", display: "flex", gap: 8, flexWrap: "wrap" }}>
            <select
              value={locale}
              onChange={(event) => setLocale(event.target.value as "en" | "de")}
              style={selectStyle}
            >
              <option value="en">English</option>
              <option value="de">German</option>
            </select>

            <button type="button" onClick={handleBuildProfile} style={buttonStyle}>
              {isExtracting ? "Rebuilding..." : "Rebuild Profile"}
            </button>

            <button
              type="button"
              onClick={handleGoToJobAnalysis}
              style={{
                ...buttonStyle,
                background: t.colors.surface,
                color: t.colors.textPrimary,
                border: `1px solid ${t.colors.border}`,
              }}
            >
              Continue to Job
            </button>
          </div>
        </div>

        {workspaceLoadedAt ? (
          <div style={{ marginBottom: 16, color: t.colors.textMuted, fontSize: 12 }}>
            Last workspace update: {new Date(workspaceLoadedAt).toLocaleString()}
          </div>
        ) : null}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.15fr 0.85fr",
            gap: 18,
            alignItems: "start",
            marginBottom: 18,
          }}
        >
          <Card>
            <CardTitle
              title="Incoming Source Text"
              subtitle="Paste new content here or upload a DOCX and review the extracted text before saving."
            />

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
              {(
                [
                  "primary_cv",
                  "additional_cv",
                  "arbeitszeugnis",
                  "certificate",
                  "user_note",
                  "other",
                ] as SourceKind[]
              ).map((kind) => (
                <button
                  key={kind}
                  type="button"
                  onClick={() => createNewDraft(kind)}
                  style={{
                    ...buttonStyle,
                    background:
                      draftSource.kind === kind && !draftSource.isStored
                        ? t.colors.primarySoft
                        : t.colors.surface,
                    color:
                      draftSource.kind === kind && !draftSource.isStored
                        ? t.colors.textOnPrimary
                        : t.colors.textPrimary,
                    border: `1px solid ${t.colors.border}`,
                  }}
                >
                  New {KIND_LABELS[kind]}
                </button>
              ))}
            </div>

            <div style={editorShellStyle}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  flexWrap: "wrap",
                  marginBottom: 12,
                }}
              >
                <div style={{ flex: 1, minWidth: 220 }}>
                  <input
                    type="text"
                    value={draftSource.fileName}
                    onChange={(event) =>
                      setDraftSource((prev) => ({ ...prev, fileName: event.target.value }))
                    }
                    placeholder="Document name"
                    style={inputStyle}
                  />
                </div>

                <select
                  value={draftSource.kind}
                  onChange={(event) =>
                    setDraftSource((prev) => ({
                      ...prev,
                      kind: event.target.value as SourceKind,
                    }))
                  }
                  style={selectStyle}
                >
                  <option value="primary_cv">Primary CV</option>
                  <option value="additional_cv">Additional CV</option>
                  <option value="arbeitszeugnis">Arbeitszeugnis</option>
                  <option value="certificate">Certificate</option>
                  <option value="user_note">User note</option>
                  <option value="other">Other / Misc</option>
                </select>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 10,
                  flexWrap: "wrap",
                  marginBottom: 12,
                  padding: 12,
                  borderRadius: t.radius.md,
                  background: t.colors.backgroundSoft,
                  border: `1px solid ${t.colors.borderSoft}`,
                }}
              >
                <div style={{ fontSize: 13, color: t.colors.textSecondary, lineHeight: 1.5 }}>
                  Upload a Word CV to auto-fill the editor, or paste text manually.
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".docx"
                    onChange={handleDocxUpload}
                    style={{ display: "none" }}
                  />

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      ...buttonStyle,
                      background: t.colors.surface,
                      color: t.colors.textPrimary,
                      border: `1px solid ${t.colors.border}`,
                    }}
                  >
                    {isUploadingDocx ? "Uploading DOCX..." : "Upload DOCX"}
                  </button>
                </div>
              </div>

              {draftSource.kind === "other" && (
                <input
                  type="text"
                  value={draftSource.description}
                  onChange={(event) =>
                    setDraftSource((prev) => ({ ...prev, description: event.target.value }))
                  }
                  placeholder="Short description for this item"
                  style={{ ...inputStyle, marginBottom: 10 }}
                />
              )}

              <textarea
                value={draftSource.text}
                onChange={(event) =>
                  setDraftSource((prev) => ({ ...prev, text: event.target.value }))
                }
                rows={16}
                placeholder="Paste extracted source text here or upload a DOCX..."
                style={textareaStyle}
              />

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  flexWrap: "wrap",
                  marginTop: 12,
                }}
              >
                <div style={{ fontSize: 12, color: t.colors.textMuted }}>
                  {draftSource.isStored
                    ? "This is a stored document preview. Save to update it."
                    : "This source is not yet committed. Save it to Stored Documents to include it in the system."}
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedStoredDocumentId(null);
                      setDraftSource(createEmptyDraft("primary_cv"));
                    }}
                    style={{
                      ...buttonStyle,
                      background: t.colors.surface,
                      color: t.colors.textPrimary,
                      border: `1px solid ${t.colors.border}`,
                    }}
                  >
                    Clear
                  </button>

                  <button type="button" onClick={handleSaveSource} style={buttonStyle}>
                    {isSavingSource ? "Saving..." : "Save to Stored Documents"}
                  </button>
                </div>
              </div>
            </div>

            {error ? <InlineError text={error} /> : null}
          </Card>

          <Card>
            <CardTitle
              title="Stored Documents"
              subtitle="Click any stored item to preview or update it in Incoming Source Text."
            />

            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {documents.length > 0 ? (
                documents.map((doc) => {
                  const isActive = selectedStoredDocumentId === doc.id;
                  return (
                    <div
                      key={doc.id}
                      onClick={() => handleStoredDocumentSelect(doc.id)}
                      style={{
                        border: `1px solid ${isActive ? t.colors.primary : t.colors.border}`,
                        background: isActive ? t.colors.primarySoft : t.colors.surface,
                        color: isActive ? t.colors.textOnPrimary : t.colors.textPrimary,
                        borderRadius: t.radius.md,
                        padding: "12px 14px",
                        minWidth: 180,
                        cursor: "pointer",
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                      }}
                    >
                      <div style={{ fontSize: 14, fontWeight: 800 }}>{doc.fileName}</div>
                      <div style={{ fontSize: 12, opacity: 0.9 }}>{KIND_LABELS[doc.kind]}</div>
                      <div style={{ fontSize: 12, opacity: 0.9 }}>
                        {doc.text.trim().length.toLocaleString()} chars
                      </div>

                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          removeStoredDocument(doc.id);
                        }}
                        style={{
                          ...buttonStyle,
                          background: "transparent",
                          color: isActive ? t.colors.textOnPrimary : t.colors.textSecondary,
                          border: `1px solid ${
                            isActive ? "rgba(255,255,255,0.5)" : t.colors.border
                          }`,
                          padding: "6px 10px",
                          fontSize: 12,
                          alignSelf: "flex-start",
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  );
                })
              ) : (
                <EmptyState text="No stored documents yet. Save a source from the left pane." />
              )}
            </div>
          </Card>
        </div>

        <Card>
          <CardTitle
            title="Canonical Candidate Profile"
            subtitle="This is the single source of truth rendered from stored sources and guided clarification."
          />

          {!profile ? (
            <EmptyState text="No canonical profile yet. Save source documents, then click Rebuild Profile." />
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "0.85fr 1.15fr", gap: 18 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <ProfilePanel title="Profile Snapshot">
                  <InfoRow label="Full name" value={profile.fullName ?? "Not yet captured"} />
                  <InfoRow label="Headline" value={profile.headline ?? "Not yet captured"} />
                  <InfoRow label="Status" value={readinessLabel} />
                  <InfoRow
                    label="Languages"
                    value={
                      profile.languages.length
                        ? profile.languages
                            .map((item) =>
                              item.proficiency ? `${item.language} (${item.proficiency})` : item.language
                            )
                            .join(", ")
                        : "Not yet captured"
                    }
                  />
                  <InfoRow
                    label="Industries"
                    value={profile.industries.length ? profile.industries.join(", ") : "Not yet captured"}
                  />
                </ProfilePanel>

                <ProfilePanel title="Competencies">
                  <TagGroup title="Core skills" items={profile.coreSkills} emptyText="No core skills stored yet." />
                  <TagGroup title="Tools" items={profile.tools} emptyText="No tools stored yet." />
                  <TagGroup title="Standards" items={profile.standards} emptyText="No standards stored yet." />
                </ProfilePanel>

                <ProfilePanel title="Open Questions">
                  <TagGroup
                    title="Needs clarification"
                    items={profile.openQuestions}
                    emptyText="No open questions right now."
                    tone="amber"
                  />
                </ProfilePanel>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <ProfilePanel title="Summary">
                  <p style={{ margin: 0, fontSize: 14, lineHeight: 1.65, color: t.colors.textPrimary }}>
                    {profile.summary ?? "No summary captured yet."}
                  </p>
                </ProfilePanel>

                <ProfilePanel title="Roles">
                  {profile.roles.length > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      {profile.roles.map((role) => (
                        <div key={buildRoleKey(role)} style={subtlePanelStyle}>
                          <div style={{ fontSize: 15, fontWeight: 800, color: t.colors.textPrimary }}>
                            {role.title || "Untitled role"}
                          </div>
                          <div style={{ fontSize: 13, color: t.colors.textSecondary, marginTop: 2 }}>
                            {role.company ?? "Unknown company"}
                            {role.location ? ` · ${role.location}` : ""}
                          </div>
                          <div style={{ fontSize: 12, color: t.colors.textMuted, marginTop: 6 }}>
                            {formatRoleDates(role)}
                          </div>
                          <MiniList
                            title="Stored details"
                            items={role.achievements}
                            emptyText="No stored detail points yet."
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyState text="No roles stored yet." />
                  )}
                </ProfilePanel>

                <ProfilePanel title="Education and Certifications">
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div>
                      <SectionMiniTitle>Education</SectionMiniTitle>
                      {profile.education.length > 0 ? (
                        profile.education.map((item, index) => (
                          <div key={`${item.degree}-${index}`} style={{ ...subtlePanelStyle, marginBottom: 8 }}>
                            <div style={{ fontSize: 14, fontWeight: 700 }}>{item.degree}</div>
                            <div style={{ fontSize: 13, color: t.colors.textSecondary, marginTop: 4 }}>
                              {[item.field, item.institution, item.endDate].filter(Boolean).join(" · ") ||
                                "Details not fully captured"}
                            </div>
                          </div>
                        ))
                      ) : (
                        <EmptyState text="No education stored yet." />
                      )}
                    </div>

                    <div>
                      <SectionMiniTitle>Certifications</SectionMiniTitle>
                      {profile.certifications.length > 0 ? (
                        profile.certifications.map((item, index) => (
                          <div key={`${item.name}-${index}`} style={{ ...subtlePanelStyle, marginBottom: 8 }}>
                            <div style={{ fontSize: 14, fontWeight: 700 }}>{item.name}</div>
                            <div style={{ fontSize: 13, color: t.colors.textSecondary, marginTop: 4 }}>
                              {[item.issuer, item.date].filter(Boolean).join(" · ") ||
                                "Details not fully captured"}
                            </div>
                          </div>
                        ))
                      ) : (
                        <EmptyState text="No certifications stored yet." />
                      )}
                    </div>
                  </div>
                </ProfilePanel>

                <ProfilePanel title="Evidence-backed Claims">
                  {profile.verifiedClaims.length > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {profile.verifiedClaims.map((claim, index) => (
                        <div key={`${claim.claim}-${index}`} style={subtlePanelStyle}>
                          <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.55 }}>{claim.claim}</div>
                          <div style={{ fontSize: 12, color: t.colors.textSecondary, marginTop: 6 }}>
                            Sources: {claim.evidence.join(", ")}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyState text="No evidence-backed claims stored yet." />
                  )}
                </ProfilePanel>
              </div>
            </div>
          )}
        </Card>

        <div style={{ marginTop: 18 }}>
          <Card>
            <CardTitle
              title="Profile Conversation"
              subtitle="The assistant remains available to capture clarifications, but new facts should still be committed into Stored Documents."
            />

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 12,
                maxHeight: 260,
                overflowY: "auto",
              }}
            >
              {messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))}
            </div>

            {activePrompt ? (
              <div style={{ ...subtlePanelStyle, marginTop: 14, background: t.colors.accentYellow }}>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 800,
                    color: t.colors.textSecondary,
                    marginBottom: 8,
                  }}
                >
                  Current question
                </div>
                <div style={{ fontSize: 14, lineHeight: 1.6 }}>{activePrompt.text}</div>
              </div>
            ) : null}

            <form
              onSubmit={handleReplySubmit}
              style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 10 }}
            >
              <textarea
                value={replyText}
                onChange={(event) => setReplyText(event.target.value)}
                rows={4}
                placeholder="Add a correction, answer, or clarification here..."
                style={textareaStyle}
              />
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <span style={{ fontSize: 12, color: t.colors.textMuted }}>
                  Replies can be prepared as user notes, then explicitly saved into Stored Documents.
                </span>
                <button type="submit" style={buttonStyle}>
                  {isChatting ? "Sending..." : "Send reply"}
                </button>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </main>
  );
}

function persistProfileForTailoring(
  nextProfile: CandidateProfile,
  sourceDocs: InputDocument[],
  localeValue: "en" | "de",
  readinessLabel: string
): void {
  if (typeof window === "undefined") return;

  sessionStorage.setItem(CANDIDATE_PROFILE_STORAGE_KEY, JSON.stringify(nextProfile));
  sessionStorage.setItem(
    CANDIDATE_PROFILE_META_STORAGE_KEY,
    JSON.stringify({
      locale: localeValue,
      storedAt: new Date().toISOString(),
      sourceCount: sourceDocs.filter((doc) => doc.text.trim()).length,
      readinessLabel,
    })
  );
  sessionStorage.setItem(
    CANDIDATE_DOCUMENTS_STORAGE_KEY,
    JSON.stringify(
      sourceDocs
        .filter((doc) => doc.text.trim())
        .map((doc) => ({
          fileName: doc.fileName,
          kind: doc.kind,
          text: doc.text,
          description: doc.description ?? "",
          isPrimary: Boolean(doc.isPrimary),
        }))
    )
  );
}

function createEmptyDraft(kind: SourceKind): DraftSource {
  return {
    id: null,
    fileName: autoFileNameForKind(kind, 1),
    kind,
    text: "",
    description: "",
    isStored: false,
  };
}

function autoFileNameForKind(kind: SourceKind, count: number): string {
  switch (kind) {
    case "primary_cv":
      return "Primary CV";
    case "additional_cv":
      return `Additional CV ${count}`;
    case "arbeitszeugnis":
      return `Arbeitszeugnis ${count}`;
    case "certificate":
      return `Certificate ${count}`;
    case "user_note":
      return `User note ${count}`;
    case "other":
      return `Other / Misc ${count}`;
    default:
      return "Document";
  }
}

function stripDocxExtension(fileName: string): string {
  return fileName.replace(/\.docx$/i, "").trim();
}

function buildPromptsFromProfile(profile: CandidateProfile): ActivePrompt[] {
  const prompts: ActivePrompt[] = [];

  if (!profile.fullName) {
    prompts.push({ id: createId(), text: "What is the candidate's full name?" });
  }
  if (profile.education.length === 0) {
    prompts.push({
      id: createId(),
      text: "What are the candidate's formal education degrees and institutions?",
    });
  }
  if (profile.certifications.length === 0) {
    prompts.push({
      id: createId(),
      text: "Are there any professional certifications held by the candidate?",
    });
  }

  return prompts;
}

function buildRoleKey(role: CandidateRole): string {
  return [
    role.title || "unknown-title",
    role.company || "unknown-company",
    role.startDate || "unknown-start",
    role.endDate || "present",
  ].join("::");
}

function formatRoleDates(role: CandidateRole): string {
  const start = role.startDate ?? "Unknown start";
  const end = role.isCurrent ? "Present" : role.endDate ?? "Unknown end";
  return `${start} – ${end}`;
}

function createAssistantMessage(
  tone: "status" | "question" | "success" | "error" | "neutral",
  text: string
): ChatMessage {
  return { id: createId(), sender: "assistant", tone, text };
}

function createId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function Card(props: { children: React.ReactNode }): React.JSX.Element {
  return <section style={cardStyle}>{props.children}</section>;
}

function CardTitle(props: { title: string; subtitle: string }): React.JSX.Element {
  return (
    <div style={{ marginBottom: 14 }}>
      <h2 style={{ margin: 0, fontSize: 18, lineHeight: 1.25, fontWeight: 800 }}>{props.title}</h2>
      <p style={{ margin: "6px 0 0", color: t.colors.textMuted, fontSize: 13, lineHeight: 1.5 }}>
        {props.subtitle}
      </p>
    </div>
  );
}

function ProfilePanel(props: { title: string; children: React.ReactNode }): React.JSX.Element {
  return (
    <div style={{ ...subtlePanelStyle, background: t.colors.backgroundSoft }}>
      <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 10 }}>{props.title}</div>
      {props.children}
    </div>
  );
}

function SectionMiniTitle(props: { children: React.ReactNode }): React.JSX.Element {
  return (
    <div style={{ fontSize: 13, fontWeight: 800, color: t.colors.textSecondary, marginBottom: 8 }}>
      {props.children}
    </div>
  );
}

function InfoRow(props: { label: string; value: string }): React.JSX.Element {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 12, fontWeight: 800, color: t.colors.textSecondary, marginBottom: 4 }}>
        {props.label}
      </div>
      <div style={{ fontSize: 14, lineHeight: 1.55, color: t.colors.textPrimary }}>{props.value}</div>
    </div>
  );
}

function TagGroup(props: {
  title: string;
  items: string[];
  emptyText: string;
  tone?: "default" | "amber";
}): React.JSX.Element {
  const tone = props.tone ?? "default";

  return (
    <div style={{ marginBottom: 12 }}>
      <SectionMiniTitle>{props.title}</SectionMiniTitle>
      {props.items.length > 0 ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {props.items.map((item, index) => (
            <span
              key={`${item}-${index}`}
              style={{
                display: "inline-flex",
                padding: "7px 10px",
                borderRadius: 999,
                background: tone === "amber" ? t.colors.accentYellow : t.colors.surface,
                border: `1px solid ${tone === "amber" ? t.colors.warning : t.colors.borderSoft}`,
                fontSize: 12,
                color: t.colors.textPrimary,
              }}
            >
              {item}
            </span>
          ))}
        </div>
      ) : (
        <EmptyState text={props.emptyText} />
      )}
    </div>
  );
}

function MessageBubble(props: { message: ChatMessage }): React.JSX.Element {
  const { message } = props;
  const isAssistant = message.sender === "assistant";

  const toneStyles = {
    status: {
      background: t.colors.backgroundSoft,
      border: t.colors.primary,
      color: t.colors.textPrimary,
      badge: "Status",
    },
    question: {
      background: t.colors.accentYellow,
      border: t.colors.warning,
      color: t.colors.textPrimary,
      badge: "Question",
    },
    success: {
      background: t.colors.accentGreen,
      border: t.colors.success,
      color: t.colors.textPrimary,
      badge: "Updated",
    },
    error: {
      background: "#fff6f6",
      border: t.colors.danger,
      color: t.colors.textPrimary,
      badge: "Issue",
    },
    neutral:
      message.sender === "assistant"
        ? {
            background: t.colors.surface,
            border: t.colors.borderSoft,
            color: t.colors.textPrimary,
            badge: "Assistant",
          }
        : {
            background: t.colors.textPrimary,
            border: t.colors.textPrimary,
            color: t.colors.surface,
            badge: "You",
          },
  }[message.tone];

  return (
    <div style={{ display: "flex", justifyContent: isAssistant ? "flex-start" : "flex-end" }}>
      <div
        style={{
          width: "min(100%, 760px)",
          borderRadius: t.radius.md,
          padding: "12px 14px",
          background: toneStyles.background,
          border: `1px solid ${toneStyles.border}`,
          color: toneStyles.color,
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "4px 8px",
            borderRadius: 999,
            background: t.colors.surface,
            fontSize: 11,
            fontWeight: 800,
            marginBottom: 8,
            color: t.colors.textSecondary,
          }}
        >
          {toneStyles.badge}
        </div>
        <div style={{ fontSize: 14, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{message.text}</div>
      </div>
    </div>
  );
}

function StatusPill(props: { label: string; tone: "blue" | "green" | "amber" }): React.JSX.Element {
  const palette = {
    blue: { background: t.colors.primarySoft, color: t.colors.textOnPrimary },
    green: { background: t.colors.accentGreen, color: t.colors.textPrimary },
    amber: { background: t.colors.accentYellow, color: t.colors.textPrimary },
  }[props.tone];

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "6px 10px",
        borderRadius: 999,
        background: palette.background,
        color: palette.color,
        fontSize: 12,
        fontWeight: 700,
      }}
    >
      {props.label}
    </span>
  );
}

function MiniList(props: { title: string; items: string[]; emptyText: string }): React.JSX.Element {
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ fontSize: 12, fontWeight: 800, color: t.colors.textSecondary, marginBottom: 6 }}>
        {props.title}
      </div>
      {props.items.length > 0 ? (
        <ul style={{ margin: 0, paddingLeft: 18, color: t.colors.textSecondary, fontSize: 13, lineHeight: 1.5 }}>
          {props.items.map((item, index) => (
            <li key={`${item}-${index}`}>{item}</li>
          ))}
        </ul>
      ) : (
        <EmptyState text={props.emptyText} />
      )}
    </div>
  );
}

function EmptyState(props: { text: string }): React.JSX.Element {
  return <div style={{ fontSize: 13, color: t.colors.textMuted }}>{props.text}</div>;
}

function InlineError(props: { text: string }): React.JSX.Element {
  return (
    <div
      style={{
        marginTop: 12,
        borderRadius: t.radius.sm,
        border: `1px solid ${t.colors.danger}`,
        background: "#fff6f6",
        padding: 12,
        color: t.colors.textPrimary,
        fontSize: 14,
      }}
    >
      {props.text}
    </div>
  );
}

const eyebrowStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding: "6px 10px",
  borderRadius: 999,
  background: t.colors.primarySoft,
  color: t.colors.textOnPrimary,
  fontSize: 12,
  fontWeight: 700,
};

const titleStyle: React.CSSProperties = {
  margin: "10px 0 8px",
  fontSize: 32,
  lineHeight: 1.15,
  fontWeight: 800,
  color: t.colors.textPrimary,
};

const subtitleStyle: React.CSSProperties = {
  margin: 0,
  maxWidth: 980,
  color: t.colors.textSecondary,
  fontSize: 15,
  lineHeight: 1.55,
};

const topBarStyle: React.CSSProperties = {
  marginBottom: 18,
  padding: 14,
  borderRadius: t.radius.md,
  background: t.colors.surface,
  border: `1px solid ${t.colors.border}`,
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: 12,
  boxShadow: t.shadow.sm,
};

const cardStyle: React.CSSProperties = {
  background: t.colors.surface,
  border: `1px solid ${t.colors.border}`,
  borderRadius: t.radius.lg,
  padding: 18,
  boxShadow: t.shadow.md,
};

const editorShellStyle: React.CSSProperties = {
  border: `1px solid ${t.colors.borderSoft}`,
  borderRadius: t.radius.md,
  padding: 14,
  background: t.colors.surface,
};

const subtlePanelStyle: React.CSSProperties = {
  border: `1px solid ${t.colors.borderSoft}`,
  borderRadius: t.radius.md,
  padding: 12,
  background: t.colors.surface,
};

const buttonStyle: React.CSSProperties = {
  border: "1px solid transparent",
  borderRadius: t.radius.sm,
  padding: "10px 14px",
  fontSize: 14,
  fontWeight: 700,
  background: t.colors.primary,
  color: t.colors.textOnPrimary,
  cursor: "pointer",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  borderRadius: t.radius.sm,
  border: `1px solid ${t.colors.border}`,
  padding: "10px 12px",
  fontSize: 14,
  outline: "none",
  background: t.colors.surface,
  color: t.colors.textPrimary,
};

const selectStyle: React.CSSProperties = {
  borderRadius: t.radius.sm,
  border: `1px solid ${t.colors.border}`,
  padding: "10px 12px",
  fontSize: 14,
  outline: "none",
  background: t.colors.surface,
  color: t.colors.textPrimary,
};

const textareaStyle: React.CSSProperties = {
  width: "100%",
  borderRadius: t.radius.md,
  border: `1px solid ${t.colors.border}`,
  padding: "12px 14px",
  fontSize: 14,
  lineHeight: 1.6,
  outline: "none",
  resize: "vertical",
  background: t.colors.surface,
  color: t.colors.textPrimary,
  fontFamily:
    'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
};