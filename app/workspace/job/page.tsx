"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import AppCard from "@/components/ui/AppCard";
import SectionLabel from "@/components/ui/SectionLabel";
import { useWorkspace } from "@/components/workspace/WorkspaceProvider";
import EnrichmentHint from "@/components/workspace/EnrichmentHint";
import { useBehaviouralField } from "@/lib/workspace/useBehaviouralField";
import { designTokens } from "@/lib/design/tokens";
import type { FieldMetrics } from "@/lib/workspace/behaviouralTelemetry";
import type {
  WorkspaceFinalDrafts,
  WorkspaceInsights,
  WorkspaceJobProfile,
  WorkspaceRunOutcome,
  WorkspaceRunTelemetry,
} from "@/lib/workspace/types";

const t = designTokens;

type TailoringSuccessResponse = {
  ok?: boolean;
  runId?: string;
  jobProfile?: WorkspaceJobProfile;
  structuredJob?: Record<string, unknown>;
  insights?: WorkspaceInsights;
  finalDrafts?: WorkspaceFinalDrafts;
  telemetry?: WorkspaceRunTelemetry | null;
  message?: string;
  warnings?: string[];
  error?: string;
};

type TailoringErrorResponse = {
  message?: string;
  error?: string;
  warnings?: string[];
};

function normalizeInputType(jobUrl: string, jobText: string) {
  if (jobUrl.trim() && jobText.trim()) return "url_and_pasted_text" as const;
  if (jobUrl.trim()) return "url_only" as const;
  if (jobText.trim()) return "pasted_text_only" as const;
  return "unknown" as const;
}

function toDisplayStatus(
  value: "idle" | "loading" | "ready" | "error",
): string {
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

export default function WorkspaceJobPage() {
  const router = useRouter();
  const {
    state,
    progress,
    setJobInput,
    setJobProfile,
    setInsights,
    setFinalDrafts,
    setJobStatus,
    setInsightsStatus,
    setJobError,
    setInsightsError,
    setFinalStatus,
    setFinalError,
    startTelemetryRun,
    updateTelemetryStage,
    addTelemetryWarning,
    addTelemetryError,
    addDegradedReason,
    finalizeTelemetryRun,
  } = useWorkspace();

  const [jobText, setJobText] = useState(state.jobText || "");
  const [jobUrl, setJobUrl] = useState(state.jobUrl || "");
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [urlFetchState, setUrlFetchState] = useState<
    | { status: "idle" }
    | { status: "fetching" }
    | { status: "done"; domain: string }
    | { status: "error"; message: string }
  >({ status: "idle" });
  const [jobSections, setJobSections] = useState<{
    aufgaben: string[];
    profil: string[];
  } | null>(null);
  const [emptyBinsAfterFetch, setEmptyBinsAfterFetch] = useState(false);

  // Behavioural enrichment hint for the job description field
  const [jdHint, setJdHint] = useState<string | null>(null);
  const [jdHintLoading, setJdHintLoading] = useState(false);

  const handleJdStuck = useCallback(
    async (metrics: FieldMetrics) => {
      setJdHintLoading(true);
      setJdHint(null);
      try {
        const res = await fetch("/api/workspace/enrich-hint", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fieldId: "job-description",
            page: "job",
            currentLength: metrics.currentLength,
            charsTyped: metrics.charsTyped,
            focusDurationMs:
              metrics.totalFocusDurationMs + metrics.currentFocusDurationMs,
            hasExistingProfile: Boolean(state.candidateProfile),
            profileSummary: null,
          }),
        });
        const data = (await res.json()) as { ok: boolean; hint: string | null };
        setJdHint(data.hint ?? null);
      } catch {
        setJdHint(null);
      } finally {
        setJdHintLoading(false);
      }
    },
    [state.candidateProfile],
  );

  const jdField = useBehaviouralField(
    "job-description",
    "job",
    jobText.length,
    handleJdStuck,
  );

  async function handleFetchFromUrl() {
    const trimmedUrl = jobUrl.trim();
    if (!trimmedUrl) return;

    setUrlFetchState({ status: "fetching" });
    setJobSections(null);
    setEmptyBinsAfterFetch(false);
    try {
      const res = await fetch("/api/extract-job", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmedUrl, outputLanguage: "en" }),
      });
      const data = (await res.json()) as {
        extractedText?: string;
        structuredJob?: {
          aufgaben?: string[];
          anforderungsprofil?: {
            muss?: string[];
            soll?: string[];
            kann?: string[];
          };
        };
        error?: string;
        warnings?: string[];
      };
      if (!res.ok || !data.extractedText) {
        setUrlFetchState({
          status: "error",
          message:
            data.error ??
            "The page couldn't be fetched. Try pasting the job description text directly.",
        });
        return;
      }
      if (data.structuredJob) {
        const aufgaben = data.structuredJob.aufgaben ?? [];
        const profil = [
          ...(data.structuredJob.anforderungsprofil?.muss ?? []),
          ...(data.structuredJob.anforderungsprofil?.soll ?? []),
          ...(data.structuredJob.anforderungsprofil?.kann ?? []),
        ];
        if (aufgaben.length > 0 || profil.length > 0) {
          // Structured sections found — store clean text for pipeline and show bullets
          setJobText(data.extractedText);
          setJobSections({ aufgaben, profil });
        } else {
          // Extraction succeeded but AI found no identifiable sections — ask user to paste manually
          setEmptyBinsAfterFetch(true);
        }
      } else {
        // No structuredJob at all — fall through to manual paste
        setEmptyBinsAfterFetch(true);
      }
      const domain = (() => {
        try {
          return new URL(trimmedUrl).hostname.replace(/^www\./, "");
        } catch {
          return trimmedUrl;
        }
      })();
      setUrlFetchState({ status: "done", domain });
    } catch {
      setUrlFetchState({
        status: "error",
        message:
          "Fetch failed. Check your connection, or paste the job description directly.",
      });
    }
  }

  useEffect(() => {
    setJobInput({
      jobUrl,
      jobText,
    });
  }, [jobText, jobUrl, setJobInput]);

  const inputType = useMemo(
    () => normalizeInputType(jobUrl, jobText),
    [jobText, jobUrl],
  );

  async function runTailoring() {
    if (!state.candidateProfile) {
      setJobError("Complete the Profile step before running job analysis.");
      setJobStatus("error");
      return;
    }

    if (!jobText.trim() && !jobUrl.trim()) {
      setJobError("Please paste a job description or add a job URL.");
      setJobStatus("error");
      return;
    }

    setLoading(true);
    setSuccessMessage("");

    setJobError(null);
    setInsightsError(null);
    setFinalError(null);

    setJobStatus("loading");
    setInsightsStatus("loading");
    setFinalStatus("loading");

    setInsights(null);
    setFinalDrafts(null);

    const provisionalRunId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `run_${Date.now()}`;

    startTelemetryRun({
      runId: provisionalRunId,
      language: "en",
      inputType,
    });

    updateTelemetryStage("jobExtraction", { status: "processing" });
    updateTelemetryStage("requiredProfile", { status: "processing" });
    updateTelemetryStage("companyContext", { status: "processing" });
    updateTelemetryStage("companyResearch", { status: "processing" });
    updateTelemetryStage("marketSignals", { status: "processing" });
    updateTelemetryStage("selectedEvidence", { status: "processing" });
    updateTelemetryStage("positioningBrief", { status: "processing" });
    updateTelemetryStage("recommendation", { status: "processing" });
    updateTelemetryStage("generation", { status: "processing" });

    try {
      const payload: Record<string, unknown> = {
        jobDescriptionText: jobText.trim() || undefined,
        jobUrl: jobUrl.trim() || undefined,
        outputLanguage: "en",
      };

      if (state.candidateProfile?.rawResponse) {
        payload.candidateProfile = state.candidateProfile.rawResponse;
      } else {
        payload.candidateProfile = state.candidateProfile;
      }

      console.log("[runTailoring] sending payload:", {
        hasJobDescriptionText: Boolean(payload.jobDescriptionText),
        jobDescriptionTextLength: typeof payload.jobDescriptionText === "string" ? payload.jobDescriptionText.length : 0,
        hasJobUrl: Boolean(payload.jobUrl),
        outputLanguage: payload.outputLanguage,
        hasCandidateProfile: Boolean(payload.candidateProfile),
      });

      const response = await fetch("/api/tailoring", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as unknown as
        | TailoringSuccessResponse
        | TailoringErrorResponse;

      console.log("[runTailoring] response:", {
        status: response.status,
        ok: response.ok,
        hasInsights: "insights" in data && Boolean((data as TailoringSuccessResponse).insights),
        hasFinalDrafts: "finalDrafts" in data && Boolean((data as TailoringSuccessResponse).finalDrafts),
        hasJobProfile: "jobProfile" in data && Boolean((data as TailoringSuccessResponse).jobProfile),
        message: "message" in data ? (data as TailoringErrorResponse).message : undefined,
        error: "error" in data ? (data as TailoringErrorResponse).error : undefined,
      });

      if (!response.ok) {
        const message =
          ("message" in data && data.message) ||
          ("error" in data && data.error) ||
          "Something went wrong. Please try again.";

        updateTelemetryStage("jobExtraction", {
          status: "error",
          error: message,
        });
        updateTelemetryStage("requiredProfile", {
          status: "error",
          error: message,
        });
        updateTelemetryStage("companyContext", {
          status: "error",
          error: message,
        });
        updateTelemetryStage("companyResearch", {
          status: "error",
          error: message,
        });
        updateTelemetryStage("marketSignals", {
          status: "error",
          error: message,
        });
        updateTelemetryStage("selectedEvidence", {
          status: "error",
          error: message,
        });
        updateTelemetryStage("positioningBrief", {
          status: "error",
          error: message,
        });
        updateTelemetryStage("recommendation", {
          status: "error",
          error: message,
        });
        updateTelemetryStage("generation", {
          status: "error",
          error: message,
        });
        addTelemetryError(message);
        throw new Error(message);
      }

      const successData = data as TailoringSuccessResponse;

    

      for (const warning of successData.warnings ?? []) {
        addTelemetryWarning(warning);
      }

      const nextJobProfile: WorkspaceJobProfile =
        successData.jobProfile ||
        (successData.structuredJob
          ? ({
              ...(successData.structuredJob as WorkspaceJobProfile),
              extractedText: jobText.trim() || undefined,
              normalizedUrl: jobUrl.trim() || undefined,
              outputLanguage: "en",
            } satisfies WorkspaceJobProfile)
          : {
              extractedText: jobText.trim() || undefined,
              normalizedUrl: jobUrl.trim() || undefined,
              outputLanguage: "en",
            });

      setJobProfile(nextJobProfile);
      setJobStatus("ready");
      updateTelemetryStage("jobExtraction", { status: "success" });

      if (successData.insights) {
        setInsights(successData.insights);
        setInsightsStatus("ready");

        const hasWarnings =
          (successData.insights.riskAreas?.length ?? 0) > 0 ||
          (successData.insights.blockers?.length ?? 0) > 0 ||
          (successData.insights.missingSignals?.length ?? 0) > 0;

        const insightStageStatus = hasWarnings ? "partial" : "success";

        updateTelemetryStage("requiredProfile", { status: insightStageStatus });
        updateTelemetryStage("companyContext", { status: insightStageStatus });
        updateTelemetryStage("companyResearch", { status: insightStageStatus });
        updateTelemetryStage("marketSignals", { status: insightStageStatus });
        updateTelemetryStage("selectedEvidence", { status: insightStageStatus });
        updateTelemetryStage("positioningBrief", { status: insightStageStatus });
        updateTelemetryStage("recommendation", { status: insightStageStatus });

        for (const item of successData.insights.riskAreas ?? []) {
          addTelemetryWarning(item);
        }
        for (const item of successData.insights.missingSignals ?? []) {
          addTelemetryWarning(item);
        }
        for (const item of successData.insights.blockers ?? []) {
          addDegradedReason(item);
        }
      } else {
        setInsights(null);
        setInsightsStatus("idle");

        updateTelemetryStage("requiredProfile", { status: "partial" });
        updateTelemetryStage("companyContext", { status: "partial" });
        updateTelemetryStage("companyResearch", { status: "partial" });
        updateTelemetryStage("marketSignals", { status: "partial" });
        updateTelemetryStage("selectedEvidence", { status: "partial" });
        updateTelemetryStage("positioningBrief", { status: "partial" });
        updateTelemetryStage("recommendation", { status: "partial" });
      }

      if (successData.finalDrafts) {
        setFinalDrafts(successData.finalDrafts);
        setFinalStatus("ready");
        updateTelemetryStage("generation", {
          status:
            successData.finalDrafts.warnings?.length ||
            successData.insights?.blockers?.length
              ? "partial"
              : "success",
        });

        for (const item of successData.finalDrafts.warnings ?? []) {
          addTelemetryWarning(item);
        }
      } else {
        setFinalDrafts(null);
        setFinalStatus("idle");
        updateTelemetryStage("generation", { status: "partial" });
      }

      setJobError(null);
      setInsightsError(null);
      setFinalError(null);

      setSuccessMessage("Job analysis completed. Moving to insights...");

      finalizeTelemetryRun({
        outcome:
          (successData.telemetry?.outcome as WorkspaceRunOutcome | undefined) ??
          "completed",
      });

      router.push("/workspace/insights");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Something went wrong.";

      setJobStatus("error");
      setInsightsStatus("error");
      setFinalStatus("error");

      setJobError(message);
      setInsightsError(message);
      setFinalError(message);

      addTelemetryError(message);
      finalizeTelemetryRun({
        outcome: "failed",
      });
    } finally {
      setLoading(false);
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
        <SectionLabel tone="blue">Job</SectionLabel>

        <h1
          style={{
            margin: "14px 0 0",
            fontSize: 32,
            lineHeight: 1.15,
            letterSpacing: "-0.03em",
            color: t.colors.textPrimary,
          }}
        >
          Add the target role
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
          Paste the job description or add the job URL. The system will run the
          locked pipeline and populate Insights and Final from workspace state.
        </p>
      </AppCard>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.15fr) minmax(320px, 0.85fr)",
          gap: 20,
          alignItems: "start",
        }}
      >
        <div style={{ display: "grid", gap: 20 }}>
          <AppCard className="p-6">
            <h2 style={titleStyle}>Job URL</h2>
            <p style={copyStyle}>
              Paste the job posting URL and fetch the content directly into the description field below.
            </p>

            <input
              type="url"
              value={jobUrl}
              onChange={(e) => {
                setJobUrl(e.target.value);
                setUrlFetchState({ status: "idle" });
                setJobSections(null);
                setEmptyBinsAfterFetch(false);
              }}
              placeholder="Paste job URL here..."
              style={{
                ...inputStyle,
                marginTop: 14,
              }}
            />

            {jobUrl.trim() && (
              <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 10 }}>
                <button
                  type="button"
                  onClick={() => void handleFetchFromUrl()}
                  disabled={urlFetchState.status === "fetching"}
                  style={{
                    height: 36,
                    padding: "0 14px",
                    borderRadius: t.radius.sm,
                    border: `1px solid ${t.colors.border}`,
                    background: t.colors.surface,
                    color: t.colors.textPrimary,
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: urlFetchState.status === "fetching" ? "not-allowed" : "pointer",
                    opacity: urlFetchState.status === "fetching" ? 0.6 : 1,
                    flexShrink: 0,
                  }}
                >
                  {urlFetchState.status === "fetching" ? "Fetching..." : "Fetch content"}
                </button>
                {urlFetchState.status === "done" && (
                  <span style={{ fontSize: 13, color: t.colors.textSecondary }}>
                    Fetched from <strong>{urlFetchState.domain}</strong>
                  </span>
                )}
                {urlFetchState.status === "error" && (
                  <span style={{ fontSize: 13, color: t.colors.textPrimary }}>
                    {urlFetchState.message}
                  </span>
                )}
              </div>
            )}
          </AppCard>

          {jobSections ? (
            <AppCard className="p-6">
              <JobSection heading="Ihre Aufgaben" bullets={jobSections.aufgaben} />
              {jobSections.profil.length > 0 && (
                <div style={{ marginTop: 28 }}>
                  <JobSection heading="Ihr Profil" bullets={jobSections.profil} />
                </div>
              )}
            </AppCard>
          ) : emptyBinsAfterFetch ? (
            <AppCard className="p-6">
              <h2 style={titleStyle}>Job description</h2>
              <p style={copyStyle}>
                We could not identify structured sections from this posting. Please paste the job description manually below.
              </p>

              <textarea
                value={jobText}
                onChange={(e) => {
                  setJobText(e.target.value);
                  jdField.fieldProps.onChange(e.target.value);
                }}
                onFocus={jdField.fieldProps.onFocus}
                onBlur={jdField.fieldProps.onBlur}
                onKeyDown={jdField.fieldProps.onKeyDown}
                placeholder="Paste job description here..."
                style={{
                  ...textareaStyle,
                  minHeight: 320,
                  marginTop: 14,
                }}
              />
              <EnrichmentHint
                behaviouralState={jdField.behaviouralState}
                hint={jdHint}
                loading={jdHintLoading}
                onDismiss={() => setJdHint(null)}
              />
            </AppCard>
          ) : (
            <AppCard className="p-6">
              <h2 style={titleStyle}>Job description</h2>
              <p style={copyStyle}>
                Paste the role description, responsibilities, and requirements.
              </p>

              <textarea
                value={jobText}
                onChange={(e) => {
                  setJobText(e.target.value);
                  jdField.fieldProps.onChange(e.target.value);
                }}
                onFocus={jdField.fieldProps.onFocus}
                onBlur={jdField.fieldProps.onBlur}
                onKeyDown={jdField.fieldProps.onKeyDown}
                placeholder="Paste job description here..."
                style={{
                  ...textareaStyle,
                  minHeight: 320,
                  marginTop: 14,
                }}
              />
              <EnrichmentHint
                behaviouralState={jdField.behaviouralState}
                hint={jdHint}
                loading={jdHintLoading}
                onDismiss={() => setJdHint(null)}
              />
            </AppCard>
          )}
        </div>

        <div style={{ display: "grid", gap: 20 }}>
          <AppCard className="p-6">
            <h2 style={titleStyle}>Analysis status</h2>

            <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
              <StatusLine
                label="Profile ready"
                value={state.candidateProfile ? "Yes" : "No"}
              />
              <StatusLine
                label="Job URL"
                value={jobUrl.trim() ? "Added" : "Not added"}
              />
              <StatusLine
                label="Job description"
                value={jobText.trim() ? "Added" : "Not added"}
              />
              <StatusLine
                label="Job status"
                value={toDisplayStatus(state.jobStatus)}
              />
              <StatusLine
                label="Insights status"
                value={toDisplayStatus(state.insightsStatus)}
              />
              <StatusLine
                label="Final status"
                value={toDisplayStatus(state.finalStatus)}
              />
              <StatusLine
                label="Next step"
                value={progress.nextStep === "job" ? "Job" : progress.nextStep}
              />
            </div>

            {state.jobError ? (
              <div style={errorBoxStyle}>{state.jobError}</div>
            ) : null}

            {successMessage ? (
              <div style={successBoxStyle}>{successMessage}</div>
            ) : null}

            <button
              type="button"
              onClick={runTailoring}
              disabled={loading}
              style={{
                ...primaryButtonStyle,
                width: "100%",
                marginTop: 16,
                opacity: loading ? 0.8 : 1,
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "Running analysis..." : "Run analysis"}
            </button>
          </AppCard>

          <AppCard className="p-6" soft>
            <h2 style={titleStyle}>What happens next</h2>

            <ul
              style={{
                margin: "14px 0 0",
                paddingLeft: 18,
                color: t.colors.textSecondary,
                fontSize: 14,
                lineHeight: 1.8,
              }}
            >
              <li>The locked tailoring pipeline analyzes the role.</li>
              <li>Job data and insights are written into workspace state.</li>
              <li>Final drafts populate the Final page when generation succeeds.</li>
            </ul>
          </AppCard>
        </div>
      </div>
    </div>
  );
}

function JobSection({ heading, bullets }: { heading: string; bullets: string[] }) {
  return (
    <div>
      <h2 style={titleStyle}>{heading}</h2>
      <ul
        style={{
          margin: "14px 0 0",
          paddingLeft: 18,
          color: t.colors.textPrimary,
          fontSize: 14,
          lineHeight: 1.8,
          listStyleType: "disc",
        }}
      >
        {bullets.map((bullet, i) => (
          <li key={i}>{bullet}</li>
        ))}
      </ul>
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

const titleStyle: CSSProperties = {
  margin: 0,
  fontSize: 20,
  fontWeight: 800,
  color: t.colors.textPrimary,
};

const copyStyle: CSSProperties = {
  margin: "8px 0 0",
  fontSize: 14,
  lineHeight: 1.7,
  color: t.colors.textSecondary,
};

const inputStyle: CSSProperties = {
  width: "100%",
  height: 46,
  borderRadius: t.radius.md,
  border: `1px solid ${t.colors.border}`,
  background: t.colors.surface,
  color: t.colors.textPrimary,
  padding: "0 14px",
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

const successBoxStyle: CSSProperties = {
  marginTop: 14,
  padding: 12,
  borderRadius: t.radius.md,
  border: `1px solid ${t.colors.border}`,
  background: t.colors.surface,
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