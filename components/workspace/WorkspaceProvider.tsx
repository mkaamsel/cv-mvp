"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type {
  WorkspaceClarificationUpdateStatus,
  WorkspaceCandidateCapabilityInventory,
  WorkspaceCandidateProfile,
  WorkspaceDocument,
  WorkspaceDocumentType,
  WorkspaceFinalDrafts,
  WorkspaceInsights,
  WorkspaceInputType,
  WorkspaceJobProfile,
  WorkspaceProgress,
  WorkspaceRunOutcome,
  WorkspaceRunTelemetry,
  WorkspaceStageKey,
  WorkspaceStageOutcome,
  WorkspaceStageTelemetry,
  WorkspaceState,
  WorkspaceStepKey,
  WorkspaceStepStatus,
} from "@/lib/workspace/types";

type WorkspaceContextValue = {
  state: WorkspaceState;
  progress: WorkspaceProgress;

  setDocuments: (docs: WorkspaceDocument[]) => void;
  setUploadedFiles: (files: string[]) => void;
  setJobInput: (payload: { jobUrl?: string; jobText?: string }) => void;

  setCandidateProfile: (profile: WorkspaceCandidateProfile | null) => void;
  setCapabilityInventory: (
    capabilityInventory: WorkspaceCandidateCapabilityInventory | null,
  ) => void;
  setJobProfile: (job: WorkspaceJobProfile | null) => void;
  setInsights: (insights: WorkspaceInsights | null) => void;
  setFinalDrafts: (drafts: WorkspaceFinalDrafts | null) => void;
  setRecommendationClarifications: (
    clarifications: Record<string, string>,
  ) => void;
  setClarificationUpdateState: (patch: {
    status?: WorkspaceClarificationUpdateStatus;
    error?: string | null;
    startedAt?: string | null;
  }) => void;
  setFinalDraftPreference: (preference: "latest" | "original") => void;

  setProfileStatus: (status: WorkspaceStepStatus) => void;
  setJobStatus: (status: WorkspaceStepStatus) => void;
  setInsightsStatus: (status: WorkspaceStepStatus) => void;
  setFinalStatus: (status: WorkspaceStepStatus) => void;

  setProfileError: (message: string | null) => void;
  setJobError: (message: string | null) => void;
  setInsightsError: (message: string | null) => void;
  setFinalError: (message: string | null) => void;

  startTelemetryRun: (payload: {
    runId: string;
    language?: "en" | "de" | "es" | null;
    inputType?: WorkspaceInputType;
    userGeography?: string | null;
    jobGeography?: string | null;
  }) => void;

  updateTelemetryStage: (
    stage: WorkspaceStageKey,
    patch: {
      status?: WorkspaceStageOutcome;
      warning?: string;
      error?: string;
      warnings?: string[];
      errors?: string[];
    },
  ) => void;

  addTelemetryWarning: (message: string) => void;
  addTelemetryError: (message: string) => void;
  addDegradedReason: (reason: string) => void;
  finalizeTelemetryRun: (payload: {
    outcome: WorkspaceRunOutcome;
  }) => void;
  resetTelemetry: () => void;

  getStepHref: (step: WorkspaceStepKey) => string;
  resetWorkspace: () => void;
};

type ProfileLoadResponse =
  | {
      ok: true;
      workspace: {
        profile: unknown;
        capabilityInventory?: unknown;
        documents: unknown[];
        meta: Record<string, unknown>;
        createdAt: string | null;
        updatedAt: string | null;
      } | null;
    }
  | {
      ok: false;
      error: string;
    };

const WORKSPACE_STORAGE_KEY = "cvmvp_workspace_state_v1";

const STAGE_ORDER: WorkspaceStageKey[] = [
  "profile",
  "jobExtraction",
  "requiredProfile",
  "companyContext",
  "companyResearch",
  "marketSignals",
  "selectedEvidence",
  "positioningBrief",
  "recommendation",
  "generation",
];

function createEmptyTelemetry(): WorkspaceRunTelemetry {
  return {
    runId: null,
    startedAt: null,
    completedAt: null,
    durationMs: null,
    language: null,
    inputType: "unknown",
    userGeography: null,
    jobGeography: null,
    outcome: "pending",
    degradedReasons: [],
    warnings: [],
    errors: [],
    stages: STAGE_ORDER.map(
      (stage): WorkspaceStageTelemetry => ({
        stage,
        status: "pending",
        startedAt: null,
        completedAt: null,
        durationMs: null,
        warnings: [],
        errors: [],
      }),
    ),
  };
}

const initialState: WorkspaceState = {
  candidateProfile: null,
  capabilityInventory: null,
  jobProfile: null,
  insights: null,
  finalDrafts: null,
  originalFinalDrafts: null,
  recommendationClarifications: {},
  clarificationUpdateStatus: "idle",
  clarificationUpdateError: null,
  clarificationUpdateStartedAt: null,
  finalDraftPreference: "latest",

  documents: [],
  uploadedFiles: [],
  jobUrl: "",
  jobText: "",

  profileStatus: "idle",
  jobStatus: "idle",
  insightsStatus: "idle",
  finalStatus: "idle",

  profileError: null,
  jobError: null,
  insightsError: null,
  finalError: null,

  telemetry: null,
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function isDocType(value: unknown): value is WorkspaceDocumentType {
  return (
    value === "cv" ||
    value === "certificate" ||
    value === "reference" ||
    value === "other"
  );
}

function restoreDocuments(value: unknown): WorkspaceDocument[] {
  if (!Array.isArray(value)) return [];
  let counter = 0;
  return value
    .filter(isRecord)
    .map((item): WorkspaceDocument | null => {
      const fileName =
        typeof item.fileName === "string" && item.fileName.trim()
          ? item.fileName.trim()
          : null;
      const text = typeof item.text === "string" ? item.text : null;
      if (!fileName || text === null) return null;
      return {
        id:
          typeof item.id === "string" && item.id
            ? item.id
            : `restored-${++counter}`,
        fileName,
        docType: isDocType(item.docType) ? item.docType : "cv",
        customLabel:
          typeof item.customLabel === "string" ? item.customLabel : "",
        text,
        chars: typeof item.chars === "number" ? item.chars : text.length,
        uploadedAt:
          typeof item.uploadedAt === "string" ? item.uploadedAt : "",
      };
    })
    .filter((item): item is WorkspaceDocument => item !== null);
}

function isStepStatus(value: unknown): value is WorkspaceStepStatus {
  return (
    value === "idle" ||
    value === "loading" ||
    value === "ready" ||
    value === "error"
  );
}

function isStageOutcome(value: unknown): value is WorkspaceStageOutcome {
  return (
    value === "pending" ||
    value === "processing" ||
    value === "success" ||
    value === "partial" ||
    value === "error" ||
    value === "unavailable"
  );
}

function isRunOutcome(value: unknown): value is WorkspaceRunOutcome {
  return (
    value === "pending" ||
    value === "completed" ||
    value === "completed_with_limitations" ||
    value === "failed"
  );
}

function isInputType(value: unknown): value is WorkspaceInputType {
  return (
    value === "url_only" ||
    value === "pasted_text_only" ||
    value === "url_and_pasted_text" ||
    value === "unknown"
  );
}

function restoreTelemetry(value: unknown): WorkspaceRunTelemetry | null {
  if (!isRecord(value)) {
    return null;
  }

  const restoredStages: WorkspaceStageTelemetry[] =
    Array.isArray(value.stages) && value.stages.length > 0
      ? value.stages
          .map((item): WorkspaceStageTelemetry | null => {
            if (!isRecord(item) || typeof item.stage !== "string") return null;

            const stage = STAGE_ORDER.includes(item.stage as WorkspaceStageKey)
              ? (item.stage as WorkspaceStageKey)
              : null;

            if (!stage) return null;

            const status: WorkspaceStageOutcome = isStageOutcome(item.status)
              ? item.status
              : "pending";

            return {
              stage,
              status,
              startedAt:
                typeof item.startedAt === "string" ? item.startedAt : null,
              completedAt:
                typeof item.completedAt === "string" ? item.completedAt : null,
              durationMs:
                typeof item.durationMs === "number" ? item.durationMs : null,
              warnings: asStringArray(item.warnings),
              errors: asStringArray(item.errors),
            };
          })
          .filter((item): item is WorkspaceStageTelemetry => item !== null)
      : [];

  const ensuredStages: WorkspaceStageTelemetry[] = STAGE_ORDER.map((stage) => {
    const existing = restoredStages.find((item) => item.stage === stage);

    return (
      existing ?? {
        stage,
        status: "pending",
        startedAt: null,
        completedAt: null,
        durationMs: null,
        warnings: [],
        errors: [],
      }
    );
  });

  return {
    runId: typeof value.runId === "string" ? value.runId : null,
    startedAt: typeof value.startedAt === "string" ? value.startedAt : null,
    completedAt:
      typeof value.completedAt === "string" ? value.completedAt : null,
    durationMs: typeof value.durationMs === "number" ? value.durationMs : null,
    language:
      value.language === "en" || value.language === "de" || value.language === "es"
        ? value.language
        : null,
    inputType: isInputType(value.inputType) ? value.inputType : "unknown",
    userGeography:
      typeof value.userGeography === "string" ? value.userGeography : null,
    jobGeography:
      typeof value.jobGeography === "string" ? value.jobGeography : null,
    outcome: isRunOutcome(value.outcome) ? value.outcome : "pending",
    degradedReasons: asStringArray(value.degradedReasons),
    warnings: asStringArray(value.warnings),
    errors: asStringArray(value.errors),
    stages: ensuredStages,
  };
}

function restoreWorkspaceState(input: unknown): WorkspaceState {
  if (!isRecord(input)) {
    return initialState;
  }

  return {
    candidateProfile:
      (input.candidateProfile as WorkspaceCandidateProfile | null) ?? null,
    capabilityInventory:
      (input.capabilityInventory as WorkspaceCandidateCapabilityInventory | null) ??
      null,
    jobProfile: (input.jobProfile as WorkspaceJobProfile | null) ?? null,
    insights: (input.insights as WorkspaceInsights | null) ?? null,
    finalDrafts: (input.finalDrafts as WorkspaceFinalDrafts | null) ?? null,
    originalFinalDrafts:
      (input.originalFinalDrafts as WorkspaceFinalDrafts | null) ?? null,
    recommendationClarifications: isRecord(input.recommendationClarifications)
      ? Object.entries(input.recommendationClarifications).reduce<
          Record<string, string>
        >((acc, [key, value]) => {
          if (typeof value === "string") {
            acc[key] = value;
          }
          return acc;
        }, {})
      : {},
    clarificationUpdateStatus:
      input.clarificationUpdateStatus === "saving_clarifications" ||
      input.clarificationUpdateStatus === "rerunning" ||
      input.clarificationUpdateStatus === "rerun_succeeded" ||
      input.clarificationUpdateStatus === "rerun_failed"
        ? input.clarificationUpdateStatus
        : "idle",
    clarificationUpdateError:
      typeof input.clarificationUpdateError === "string"
        ? input.clarificationUpdateError
        : null,
    clarificationUpdateStartedAt:
      typeof input.clarificationUpdateStartedAt === "string"
        ? input.clarificationUpdateStartedAt
        : null,
    finalDraftPreference:
      input.finalDraftPreference === "original" ? "original" : "latest",

    documents: restoreDocuments(input.documents),
    uploadedFiles: asStringArray(input.uploadedFiles),
    jobUrl: typeof input.jobUrl === "string" ? input.jobUrl : "",
    jobText: typeof input.jobText === "string" ? input.jobText : "",

    profileStatus: isStepStatus(input.profileStatus)
      ? input.profileStatus
      : "idle",
    jobStatus: isStepStatus(input.jobStatus) ? input.jobStatus : "idle",
    insightsStatus: isStepStatus(input.insightsStatus)
      ? input.insightsStatus
      : "idle",
    finalStatus: isStepStatus(input.finalStatus) ? input.finalStatus : "idle",

    profileError:
      typeof input.profileError === "string" ? input.profileError : null,
    jobError: typeof input.jobError === "string" ? input.jobError : null,
    insightsError:
      typeof input.insightsError === "string" ? input.insightsError : null,
    finalError: typeof input.finalError === "string" ? input.finalError : null,

    telemetry: restoreTelemetry(input.telemetry),
  };
}

function deriveProgress(state: WorkspaceState): WorkspaceProgress {
  const profileReady = !!state.candidateProfile;
  const jobReady = !!state.jobProfile;
  const insightsReady = !!state.insights;
  const finalReady = !!state.finalDrafts;

  let nextStep: WorkspaceStepKey = "profile";

  if (!profileReady) {
    nextStep = "profile";
  } else if (!jobReady) {
    nextStep = "job";
  } else if (!insightsReady) {
    nextStep = "insights";
  } else {
    nextStep = "final";
  }

  return {
    profileReady,
    jobReady,
    insightsReady,
    finalReady,
    nextStep,
  };
}

function normalizeLoadedProfile(
  value: unknown,
): WorkspaceCandidateProfile | null {
  if (!isRecord(value)) {
    return null;
  }

  return value as WorkspaceCandidateProfile;
}

function normalizeLoadedCapabilityInventory(
  value: unknown,
): WorkspaceCandidateCapabilityInventory | null {
  if (!isRecord(value)) {
    return null;
  }

  return value as WorkspaceCandidateCapabilityInventory;
}

function normalizeLoadedDocuments(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (typeof item === "string") {
        return item;
      }

      if (isRecord(item)) {
        if (typeof item.fileName === "string" && item.fileName.trim()) {
          return item.fileName.trim();
        }

        if (typeof item.name === "string" && item.name.trim()) {
          return item.name.trim();
        }

        if (typeof item.title === "string" && item.title.trim()) {
          return item.title.trim();
        }

        if (typeof item.kind === "string" && item.kind.trim()) {
          return item.kind.trim();
        }
      }

      return null;
    })
    .filter((item): item is string => Boolean(item));
}

// Maps a StoredDocument.kind (DB schema) to the WorkspaceDocumentType used by
// the Document Library. Must stay in sync with profile-store SourceKind values.
function sourceKindToDocType(kind: unknown): WorkspaceDocumentType {
  switch (kind) {
    case "primary_cv":
    case "additional_cv":
      return "cv";
    case "arbeitszeugnis":
      return "reference";
    case "certificate":
      return "certificate";
    default:
      return "other";
  }
}

// Converts the raw StoredDocument[] from /api/profile/load into WorkspaceDocument[]
// so the Document Library can hydrate correctly after a restart (sessionStorage cleared).
function normalizeLoadedWorkspaceDocuments(value: unknown): WorkspaceDocument[] {
  if (!Array.isArray(value)) return [];
  let counter = 0;
  return value
    .filter(isRecord)
    .map((item): WorkspaceDocument | null => {
      const fileName =
        typeof item.fileName === "string" && item.fileName.trim()
          ? item.fileName.trim()
          : typeof item.name === "string" && item.name.trim()
            ? item.name.trim()
            : null;
      const text = typeof item.text === "string" ? item.text : null;
      if (!fileName || text === null) return null;
      return {
        id: `loaded-${++counter}-${Date.now()}`,
        fileName,
        docType: sourceKindToDocType(item.kind),
        customLabel:
          typeof item.description === "string" ? item.description : "",
        text,
        chars: text.length,
        uploadedAt: typeof item.uploadedAt === "string" ? item.uploadedAt : "",
      };
    })
    .filter((item): item is WorkspaceDocument => item !== null);
}

function mergeLoadedWorkspace(
  current: WorkspaceState,
  loadedProfile: WorkspaceCandidateProfile | null,
  loadedCapabilityInventory: WorkspaceCandidateCapabilityInventory | null,
  loadedFiles: string[],
  loadedDocuments: WorkspaceDocument[],
): WorkspaceState {
  const shouldUseLoadedProfile = !current.candidateProfile && loadedProfile;
  const shouldUseLoadedCapabilityInventory =
    !current.capabilityInventory && loadedCapabilityInventory;
  const mergedFiles =
    current.uploadedFiles.length > 0 ? current.uploadedFiles : loadedFiles;
  // Only restore from DB if sessionStorage did not already have documents.
  // This prevents overwriting an in-session library with the (potentially stale) DB copy.
  const mergedDocuments =
    current.documents.length > 0 ? current.documents : loadedDocuments;

  return {
    ...current,
    candidateProfile: shouldUseLoadedProfile
      ? loadedProfile
      : current.candidateProfile,
    capabilityInventory: shouldUseLoadedCapabilityInventory
      ? loadedCapabilityInventory
      : current.capabilityInventory,
    uploadedFiles: mergedFiles,
    documents: mergedDocuments,
    profileStatus:
      shouldUseLoadedProfile || current.candidateProfile
        ? "ready"
        : "idle",
    profileError: null,
  };
}

function nowIso(): string {
  return new Date().toISOString();
}

function computeDurationMs(
  startedAt?: string | null,
  completedAt?: string | null,
): number | null {
  if (!startedAt || !completedAt) return null;

  const start = new Date(startedAt).getTime();
  const end = new Date(completedAt).getTime();

  if (Number.isNaN(start) || Number.isNaN(end)) return null;
  return Math.max(0, end - start);
}

function updateStageCollection(
  telemetry: WorkspaceRunTelemetry,
  stage: WorkspaceStageKey,
  patch: {
    status?: WorkspaceStageOutcome;
    warning?: string;
    error?: string;
    warnings?: string[];
    errors?: string[];
  },
): WorkspaceRunTelemetry {
  const currentTime = nowIso();

  return {
    ...telemetry,
    stages: telemetry.stages.map((item): WorkspaceStageTelemetry => {
      if (item.stage !== stage) return item;

      const nextStatus: WorkspaceStageOutcome = patch.status ?? item.status;

      const startedAt =
        nextStatus === "processing"
          ? item.startedAt || currentTime
          : item.startedAt;

      const completedAt =
        nextStatus === "success" ||
        nextStatus === "partial" ||
        nextStatus === "error" ||
        nextStatus === "unavailable"
          ? currentTime
          : item.completedAt;

      const warnings = Array.from(
        new Set([
          ...(item.warnings || []),
          ...(patch.warnings || []),
          ...(patch.warning ? [patch.warning] : []),
        ]),
      );

      const errors = Array.from(
        new Set([
          ...(item.errors || []),
          ...(patch.errors || []),
          ...(patch.error ? [patch.error] : []),
        ]),
      );

      return {
        ...item,
        status: nextStatus,
        startedAt,
        completedAt,
        durationMs: computeDurationMs(startedAt, completedAt),
        warnings,
        errors,
      };
    }),
  };
}

export default function WorkspaceProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [state, setState] = useState<WorkspaceState>(initialState);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const raw = sessionStorage.getItem(WORKSPACE_STORAGE_KEY);

      if (raw) {
        const parsed = JSON.parse(raw);
        setState(restoreWorkspaceState(parsed));
      }
    } catch {
      setState(initialState);
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;

    try {
      sessionStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore storage write issues
    }
  }, [state, hydrated]);

  useEffect(() => {
    if (!hydrated) return;

    let cancelled = false;

    async function loadStoredWorkspace() {
      setState((current) => ({
        ...current,
        profileStatus:
          current.candidateProfile || current.profileStatus === "ready"
            ? current.profileStatus
            : "loading",
        profileError: null,
      }));

      try {
        const response = await fetch("/api/profile/load", {
          method: "GET",
          cache: "no-store",
        });

        const data = (await response.json()) as ProfileLoadResponse;

        if (!response.ok || !data.ok) {
          if (cancelled) return;

          setState((current) => ({
            ...current,
            profileStatus: current.candidateProfile ? "ready" : "idle",
            profileError:
              "error" in data && typeof data.error === "string"
                ? data.error
                : null,
          }));
          return;
        }

        const loadedProfile = normalizeLoadedProfile(
          data.workspace?.profile ?? null,
        );
        const loadedCapabilityInventory = normalizeLoadedCapabilityInventory(
          data.workspace?.capabilityInventory ?? null,
        );
        const loadedFiles = normalizeLoadedDocuments(
          data.workspace?.documents ?? [],
        );
        const loadedDocuments = normalizeLoadedWorkspaceDocuments(
          data.workspace?.documents ?? [],
        );

        if (cancelled) return;

        setState((current) =>
          mergeLoadedWorkspace(
            current,
            loadedProfile,
            loadedCapabilityInventory,
            loadedFiles,
            loadedDocuments,
          ),
        );
      } catch {
        if (cancelled) return;

        setState((current) => ({
          ...current,
          profileStatus: current.candidateProfile ? "ready" : "idle",
        }));
      }
    }

    void loadStoredWorkspace();

    return () => {
      cancelled = true;
    };
  }, [hydrated]);

  const progress = useMemo(() => deriveProgress(state), [state]);

  const setDocuments = useCallback((docs: WorkspaceDocument[]) => {
    setState((current) => ({
      ...current,
      documents: docs,
    }));
  }, []);

  const setUploadedFiles = useCallback((files: string[]) => {
    setState((current) => ({
      ...current,
      uploadedFiles: files,
    }));
  }, []);

  const setJobInput = useCallback(
    (payload: { jobUrl?: string; jobText?: string }) => {
      setState((current) => ({
        ...current,
        jobUrl: payload.jobUrl ?? current.jobUrl,
        jobText: payload.jobText ?? current.jobText,
        jobError: null,
      }));
    },
    [],
  );

  const setCandidateProfile = useCallback(
    (profile: WorkspaceCandidateProfile | null) => {
      setState((current) => ({
        ...current,
        candidateProfile: profile,
        profileStatus: profile ? "ready" : "idle",
        profileError: null,
        ...(profile
          ? {}
          : {
              capabilityInventory: null,
              jobProfile: null,
              insights: null,
              finalDrafts: null,
              originalFinalDrafts: null,
              recommendationClarifications: {},
              clarificationUpdateStatus: "idle",
              clarificationUpdateError: null,
              clarificationUpdateStartedAt: null,
              finalDraftPreference: "latest",
              jobStatus: "idle" as const,
              insightsStatus: "idle" as const,
              finalStatus: "idle" as const,
              jobError: null,
              insightsError: null,
              finalError: null,
            }),
      }));
    },
    [],
  );

  const setCapabilityInventory = useCallback(
    (capabilityInventory: WorkspaceCandidateCapabilityInventory | null) => {
      setState((current) => ({
        ...current,
        capabilityInventory,
      }));
    },
    [],
  );

  const setJobProfile = useCallback((job: WorkspaceJobProfile | null) => {
    setState((current) => ({
      ...current,
      jobProfile: job,
      jobStatus: job ? "ready" : "idle",
      jobError: null,
      ...(job
        ? {}
        : {
            insights: null,
            finalDrafts: null,
            insightsStatus: "idle" as const,
            finalStatus: "idle" as const,
            insightsError: null,
            finalError: null,
          }),
    }));
  }, []);

  const setInsights = useCallback((insights: WorkspaceInsights | null) => {
    setState((current) => ({
      ...current,
      insights,
      insightsStatus: insights ? "ready" : "idle",
      insightsError: null,
      ...(insights
        ? {}
        : {
            finalDrafts: null,
            finalStatus: "idle" as const,
            finalError: null,
          }),
    }));
  }, []);

  const setFinalDrafts = useCallback((drafts: WorkspaceFinalDrafts | null) => {
    const canonicalDrafts = drafts
      ? {
          ...drafts,
          cvDraft: drafts.cvDraft || drafts.finalCv || "",
          finalCv: drafts.cvDraft || drafts.finalCv || "",
          coverLetterDraft: drafts.coverLetterDraft || drafts.finalCoverLetter || "",
          finalCoverLetter: drafts.coverLetterDraft || drafts.finalCoverLetter || "",
        }
      : null;

    setState((current) => ({
      ...current,
      finalDrafts: canonicalDrafts,
      originalFinalDrafts: canonicalDrafts
        ? current.originalFinalDrafts ?? canonicalDrafts
        : null,
      finalDraftPreference: canonicalDrafts ? current.finalDraftPreference : "latest",
      clarificationUpdateStatus: canonicalDrafts
        ? current.clarificationUpdateStatus
        : "idle",
      clarificationUpdateError: canonicalDrafts ? current.clarificationUpdateError : null,
      clarificationUpdateStartedAt: canonicalDrafts
        ? current.clarificationUpdateStartedAt
        : null,
      finalStatus: canonicalDrafts ? "ready" : "idle",
      finalError: null,
    }));
  }, []);

  const setRecommendationClarifications = useCallback(
    (clarifications: Record<string, string>) => {
      setState((current) => ({
        ...current,
        recommendationClarifications: clarifications,
      }));
    },
    [],
  );

  const setClarificationUpdateState = useCallback(
    (patch: {
      status?: WorkspaceClarificationUpdateStatus;
      error?: string | null;
      startedAt?: string | null;
    }) => {
      setState((current) => ({
        ...current,
        clarificationUpdateStatus: patch.status ?? current.clarificationUpdateStatus,
        clarificationUpdateError:
          patch.error !== undefined ? patch.error : current.clarificationUpdateError,
        clarificationUpdateStartedAt:
          patch.startedAt !== undefined
            ? patch.startedAt
            : current.clarificationUpdateStartedAt,
      }));
    },
    [],
  );

  const setFinalDraftPreference = useCallback(
    (preference: "latest" | "original") => {
      setState((current) => ({
        ...current,
        finalDraftPreference: preference,
      }));
    },
    [],
  );

  const setProfileStatus = useCallback((status: WorkspaceStepStatus) => {
    setState((current) => ({
      ...current,
      profileStatus: status,
    }));
  }, []);

  const setJobStatus = useCallback((status: WorkspaceStepStatus) => {
    setState((current) => ({
      ...current,
      jobStatus: status,
    }));
  }, []);

  const setInsightsStatus = useCallback((status: WorkspaceStepStatus) => {
    setState((current) => ({
      ...current,
      insightsStatus: status,
    }));
  }, []);

  const setFinalStatus = useCallback((status: WorkspaceStepStatus) => {
    setState((current) => ({
      ...current,
      finalStatus: status,
    }));
  }, []);

  const setProfileError = useCallback((message: string | null) => {
    setState((current) => ({
      ...current,
      profileError: message,
      profileStatus: message ? "error" : current.profileStatus,
    }));
  }, []);

  const setJobError = useCallback((message: string | null) => {
    setState((current) => ({
      ...current,
      jobError: message,
      jobStatus: message ? "error" : current.jobStatus,
    }));
  }, []);

  const setInsightsError = useCallback((message: string | null) => {
    setState((current) => ({
      ...current,
      insightsError: message,
      insightsStatus: message ? "error" : current.insightsStatus,
    }));
  }, []);

  const setFinalError = useCallback((message: string | null) => {
    setState((current) => ({
      ...current,
      finalError: message,
      finalStatus: message ? "error" : current.finalStatus,
    }));
  }, []);

  const startTelemetryRun = useCallback(
    (payload: {
      runId: string;
      language?: "en" | "de" | "es" | null;
      inputType?: WorkspaceInputType;
      userGeography?: string | null;
      jobGeography?: string | null;
    }) => {
      const startedAt = nowIso();

      setState((current) => ({
        ...current,
        telemetry: {
          ...createEmptyTelemetry(),
          runId: payload.runId,
          startedAt,
          language: payload.language ?? null,
          inputType: payload.inputType ?? "unknown",
          userGeography: payload.userGeography ?? null,
          jobGeography: payload.jobGeography ?? null,
        },
      }));
    },
    [],
  );

  const updateTelemetryStage = useCallback(
    (
      stage: WorkspaceStageKey,
      patch: {
        status?: WorkspaceStageOutcome;
        warning?: string;
        error?: string;
        warnings?: string[];
        errors?: string[];
      },
    ) => {
      setState((current) => {
        const telemetry = current.telemetry ?? createEmptyTelemetry();

        return {
          ...current,
          telemetry: updateStageCollection(telemetry, stage, patch),
        };
      });
    },
    [],
  );

  const addTelemetryWarning = useCallback((message: string) => {
    if (!message.trim()) return;

    setState((current) => {
      const telemetry = current.telemetry ?? createEmptyTelemetry();

      return {
        ...current,
        telemetry: {
          ...telemetry,
          warnings: Array.from(new Set([...telemetry.warnings, message.trim()])),
        },
      };
    });
  }, []);

  const addTelemetryError = useCallback((message: string) => {
    if (!message.trim()) return;

    setState((current) => {
      const telemetry = current.telemetry ?? createEmptyTelemetry();

      return {
        ...current,
        telemetry: {
          ...telemetry,
          errors: Array.from(new Set([...telemetry.errors, message.trim()])),
        },
      };
    });
  }, []);

  const addDegradedReason = useCallback((reason: string) => {
    if (!reason.trim()) return;

    setState((current) => {
      const telemetry = current.telemetry ?? createEmptyTelemetry();

      return {
        ...current,
        telemetry: {
          ...telemetry,
          degradedReasons: Array.from(
            new Set([...telemetry.degradedReasons, reason.trim()]),
          ),
        },
      };
    });
  }, []);

  const finalizeTelemetryRun = useCallback(
    (payload: { outcome: WorkspaceRunOutcome }) => {
      const completedAt = nowIso();

      setState((current) => {
        const telemetry = current.telemetry ?? createEmptyTelemetry();

        return {
          ...current,
          telemetry: {
            ...telemetry,
            outcome: payload.outcome,
            completedAt,
            durationMs: computeDurationMs(telemetry.startedAt, completedAt),
          },
        };
      });
    },
    [],
  );

  const resetTelemetry = useCallback(() => {
    setState((current) => ({
      ...current,
      telemetry: null,
    }));
  }, []);

  const getStepHref = useCallback((step: WorkspaceStepKey) => {
    return `/workspace/${step}`;
  }, []);

  const resetWorkspace = useCallback(() => {
    setState(initialState);

    if (typeof window !== "undefined") {
      try {
        sessionStorage.removeItem(WORKSPACE_STORAGE_KEY);
      } catch {
        // ignore storage delete issues
      }
    }
  }, []);

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      state,
      progress,
      setDocuments,
      setUploadedFiles,
      setJobInput,
      setCandidateProfile,
      setCapabilityInventory,
      setJobProfile,
      setInsights,
      setFinalDrafts,
      setRecommendationClarifications,
      setClarificationUpdateState,
      setFinalDraftPreference,
      setProfileStatus,
      setJobStatus,
      setInsightsStatus,
      setFinalStatus,
      setProfileError,
      setJobError,
      setInsightsError,
      setFinalError,
      startTelemetryRun,
      updateTelemetryStage,
      addTelemetryWarning,
      addTelemetryError,
      addDegradedReason,
      finalizeTelemetryRun,
      resetTelemetry,
      getStepHref,
      resetWorkspace,
    }),
    [
      state,
      progress,
      setDocuments,
      setUploadedFiles,
      setJobInput,
      setCandidateProfile,
      setCapabilityInventory,
      setJobProfile,
      setInsights,
      setFinalDrafts,
      setRecommendationClarifications,
      setClarificationUpdateState,
      setFinalDraftPreference,
      setProfileStatus,
      setJobStatus,
      setInsightsStatus,
      setFinalStatus,
      setProfileError,
      setJobError,
      setInsightsError,
      setFinalError,
      startTelemetryRun,
      updateTelemetryStage,
      addTelemetryWarning,
      addTelemetryError,
      addDegradedReason,
      finalizeTelemetryRun,
      resetTelemetry,
      getStepHref,
      resetWorkspace,
    ],
  );

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);

  if (!context) {
    throw new Error("useWorkspace must be used inside WorkspaceProvider");
  }

  return context;
}
