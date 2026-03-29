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

const KIND_LABELS: Record<SourceKind, string> = {
  primary_cv: "Primary CV",
  additional_cv: "Additional CV",
  arbeitszeugnis: "Arbeitszeugnis",
  certificate: "Certificate",
  user_note: "User note",
  other: "Other",
};

const CANDIDATE_PROFILE_STORAGE_KEY = "cvmvp_candidate_profile";
const CANDIDATE_PROFILE_META_STORAGE_KEY = "cvmvp_candidate_profile_meta";
const CANDIDATE_DOCUMENTS_STORAGE_KEY = "cvmvp_candidate_documents";

export default function ProfilePage(): React.JSX.Element {
  const router = useRouter();
  const saveTimerRef = useRef<number | null>(null);
  const hasLoadedWorkspaceRef = useRef(false);
  const isHydratingWorkspaceRef = useRef(false);

  const [locale, setLocale] = useState<"en" | "de">("en");
  const [documents, setDocuments] = useState<InputDocument[]>([
    createDocument("primary_cv", 1),
  ]);

  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    createAssistantMessage(
      "status",
      "Welcome. I’ll help you build a strong candidate profile from your CV and supporting documents."
    ),
    createAssistantMessage(
      "neutral",
      "Start by pasting your primary CV text. You can add extra documents later."
    ),
  ]);

  const [pendingPrompts, setPendingPrompts] = useState<ActivePrompt[]>([]);
  const [activePrompt, setActivePrompt] = useState<ActivePrompt | null>(null);
  const [answeredPromptCount, setAnsweredPromptCount] = useState(0);

  const [replyText, setReplyText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isChatting, setIsChatting] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [showDocuments, setShowDocuments] = useState(true);
  const [hasShownReadyHint, setHasShownReadyHint] = useState(false);
  const [lastSuggestedAction, setLastSuggestedAction] =
    useState<SuggestedAction>("no_action");
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [workspaceStatus, setWorkspaceStatus] = useState("Loading workspace...");
  const [workspaceLoadedAt, setWorkspaceLoadedAt] = useState<string | null>(null);

  const validDocuments = useMemo(() => {
    return documents.filter((doc) => doc.text.trim().length > 0);
  }, [documents]);

  const supportDocuments = useMemo(() => {
    return validDocuments.filter((doc) =>
      ["additional_cv", "arbeitszeugnis", "certificate", "other"].includes(doc.kind)
    );
  }, [validDocuments]);

  useEffect(() => {
    void loadWorkspace();
  }, []);

  useEffect(() => {
    if (
      !profile &&
      !hasShownReadyHint &&
      validDocuments.some((doc) => doc.kind === "primary_cv")
    ) {
      appendMessage(
        createAssistantMessage(
          "status",
          "I can see source text now. Press Build profile when you’re ready."
        )
      );
      setHasShownReadyHint(true);
    }
  }, [profile, hasShownReadyHint, validDocuments]);

  const profileCompleteness = useMemo(() => {
    if (!profile) return 0;

    let score = 0;
    if (profile.fullName) score += 0.08;
    if (profile.headline) score += 0.08;
    if (profile.summary) score += 0.12;
    if (profile.roles.length > 0) score += 0.24;
    if (profile.roles.some((role) => role.achievements.length > 0)) score += 0.12;
    if (profile.coreSkills.length > 0) score += 0.1;
    if (profile.tools.length > 0 || profile.standards.length > 0) score += 0.08;
    if (profile.education.length > 0) score += 0.08;
    if (profile.certifications.length > 0) score += 0.05;
    if (profile.languages.length > 0) score += 0.03;
    if (answeredPromptCount > 0) score += Math.min(answeredPromptCount * 0.03, 0.12);

    return clamp(score, 0, 1);
  }, [profile, answeredPromptCount]);

  const corroboratedInfo = useMemo(() => {
    if (!profile) return 0;

    let score = 0;
    if (supportDocuments.length >= 1) score += 0.35;
    if (supportDocuments.length >= 2) score += 0.2;
    if (validDocuments.some((doc) => doc.kind === "arbeitszeugnis")) score += 0.15;
    if (validDocuments.some((doc) => doc.kind === "certificate")) score += 0.15;
    if (validDocuments.length >= 3) score += 0.1;

    return clamp(score, 0, 1);
  }, [profile, supportDocuments, validDocuments]);

  const moreInfoRequired = useMemo(() => {
    if (!profile) return 1;

    const raw = Math.min(pendingPrompts.length + profile.openQuestions.length, 8);
    return clamp(raw / 8, 0, 1);
  }, [profile, pendingPrompts]);

  const readinessLabel = useMemo(() => {
    if (!profile) return "Early";
    if (profileCompleteness >= 0.82 && moreInfoRequired <= 0.2) return "Ready";
    if (profileCompleteness >= 0.6) return "Strong";
    if (profileCompleteness >= 0.35) return "Building";
    return "Early";
  }, [profile, profileCompleteness, moreInfoRequired]);

  const includedSourceSummary = useMemo(() => {
    return documents
      .filter((doc) => doc.text.trim())
      .map((doc) => doc.fileName);
  }, [documents]);

  const suggestedActionLabel = useMemo(() => {
    switch (lastSuggestedAction) {
      case "add_manual_summary":
        return "Add manual summary";
      case "paste_into_primary_cv":
        return "Paste into Primary CV";
      case "add_user_note":
        return "Add user note";
      case "click_build_profile":
        return "Build profile";
      case "answer_active_prompt":
        return "Answer current question";
      default:
        return null;
    }
  }, [lastSuggestedAction]);

  const manualSummaryTemplate = useMemo(() => {
    return [
      "Manual candidate summary",
      "",
      "Full name:",
      "Target role:",
      "Main employers:",
      "Date ranges if known:",
      "Main accounting responsibilities:",
      "Systems and tools:",
      "Standards (HGB / IFRS / US GAAP):",
      "Qualifications / certifications:",
      "Languages:",
      "Any notable achievements:",
    ].join("\n");
  }, []);

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
        setWorkspaceStatus("No saved workspace yet.");
        return;
      }

      const savedDocuments =
        data.workspace.documents.length > 0
          ? data.workspace.documents.map((doc, index) => ({
              id: createId(),
              fileName:
                typeof doc.fileName === "string" && doc.fileName.trim()
                  ? doc.fileName
                  : autoFileNameForKind(doc.kind, index + 1),
              kind: doc.kind,
              text: doc.text ?? "",
              description: doc.description ?? "",
              isPrimary: Boolean(doc.isPrimary ?? doc.kind === "primary_cv"),
            }))
          : [createDocument("primary_cv", 1)];

      setDocuments(savedDocuments);

      if (data.workspace.profile) {
        const savedProfile = data.workspace.profile;
        setProfile(savedProfile);

        const prompts = buildPromptsFromProfile(savedProfile);
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

      appendMessage(
        createAssistantMessage(
          "status",
          data.workspace.profile
            ? "Your saved candidate workspace has been loaded."
            : "Your saved source documents have been loaded."
        )
      );

      setHasShownReadyHint(savedDocuments.some((doc) => doc.kind === "primary_cv"));
      hasLoadedWorkspaceRef.current = true;
      setWorkspaceStatus(
        data.workspace.updatedAt
          ? `Workspace loaded · ${new Date(data.workspace.updatedAt).toLocaleString()}`
          : "Workspace loaded"
      );
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Could not load saved workspace.";

      hasLoadedWorkspaceRef.current = true;
      setWorkspaceStatus("Workspace load failed.");
      appendMessage(createAssistantMessage("error", message));
    } finally {
      isHydratingWorkspaceRef.current = false;
    }
  }

  useEffect(() => {
    if (!hasLoadedWorkspaceRef.current) return;
    if (isHydratingWorkspaceRef.current) return;
    if (isRedirecting) return;

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
  }, [documents, profile, locale, readinessLabel]);

  async function persistWorkspace(): Promise<void> {
    try {
      const serializableDocuments = documents.map((doc) => ({
        fileName: doc.fileName,
        kind: doc.kind,
        text: doc.text,
        description: doc.description ?? "",
        isPrimary: Boolean(doc.isPrimary),
      }));

      const response = await fetch("/api/profile/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          profile,
          documents: serializableDocuments,
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

  function addDocument(kind: SourceKind): void {
    const count = documents.filter((doc) => doc.kind === kind).length + 1;
    setDocuments((prev) => [...prev, createDocument(kind, count)]);
  }

  function addUserNote(text: string): void {
    setDocuments((prev) => {
      const noteCount = prev.filter((doc) => doc.kind === "user_note").length + 1;

      return [
        ...prev,
        {
          id: createId(),
          kind: "user_note",
          fileName: autoFileNameForKind("user_note", noteCount),
          text,
          isPrimary: false,
          description: "",
        },
      ];
    });
  }

  function ensurePrimaryCvWithText(prefillText: string): void {
    setDocuments((prev) => {
      const primaryIndex = prev.findIndex((doc) => doc.kind === "primary_cv");

      if (primaryIndex >= 0) {
        const next = [...prev];
        const current = next[primaryIndex];
        next[primaryIndex] = {
          ...current,
          text: current.text.trim() ? current.text : prefillText,
        };
        return next;
      }

      return [
        {
          id: createId(),
          kind: "primary_cv",
          fileName: "Primary CV",
          text: prefillText,
          isPrimary: true,
          description: "",
        },
        ...prev,
      ];
    });
  }

  function handleSuggestedAction(): void {
    switch (lastSuggestedAction) {
      case "add_manual_summary":
        addUserNote(manualSummaryTemplate);
        setShowDocuments(true);
        appendMessage(
          createAssistantMessage(
            "status",
            "I added a manual summary note template to your source documents. Fill it in with whatever you know for now."
          )
        );
        break;

      case "paste_into_primary_cv":
        ensurePrimaryCvWithText("");
        setShowDocuments(true);
        appendMessage(
          createAssistantMessage(
            "status",
            "Use the Primary CV source box below for your main CV text."
          )
        );
        break;

      case "add_user_note":
        addUserNote("");
        setShowDocuments(true);
        appendMessage(
          createAssistantMessage(
            "status",
            "I added a blank user note to your source documents."
          )
        );
        break;

      case "click_build_profile":
        void handleBuildProfile();
        break;

      case "answer_active_prompt":
      case "no_action":
      default:
        break;
    }
  }

  function updateDocument(
    id: string,
    patch: Partial<Pick<InputDocument, "kind" | "text" | "description">>
  ): void {
    setDocuments((prev) =>
      prev.map((doc) => {
        if (doc.id !== id) return doc;

        const nextKind = patch.kind ?? doc.kind;
        const nextCount =
          prev.filter((item) => item.kind === nextKind && item.id !== id).length + 1;

        return {
          ...doc,
          ...patch,
          kind: nextKind,
          fileName: autoFileNameForKind(nextKind, nextCount),
          isPrimary: nextKind === "primary_cv",
        };
      })
    );
  }

  function persistProfileForTailoring(
    nextProfile: CandidateProfile,
    sourceDocs: InputDocument[],
    localeValue: "en" | "de"
  ): void {
    if (typeof window === "undefined") return;

    sessionStorage.setItem(CANDIDATE_PROFILE_STORAGE_KEY, JSON.stringify(nextProfile));

    sessionStorage.setItem(
      CANDIDATE_PROFILE_META_STORAGE_KEY,
      JSON.stringify({
        locale: localeValue,
        storedAt: new Date().toISOString(),
        sourceCount: sourceDocs.filter((doc) => doc.text.trim()).length,
        readinessLabel:
          profileCompleteness >= 0.82 && moreInfoRequired <= 0.2
            ? "Ready"
            : profileCompleteness >= 0.6
              ? "Strong"
              : profileCompleteness >= 0.35
                ? "Building"
                : "Early",
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

  async function handleBuildProfile(): Promise<void> {
    setError(null);

    if (!validDocuments.length) {
      const message = "Please paste at least one source document first.";
      setError(message);
      appendMessage(createAssistantMessage("error", message));
      return;
    }

    appendMessage(
      createAssistantMessage(
        "status",
        `I’m building your profile from ${validDocuments.length} source ${
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
        const message = data.ok ? "Failed to build profile." : data.error;
        throw new Error(message);
      }

      const nextProfile = data.profile;
      setProfile(nextProfile);

      const prompts = buildPromptsFromProfile(nextProfile);
      setPendingPrompts(prompts);
      setActivePrompt(prompts[0] ?? null);
      setAnsweredPromptCount(0);
      setShowDocuments(false);
      setLastSuggestedAction("no_action");

      persistProfileForTailoring(nextProfile, documents, locale);

      await fetch("/api/profile/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          profile: nextProfile,
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
            lastBuiltAt: new Date().toISOString(),
          },
        }),
      });

      appendMessage(
        createAssistantMessage(
          "success",
          "Your candidate profile is ready. Redirecting you to tailoring now."
        )
      );

      setWorkspaceStatus("Profile built and workspace saved.");
      setIsRedirecting(true);

      window.setTimeout(() => {
        router.push("/tailoring");
      }, 500);
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
        const message = data.ok ? "Profile chat failed." : data.error;
        throw new Error(message);
      }

      appendMessage(createAssistantMessage("neutral", data.assistantMessage));
      setLastSuggestedAction(data.suggestedAction ?? "no_action");

      if (data.shouldCaptureAsNote) {
        captureReplyAsUserNote(trimmed, activePrompt?.text ?? null);
      }

      if (data.answeredActivePrompt && activePrompt) {
        const remaining = pendingPrompts.filter((item) => item.id !== activePrompt.id);
        setPendingPrompts(remaining);
        setActivePrompt(remaining[0] ?? null);
        setAnsweredPromptCount((prev) => prev + 1);

        if (remaining[0]) {
          appendMessage(createAssistantMessage("question", remaining[0].text));
        } else {
          appendMessage(
            createAssistantMessage(
              "success",
              "Good. There are no active follow-up questions left right now."
            )
          );
        }
      }
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Unexpected chat error.";

      appendMessage(createAssistantMessage("error", message));
    } finally {
      setIsChatting(false);
    }
  }

  function captureReplyAsUserNote(reply: string, promptText: string | null): void {
    setDocuments((prev) => {
      const noteCount = prev.filter((doc) => doc.kind === "user_note").length + 1;

      return [
        ...prev,
        {
          id: createId(),
          kind: "user_note",
          fileName: autoFileNameForKind("user_note", noteCount),
          text: promptText ? `Prompt: ${promptText}\nAnswer: ${reply}` : reply,
          isPrimary: false,
          description: "",
        },
      ];
    });
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
          padding: "24px 20px 40px",
        }}
      >
        <header
          style={{
            marginBottom: 20,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              alignSelf: "flex-start",
              padding: "6px 10px",
              borderRadius: 999,
              background: t.colors.primarySoft,
              color: t.colors.textOnPrimary,
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            Candidate Profile Builder
          </span>

          <h1
            style={{
              margin: 0,
              fontSize: 32,
              lineHeight: 1.15,
              fontWeight: 800,
              color: t.colors.textPrimary,
            }}
          >
            Build the candidate truth layer first
          </h1>

          <p
            style={{
              margin: 0,
              maxWidth: 980,
              color: t.colors.textSecondary,
              fontSize: 15,
              lineHeight: 1.55,
            }}
          >
            This page helps the system understand the candidate properly before tailoring.
          </p>
        </header>

        <div
          style={{
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
          }}
        >
          <StatusPill
            label={
              isRedirecting
                ? "Redirecting to tailoring..."
                : isExtracting
                  ? "Building profile..."
                  : "Ready"
            }
            tone={
              isRedirecting ? "green" : isExtracting ? "amber" : profile ? "green" : "blue"
            }
          />
          <StatusPill
            label={`${validDocuments.length} source${validDocuments.length === 1 ? "" : "s"}`}
            tone="blue"
          />
          <StatusPill label={readinessLabel} tone={profile ? "green" : "amber"} />
          <StatusPill
            label={workspaceStatus}
            tone={workspaceStatus.toLowerCase().includes("failed") ? "amber" : "blue"}
          />

          <div
            style={{
              marginLeft: "auto",
              display: "flex",
              gap: 8,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <label
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: t.colors.textSecondary,
              }}
            >
              Output language
            </label>

            <select
              value={locale}
              onChange={(event) => setLocale(event.target.value as "en" | "de")}
              style={selectStyle}
              disabled={isExtracting || isRedirecting}
            >
              <option value="en">English</option>
              <option value="de">German</option>
            </select>

            <button
              type="button"
              onClick={handleBuildProfile}
              disabled={isExtracting || isRedirecting}
              style={{
                ...buttonStyle,
                background:
                  isExtracting || isRedirecting ? t.colors.backgroundSoft : t.colors.primary,
                color: t.colors.textOnPrimary,
                cursor: isExtracting || isRedirecting ? "not-allowed" : "pointer",
                opacity: isExtracting || isRedirecting ? 0.8 : 1,
              }}
            >
              {isRedirecting
                ? "Redirecting..."
                : isExtracting
                  ? "Building..."
                  : "Build profile"}
            </button>
          </div>
        </div>

        {workspaceLoadedAt ? (
          <div
            style={{
              marginBottom: 18,
              color: t.colors.textMuted,
              fontSize: 12,
            }}
          >
            Last workspace update: {new Date(workspaceLoadedAt).toLocaleString()}
          </div>
        ) : null}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.35fr 0.9fr",
            gap: 20,
            alignItems: "start",
          }}
        >
          <section
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <Card>
              <CardTitle
                title="Conversation"
                subtitle="This should feel like a guided conversation. I’ll ask one thing at a time."
              />

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  maxHeight: 430,
                  overflowY: "auto",
                  paddingRight: 4,
                }}
              >
                {messages.map((message) => (
                  <MessageBubble key={message.id} message={message} />
                ))}
              </div>

              {activePrompt && (
                <div
                  style={{
                    marginTop: 16,
                    borderRadius: t.radius.md,
                    border: `1px solid ${t.colors.warning}`,
                    background: t.colors.accentYellow,
                    padding: 14,
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 800,
                      color: t.colors.textSecondary,
                      marginBottom: 8,
                      textTransform: "uppercase",
                    }}
                  >
                    Current question
                  </div>
                  <div
                    style={{
                      fontSize: 15,
                      lineHeight: 1.55,
                      color: t.colors.textPrimary,
                    }}
                  >
                    {activePrompt.text}
                  </div>
                </div>
              )}

              {suggestedActionLabel && (
                <div
                  style={{
                    marginTop: 16,
                    borderRadius: t.radius.md,
                    border: `1px solid ${t.colors.border}`,
                    background: t.colors.backgroundSoft,
                    padding: 14,
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 800,
                      color: t.colors.textSecondary,
                      marginBottom: 8,
                      textTransform: "uppercase",
                    }}
                  >
                    Suggested next action
                  </div>

                  <div
                    style={{
                      fontSize: 14,
                      lineHeight: 1.55,
                      color: t.colors.textPrimary,
                      marginBottom: lastSuggestedAction === "add_manual_summary" ? 10 : 0,
                    }}
                  >
                    {renderSuggestedActionHelp(lastSuggestedAction)}
                  </div>

                  {lastSuggestedAction === "add_manual_summary" && (
                    <textarea
                      value={manualSummaryTemplate}
                      readOnly
                      rows={10}
                      style={{
                        ...textareaStyle,
                        background: t.colors.surface,
                        marginBottom: 10,
                      }}
                    />
                  )}

                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      flexWrap: "wrap",
                    }}
                  >
                    {lastSuggestedAction !== "answer_active_prompt" &&
                      lastSuggestedAction !== "no_action" && (
                        <button
                          type="button"
                          onClick={handleSuggestedAction}
                          style={buttonStyle}
                        >
                          {lastSuggestedAction === "click_build_profile"
                            ? "Run action"
                            : "Apply suggestion"}
                        </button>
                      )}

                    {lastSuggestedAction === "add_manual_summary" && (
                      <button
                        type="button"
                        onClick={() => navigator.clipboard.writeText(manualSummaryTemplate)}
                        style={{
                          ...buttonStyle,
                          background: t.colors.surface,
                          color: t.colors.textPrimary,
                          border: `1px solid ${t.colors.border}`,
                        }}
                      >
                        Copy template
                      </button>
                    )}
                  </div>
                </div>
              )}

              <form
                onSubmit={handleReplySubmit}
                style={{
                  marginTop: 16,
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                <textarea
                  value={replyText}
                  onChange={(event) => setReplyText(event.target.value)}
                  rows={4}
                  placeholder={
                    activePrompt
                      ? "Reply here in your own words..."
                      : "You can ask a question or add extra profile detail here..."
                  }
                  style={textareaStyle}
                  disabled={isRedirecting}
                />

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <span
                    style={{
                      fontSize: 12,
                      color: t.colors.textMuted,
                    }}
                  >
                    Answers here can also be captured as notes for later profile rebuilding.
                  </span>

                  <button
                    type="submit"
                    disabled={isChatting || isRedirecting}
                    style={{
                      ...buttonStyle,
                      opacity: isChatting || isRedirecting ? 0.8 : 1,
                      cursor: isChatting || isRedirecting ? "not-allowed" : "pointer",
                    }}
                  >
                    {isChatting ? "Sending..." : "Send reply"}
                  </button>
                </div>
              </form>
            </Card>

            <Card>
              <CardTitle
                title="Source documents"
                subtitle="Paste extracted text for each source. Document cleanup can happen later in the document repository."
              />

              {profile && (
                <div
                  style={{
                    marginBottom: 14,
                    padding: 12,
                    borderRadius: t.radius.md,
                    background: t.colors.backgroundSoft,
                    border: `1px solid ${t.colors.border}`,
                  }}
                >
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: t.colors.textPrimary,
                      marginBottom: 8,
                    }}
                  >
                    Included sources
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 8,
                      marginBottom: 10,
                    }}
                  >
                    {includedSourceSummary.map((item, index) => (
                      <span
                        key={`${item}-${index}`}
                        style={{
                          display: "inline-flex",
                          padding: "7px 10px",
                          borderRadius: 999,
                          background: t.colors.surface,
                          border: `1px solid ${t.colors.borderSoft}`,
                          fontSize: 12,
                          color: t.colors.textPrimary,
                        }}
                      >
                        {item}
                      </span>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowDocuments((prev) => !prev)}
                    style={{
                      ...buttonStyle,
                      background: t.colors.surface,
                      color: t.colors.textPrimary,
                      border: `1px solid ${t.colors.border}`,
                    }}
                  >
                    {showDocuments ? "Hide source documents" : "Show source documents"}
                  </button>
                </div>
              )}

              {(!profile || showDocuments) && (
                <>
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 8,
                      marginBottom: 14,
                    }}
                  >
                    <QuickAddButton
                      label="Add Arbeitszeugnis"
                      onClick={() => addDocument("arbeitszeugnis")}
                    />
                    <QuickAddButton
                      label="Add certificate"
                      onClick={() => addDocument("certificate")}
                    />
                    <QuickAddButton
                      label="Add additional CV"
                      onClick={() => addDocument("additional_cv")}
                    />
                    <QuickAddButton
                      label="Add user note"
                      onClick={() => addDocument("user_note")}
                    />
                    <QuickAddButton
                      label="Add other"
                      onClick={() => addDocument("other")}
                    />
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    {documents.map((doc, index) => (
                      <div
                        key={doc.id}
                        style={{
                          border: `1px solid ${t.colors.borderSoft}`,
                          borderRadius: t.radius.md,
                          background: t.colors.surface,
                          padding: 14,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: 12,
                            flexWrap: "wrap",
                            marginBottom: 10,
                          }}
                        >
                          <div
                            style={{
                              fontSize: 18,
                              fontWeight: 700,
                              color: t.colors.textPrimary,
                            }}
                          >
                            {doc.fileName}
                          </div>

                          <select
                            value={doc.kind}
                            onChange={(event) =>
                              updateDocument(doc.id, {
                                kind: event.target.value as SourceKind,
                              })
                            }
                            style={selectStyle}
                          >
                            <option value="primary_cv">Primary CV</option>
                            <option value="additional_cv">Additional CV</option>
                            <option value="arbeitszeugnis">Arbeitszeugnis</option>
                            <option value="certificate">Certificate</option>
                            <option value="user_note">User note</option>
                            <option value="other">Other</option>
                          </select>
                        </div>

                        <div
                          style={{
                            display: "flex",
                            gap: 8,
                            alignItems: "center",
                            marginBottom: 10,
                            flexWrap: "wrap",
                          }}
                        >
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              padding: "5px 9px",
                              borderRadius: 999,
                              background:
                                doc.kind === "primary_cv"
                                  ? t.colors.primarySoft
                                  : t.colors.backgroundSoft,
                              color:
                                doc.kind === "primary_cv"
                                  ? t.colors.textOnPrimary
                                  : t.colors.textSecondary,
                              fontSize: 12,
                              fontWeight: 700,
                            }}
                          >
                            {KIND_LABELS[doc.kind]}
                          </span>

                          <span
                            style={{
                              fontSize: 12,
                              color: t.colors.textMuted,
                            }}
                          >
                            Source {index + 1}
                          </span>
                        </div>

                        {doc.kind === "other" && (
                          <input
                            type="text"
                            value={doc.description ?? ""}
                            onChange={(event) =>
                              updateDocument(doc.id, {
                                description: event.target.value,
                              })
                            }
                            placeholder="What is this document?"
                            style={{
                              ...inputStyle,
                              marginBottom: 10,
                            }}
                          />
                        )}

                        <textarea
                          value={doc.text}
                          onChange={(event) =>
                            updateDocument(doc.id, { text: event.target.value })
                          }
                          rows={10}
                          placeholder="Paste extracted document text here..."
                          style={textareaStyle}
                        />
                      </div>
                    ))}
                  </div>
                </>
              )}

              {error && (
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
                  {error}
                </div>
              )}
            </Card>
          </section>

          <aside
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 16,
              position: "sticky",
              top: 18,
            }}
          >
            <Card>
              <CardTitle
                title="Profile readiness"
                subtitle="Click the circle to show or hide details."
              />

              <div
                onClick={() => setDetailsOpen((prev) => !prev)}
                style={{
                  cursor: "pointer",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  padding: "8px 0 8px",
                }}
              >
                <ReadinessCircle
                  completeness={profileCompleteness}
                  corroborated={corroboratedInfo}
                  moreInfo={moreInfoRequired}
                  status={readinessLabel}
                />
              </div>

              {detailsOpen && (
                <div
                  style={{
                    marginTop: 12,
                    display: "flex",
                    flexDirection: "column",
                    gap: 14,
                  }}
                >
                  <DetailLine
                    label="Profile completeness"
                    value={describeCompleteness(profileCompleteness)}
                  />
                  <DetailLine
                    label="Corroborated info"
                    value={describeCorroboration(corroboratedInfo)}
                  />
                  <DetailLine
                    label="More info required"
                    value={describeMissing(moreInfoRequired)}
                  />

                  <SnapshotBlock
                    title="Still missing"
                    items={buildMissingItems(profile, pendingPrompts)}
                    emptyText="No major missing items right now."
                    tone="amber"
                  />
                </div>
              )}
            </Card>

            <Card>
              <CardTitle
                title="Stored roles"
                subtitle="These are the roles currently stored in the profile."
              />

              {profile?.roles.length ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {profile.roles.map((role) => (
                    <div
                      key={buildRoleKey(role)}
                      style={{
                        border: `1px solid ${t.colors.borderSoft}`,
                        borderRadius: t.radius.md,
                        padding: 12,
                        background: t.colors.surface,
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: 14,
                          color: t.colors.textPrimary,
                        }}
                      >
                        {role.title}
                      </div>
                      <div
                        style={{
                          fontSize: 13,
                          color: t.colors.textSecondary,
                          marginTop: 2,
                        }}
                      >
                        {role.company ?? "Unknown company"}
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          color: t.colors.textMuted,
                          marginTop: 6,
                          marginBottom: 8,
                        }}
                      >
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
                <EmptyState text="Build the profile first to see stored roles." />
              )}
            </Card>

            <Card>
              <CardTitle
                title="Stored claims"
                subtitle="This is what the system currently stores from the provided material."
              />

              {profile?.verifiedClaims.length ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {profile.verifiedClaims.slice(0, 4).map((claim, index) => (
                    <div
                      key={`${claim.claim}-${index}`}
                      style={{
                        border: `1px solid ${t.colors.success}`,
                        background: t.colors.accentGreen,
                        borderRadius: t.radius.md,
                        padding: 12,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 14,
                          lineHeight: 1.5,
                          color: t.colors.textPrimary,
                          fontWeight: 600,
                        }}
                      >
                        {claim.claim}
                      </div>
                      <div
                        style={{
                          marginTop: 6,
                          fontSize: 12,
                          color: t.colors.textSecondary,
                        }}
                      >
                        Sources: {claim.evidence.join(", ")}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState text="No stored claims shown yet." />
              )}
            </Card>
          </aside>
        </div>
      </div>
    </main>
  );
}

function createDocument(kind: SourceKind, count: number): InputDocument {
  return {
    id: createId(),
    kind,
    fileName: autoFileNameForKind(kind, count),
    text: "",
    isPrimary: kind === "primary_cv",
    description: "",
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
      return `Conversation note ${count}`;
    case "other":
      return `Other document ${count}`;
    default:
      return "Document";
  }
}

function buildPromptsFromProfile(profile: CandidateProfile): ActivePrompt[] {
  const prompts: ActivePrompt[] = [];

  if (!profile.fullName) {
    prompts.push({
      id: createId(),
      text: "What is the candidate's full name?",
    });
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

  for (const role of profile.roles.slice(0, 2)) {
    if (role.achievements.length < 2) {
      prompts.push({
        id: createId(),
        relatedRoleKey: buildRoleKey(role),
        text: `May I ask something about ${formatRoleLabel(role)}? A short list of the main responsibilities would improve future tailoring.`,
      });
    }
  }

  for (const openQuestion of profile.openQuestions.slice(0, 2)) {
    prompts.push({
      id: createId(),
      text: openQuestion,
    });
  }

  return prompts;
}

function buildMissingItems(
  profile: CandidateProfile | null,
  prompts: ActivePrompt[]
): string[] {
  if (!profile) return [];
  if (prompts.length > 0) return prompts.map((item) => item.text).slice(0, 5);
  return profile.openQuestions.slice(0, 5);
}

function formatRoleLabel(role: CandidateRole): string {
  if (role.company) return `the role at ${role.company}`;
  if (role.title) return `the ${role.title} role`;
  return "this role";
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
  return {
    id: createId(),
    sender: "assistant",
    tone,
    text,
  };
}

function createId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function describeCompleteness(value: number): string {
  if (value >= 0.8) return "Strong";
  if (value >= 0.55) return "Good";
  if (value >= 0.3) return "Developing";
  return "Early";
}

function describeCorroboration(value: number): string {
  if (value >= 0.75) return "Well supported";
  if (value >= 0.4) return "Some support";
  if (value > 0) return "Limited support";
  return "Not yet supported";
}

function describeMissing(value: number): string {
  if (value >= 0.7) return "Several important gaps";
  if (value >= 0.35) return "Some important gaps";
  if (value > 0) return "Few important gaps";
  return "No major gaps";
}

function renderSuggestedActionHelp(action: SuggestedAction): string {
  switch (action) {
    case "add_manual_summary":
      return "You do not need perfect source text to continue. Add a short manual summary note with the main facts you know, then build the profile from that.";
    case "paste_into_primary_cv":
      return "Paste your main CV text into the Primary CV source box below.";
    case "add_user_note":
      return "Add a user note for facts, corrections, or temporary details that are not yet in a document.";
    case "click_build_profile":
      return "You have enough material to generate or refresh the candidate profile now.";
    case "answer_active_prompt":
      return "Reply in your own words to the current question shown above.";
    case "no_action":
    default:
      return "";
  }
}

function Card(props: { children: React.ReactNode }): React.JSX.Element {
  return (
    <section
      style={{
        background: t.colors.surface,
        border: `1px solid ${t.colors.border}`,
        borderRadius: t.radius.lg,
        padding: 18,
        boxShadow: t.shadow.md,
      }}
    >
      {props.children}
    </section>
  );
}

function CardTitle(props: { title: string; subtitle: string }): React.JSX.Element {
  return (
    <div style={{ marginBottom: 14 }}>
      <h2
        style={{
          margin: 0,
          fontSize: 18,
          lineHeight: 1.25,
          fontWeight: 800,
          color: t.colors.textPrimary,
        }}
      >
        {props.title}
      </h2>
      <p
        style={{
          margin: "6px 0 0",
          color: t.colors.textMuted,
          fontSize: 13,
          lineHeight: 1.5,
        }}
      >
        {props.subtitle}
      </p>
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
      color: t.colors.textOnPrimary,
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
    <div
      style={{
        display: "flex",
        justifyContent: isAssistant ? "flex-start" : "flex-end",
      }}
    >
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

        <div
          style={{
            fontSize: 14,
            lineHeight: 1.6,
            whiteSpace: "pre-wrap",
          }}
        >
          {message.text}
        </div>
      </div>
    </div>
  );
}

function StatusPill(props: {
  label: string;
  tone: "blue" | "green" | "amber";
}): React.JSX.Element {
  const palette = {
    blue: {
      background: t.colors.primarySoft,
      color: t.colors.textOnPrimary,
    },
    green: {
      background: t.colors.accentGreen,
      color: t.colors.textPrimary,
    },
    amber: {
      background: t.colors.accentYellow,
      color: t.colors.textPrimary,
    },
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

function QuickAddButton(props: {
  label: string;
  onClick: () => void;
}): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={props.onClick}
      style={{
        ...buttonStyle,
        background: t.colors.surface,
        color: t.colors.textPrimary,
        border: `1px solid ${t.colors.border}`,
      }}
    >
      {props.label}
    </button>
  );
}

function SnapshotBlock(props: {
  title: string;
  items: string[];
  emptyText?: string;
  tone?: "default" | "amber";
}): React.JSX.Element {
  const tone = props.tone ?? "default";

  const toneStyles =
    tone === "amber"
      ? {
          background: t.colors.accentYellow,
          border: t.colors.warning,
        }
      : {
          background: t.colors.surface,
          border: t.colors.borderSoft,
        };

  return (
    <div>
      <div
        style={{
          fontSize: 13,
          fontWeight: 800,
          color: t.colors.textSecondary,
          marginBottom: 8,
        }}
      >
        {props.title}
      </div>

      {props.items.length > 0 ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {props.items.map((item, index) => (
            <span
              key={`${item}-${index}`}
              style={{
                display: "inline-flex",
                padding: "7px 10px",
                borderRadius: 999,
                background: toneStyles.background,
                border: `1px solid ${toneStyles.border}`,
                fontSize: 12,
                lineHeight: 1.4,
                color: t.colors.textPrimary,
              }}
            >
              {item}
            </span>
          ))}
        </div>
      ) : (
        <div
          style={{
            fontSize: 13,
            color: t.colors.textMuted,
          }}
        >
          {props.emptyText ?? "Nothing yet."}
        </div>
      )}
    </div>
  );
}

function MiniList(props: {
  title: string;
  items: string[];
  emptyText: string;
}): React.JSX.Element {
  return (
    <div>
      <div
        style={{
          fontSize: 12,
          fontWeight: 800,
          color: t.colors.textSecondary,
          marginBottom: 6,
        }}
      >
        {props.title}
      </div>
      {props.items.length > 0 ? (
        <ul
          style={{
            margin: 0,
            paddingLeft: 18,
            color: t.colors.textSecondary,
            fontSize: 13,
            lineHeight: 1.5,
          }}
        >
          {props.items.map((item, index) => (
            <li key={`${item}-${index}`}>{item}</li>
          ))}
        </ul>
      ) : (
        <div
          style={{
            fontSize: 13,
            color: t.colors.textMuted,
          }}
        >
          {props.emptyText}
        </div>
      )}
    </div>
  );
}

function EmptyState(props: { text: string }): React.JSX.Element {
  return (
    <div
      style={{
        fontSize: 13,
        color: t.colors.textMuted,
      }}
    >
      {props.text}
    </div>
  );
}

function DetailLine(props: { label: string; value: string }): React.JSX.Element {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 12,
        fontSize: 14,
      }}
    >
      <span style={{ color: t.colors.textMuted }}>{props.label}</span>
      <span style={{ color: t.colors.textPrimary, fontWeight: 700, textAlign: "right" }}>
        {props.value}
      </span>
    </div>
  );
}

function ReadinessCircle(props: {
  completeness: number;
  corroborated: number;
  moreInfo: number;
  status: string;
}): React.JSX.Element {
  const size = 320;
  const center = size / 2;

  const outer = { radius: 112, stroke: 22, color: "#F2C94C" };
  const middle = { radius: 84, stroke: 18, color: "#6FCF97" };
  const inner = { radius: 58, stroke: 14, color: "#EB5757" };

  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <path id="outerPath" d={circlePath(center, center, outer.radius)} />
          <path id="middlePath" d={circlePath(center, center, middle.radius)} />
          <path id="innerPath" d={circlePath(center, center, inner.radius)} />
        </defs>

        <Ring
          center={center}
          radius={outer.radius}
          stroke={outer.stroke}
          progress={props.completeness}
          color={outer.color}
        />
        <Ring
          center={center}
          radius={middle.radius}
          stroke={middle.stroke}
          progress={props.corroborated}
          color={middle.color}
        />
        <Ring
          center={center}
          radius={inner.radius}
          stroke={inner.stroke}
          progress={props.moreInfo}
          color={inner.color}
        />

        <text fontSize="11" fill={t.colors.textSecondary} fontWeight="700">
          <textPath href="#outerPath" startOffset="18%">
            Profile completeness
          </textPath>
        </text>

        <text fontSize="11" fill={t.colors.textSecondary} fontWeight="700">
          <textPath href="#middlePath" startOffset="20%">
            Corroborated info
          </textPath>
        </text>

        <text fontSize="10" fill={t.colors.textSecondary} fontWeight="700">
          <textPath href="#innerPath" startOffset="15%">
            More info required
          </textPath>
        </text>
      </svg>

      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          textAlign: "center",
          pointerEvents: "none",
          padding: "0 72px",
        }}
      >
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: t.colors.textMuted,
            marginBottom: 6,
          }}
        >
          Profile readiness
        </div>
        <div
          style={{
            fontSize: 28,
            lineHeight: 1.05,
            fontWeight: 800,
            color: t.colors.textPrimary,
          }}
        >
          {props.status}
        </div>
      </div>
    </div>
  );

  function Ring({
    center,
    radius,
    stroke,
    progress,
    color,
  }: {
    center: number;
    radius: number;
    stroke: number;
    progress: number;
    color: string;
  }) {
    const circumference = 2 * Math.PI * radius;
    const dashOffset = circumference * (1 - progress);

    return (
      <>
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={t.colors.borderSoft}
          strokeWidth={stroke}
        />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${center} ${center})`}
        />
      </>
    );
  }

  function circlePath(cx: number, cy: number, r: number): string {
    return `
      M ${cx}, ${cy}
      m -${r}, 0
      a ${r},${r} 0 1,1 ${2 * r},0
      a ${r},${r} 0 1,1 -${2 * r},0
    `;
  }
}

const buttonStyle: React.CSSProperties = {
  border: "1px solid transparent",
  borderRadius: t.radius.sm,
  padding: "10px 14px",
  fontSize: 14,
  fontWeight: 700,
  background: t.colors.primary,
  color: t.colors.textOnPrimary,
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