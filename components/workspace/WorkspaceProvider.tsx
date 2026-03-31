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
  WorkspaceCandidateProfile,
  WorkspaceFinalDrafts,
  WorkspaceInsights,
  WorkspaceJobProfile,
  WorkspaceProgress,
  WorkspaceState,
  WorkspaceStepKey,
} from "@/lib/workspace/types";

type WorkspaceContextValue = {
  state: WorkspaceState;
  progress: WorkspaceProgress;

  setUploadedFiles: (files: string[]) => void;
  setJobInput: (payload: { jobUrl?: string; jobText?: string }) => void;

  setCandidateProfile: (profile: WorkspaceCandidateProfile | null) => void;
  setJobProfile: (job: WorkspaceJobProfile | null) => void;
  setInsights: (insights: WorkspaceInsights | null) => void;
  setFinalDrafts: (drafts: WorkspaceFinalDrafts | null) => void;

  setProfileStatus: (status: WorkspaceState["profileStatus"]) => void;
  setJobStatus: (status: WorkspaceState["jobStatus"]) => void;
  setFinalStatus: (status: WorkspaceState["finalStatus"]) => void;

  setProfileError: (message: string | null) => void;
  setJobError: (message: string | null) => void;
  setFinalError: (message: string | null) => void;

  getStepHref: (step: WorkspaceStepKey) => string;
  resetWorkspace: () => void;
};

type ProfileLoadResponse =
  | {
      ok: true;
      workspace: {
        profile: unknown;
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

const initialState: WorkspaceState = {
  candidateProfile: null,
  jobProfile: null,
  insights: null,
  finalDrafts: null,

  uploadedFiles: [],
  jobUrl: "",
  jobText: "",

  profileStatus: "idle",
  jobStatus: "idle",
  finalStatus: "idle",

  profileError: null,
  jobError: null,
  finalError: null,
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

function restoreWorkspaceState(input: unknown): WorkspaceState {
  if (!isRecord(input)) {
    return initialState;
  }

  return {
    candidateProfile: (input.candidateProfile as WorkspaceCandidateProfile | null) ?? null,
    jobProfile: (input.jobProfile as WorkspaceJobProfile | null) ?? null,
    insights: (input.insights as WorkspaceInsights | null) ?? null,
    finalDrafts: (input.finalDrafts as WorkspaceFinalDrafts | null) ?? null,

    uploadedFiles: asStringArray(input.uploadedFiles),
    jobUrl: typeof input.jobUrl === "string" ? input.jobUrl : "",
    jobText: typeof input.jobText === "string" ? input.jobText : "",

    profileStatus:
      input.profileStatus === "loading" ||
      input.profileStatus === "ready" ||
      input.profileStatus === "error"
        ? input.profileStatus
        : "idle",

    jobStatus:
      input.jobStatus === "loading" ||
      input.jobStatus === "ready" ||
      input.jobStatus === "error"
        ? input.jobStatus
        : "idle",

    finalStatus:
      input.finalStatus === "loading" ||
      input.finalStatus === "ready" ||
      input.finalStatus === "error"
        ? input.finalStatus
        : "idle",

    profileError: typeof input.profileError === "string" ? input.profileError : null,
    jobError: typeof input.jobError === "string" ? input.jobError : null,
    finalError: typeof input.finalError === "string" ? input.finalError : null,
  };
}

function deriveProgress(state: WorkspaceState): WorkspaceProgress {
  const profileReady = !!state.candidateProfile;
  const jobReady = !!state.jobProfile;

  const insightsReady = !!state.insights || !!state.jobProfile;

  const finalReady = profileReady && jobReady;

  let nextStep: WorkspaceStepKey = "profile";

  if (!profileReady) {
    nextStep = "profile";
  } else if (!jobReady) {
    nextStep = "job";
  } else if (!state.finalDrafts) {
    nextStep = "final";
  } else {
    nextStep = "insights";
  }

  return {
    profileReady,
    jobReady,
    insightsReady,
    finalReady,
    nextStep,
  };
}

function normalizeLoadedProfile(value: unknown): WorkspaceCandidateProfile | null {
  if (!isRecord(value)) {
    return null;
  }

  return value as WorkspaceCandidateProfile;
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

function mergeLoadedWorkspace(
  current: WorkspaceState,
  loadedProfile: WorkspaceCandidateProfile | null,
  loadedFiles: string[]
): WorkspaceState {
  const shouldUseLoadedProfile = !current.candidateProfile && loadedProfile;
  const mergedFiles =
    current.uploadedFiles.length > 0 ? current.uploadedFiles : loadedFiles;

  return {
    ...current,
    candidateProfile: shouldUseLoadedProfile ? loadedProfile : current.candidateProfile,
    uploadedFiles: mergedFiles,
    profileStatus:
      shouldUseLoadedProfile || current.candidateProfile
        ? "ready"
        : current.profileStatus,
    profileError: null,
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

        const loadedProfile = normalizeLoadedProfile(data.workspace?.profile ?? null);
        const loadedFiles = normalizeLoadedDocuments(data.workspace?.documents ?? []);

        if (cancelled) return;

        setState((current) => mergeLoadedWorkspace(current, loadedProfile, loadedFiles));
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
    []
  );

  const setCandidateProfile = useCallback(
    (profile: WorkspaceCandidateProfile | null) => {
      setState((current) => ({
        ...current,
        candidateProfile: profile,
        profileStatus: profile ? "ready" : "idle",
        profileError: null,

        jobProfile: profile ? current.jobProfile : null,
        insights: profile ? current.insights : null,
        finalDrafts: profile ? current.finalDrafts : null,

        jobStatus: profile ? current.jobStatus : "idle",
        finalStatus: profile ? current.finalStatus : "idle",

        jobError: profile ? current.jobError : null,
        finalError: profile ? current.finalError : null,
      }));
    },
    []
  );

  const setJobProfile = useCallback((job: WorkspaceJobProfile | null) => {
    setState((current) => ({
      ...current,
      jobProfile: job,
      jobStatus: job ? "ready" : "idle",
      jobError: null,

      insights: null,
      finalDrafts: null,
      finalStatus: "idle",
      finalError: null,
    }));
  }, []);

  const setInsights = useCallback((insights: WorkspaceInsights | null) => {
    setState((current) => ({
      ...current,
      insights,
    }));
  }, []);

  const setFinalDrafts = useCallback((drafts: WorkspaceFinalDrafts | null) => {
    setState((current) => ({
      ...current,
      finalDrafts: drafts,
      finalStatus: drafts ? "ready" : "idle",
      finalError: null,
    }));
  }, []);

  const setProfileStatus = useCallback(
    (status: WorkspaceState["profileStatus"]) => {
      setState((current) => ({
        ...current,
        profileStatus: status,
      }));
    },
    []
  );

  const setJobStatus = useCallback((status: WorkspaceState["jobStatus"]) => {
    setState((current) => ({
      ...current,
      jobStatus: status,
    }));
  }, []);

  const setFinalStatus = useCallback(
    (status: WorkspaceState["finalStatus"]) => {
      setState((current) => ({
        ...current,
        finalStatus: status,
      }));
    },
    []
  );

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

  const setFinalError = useCallback((message: string | null) => {
    setState((current) => ({
      ...current,
      finalError: message,
      finalStatus: message ? "error" : current.finalStatus,
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
      setUploadedFiles,
      setJobInput,
      setCandidateProfile,
      setJobProfile,
      setInsights,
      setFinalDrafts,
      setProfileStatus,
      setJobStatus,
      setFinalStatus,
      setProfileError,
      setJobError,
      setFinalError,
      getStepHref,
      resetWorkspace,
    }),
    [
      state,
      progress,
      setUploadedFiles,
      setJobInput,
      setCandidateProfile,
      setJobProfile,
      setInsights,
      setFinalDrafts,
      setProfileStatus,
      setJobStatus,
      setFinalStatus,
      setProfileError,
      setJobError,
      setFinalError,
      getStepHref,
      resetWorkspace,
    ]
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