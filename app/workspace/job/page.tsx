"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import FeedbackStars from "@/components/feedback/FeedbackStars";
import { useWorkspace } from "@/components/workspace/WorkspaceProvider";
import type {
  WorkspaceCandidateProfile,
  WorkspaceInsights,
  WorkspaceJobProfile,
} from "@/lib/workspace/types";

type TailoringExtractResponse = {
  structuredJob: {
    companyName: string;
    jobTitle: string;
    location: string;
    responsibilities: string[];
    requirements: string[];
    summary: string;
  };
  extractedText: string;
  source:
    | "pasted-text"
    | "direct"
    | "readable-fallback"
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

type GenerateCvResponse = {
  ok?: boolean;
  cvDraft?: string;
  result?: string;
  error?: string;
};

type GenerateCoverLetterResponse = {
  ok?: boolean;
  coverLetterDraft?: string;
  result?: string;
  error?: string;
};

type PersistTailoringRunPayload = {
  clientRunId: string;
  jobUrl?: string;
  jobDescriptionInput?: string;
  normalizedUrl?: string;
  outputLanguage?: string;
  structuredJobJson?: Record<string, unknown> | null;
  extractedText?: string;
  extractionSource?: string;
  warningsJson?: string[];
  companyContextJson?: Record<string, unknown> | null;
  marketSignalsJson?: Record<string, unknown> | null;
  companyResearchJson?: Record<string, unknown> | null;
  applicationRecommendationJson?: Record<string, unknown> | null;
  finalCvText?: string;
  finalCoverLetterText?: string;
  inputType?: string;
  runOutcome?: string;
  degradedReasonsJson?: string[];
  telemetryJson?: Record<string, unknown> | null;
  stageStatusesJson?: Record<string, unknown> | null;
  stageDurationsJson?: Record<string, unknown> | null;
  jobGeography?: string | null;
};

type LayerState = "idle" | "processing" | "ready" | "warning" | "error";

function Spinner() {
  return (
    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
  );
}

function createRunId(): string {
  return `run_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function buildCandidateSummary(profile: WorkspaceCandidateProfile | null): string {
  if (!profile) return "No candidate profile loaded yet.";

  const headline = profile.headline?.trim();
  const summary = profile.summary?.trim();

  if (headline && summary) {
    return `${headline} · ${summary}`;
  }

  return headline || summary || "Candidate profile loaded.";
}

function stringifyCompanyContext(companyContext: CompanyContext | null): string | null {
  if (!companyContext) return null;

  const parts = [
    companyContext.summary || "",
    companyContext.industry.length
      ? `Industry: ${companyContext.industry.join(", ")}`
      : "",
    companyContext.financeEnvironment.length
      ? `Finance environment: ${companyContext.financeEnvironment.join(", ")}`
      : "",
    companyContext.reportingEnvironment.length
      ? `Reporting environment: ${companyContext.reportingEnvironment.join(", ")}`
      : "",
    companyContext.leadershipScope.length
      ? `Leadership scope: ${companyContext.leadershipScope.join(", ")}`
      : "",
    companyContext.operatingSignals.length
      ? `Operating signals: ${companyContext.operatingSignals.join(", ")}`
      : "",
    companyContext.cultureSignals.length
      ? `Culture signals: ${companyContext.cultureSignals.join(", ")}`
      : "",
  ].filter(Boolean);

  return parts.join("\n\n") || null;
}

function getSourceLabel(source: string) {
  switch (source) {
    case "pasted-text":
      return "Pasted text";
    case "direct":
      return "Direct fetch";
    case "readable-fallback":
      return "Readable fallback";
    case "blocked-or-thin-content":
      return "Blocked / thin content";
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

function getRecommendationClasses(
  value:
    | "apply_confidently"
    | "apply_with_care"
    | "borderline"
    | "not_recommended"
) {
  switch (value) {
    case "apply_confidently":
      return "border-green-200 bg-green-50 text-green-700";
    case "apply_with_care":
      return "border-blue-200 bg-blue-50 text-blue-700";
    case "borderline":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "not_recommended":
      return "border-red-200 bg-red-50 text-red-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

function getLayerClasses(state: LayerState): string {
  switch (state) {
    case "ready":
      return "border-green-200 bg-green-50 text-green-700";
    case "warning":
      return "border-red-200 bg-red-50 text-red-700";
    case "error":
      return "border-red-200 bg-red-50 text-red-700";
    case "processing":
      return "border-amber-200 bg-amber-50 text-amber-700";
    default:
      return "border-blue-200 bg-blue-50 text-blue-700";
  }
}

function getLayerDotClasses(state: LayerState): string {
  switch (state) {
    case "ready":
      return "bg-green-500";
    case "warning":
      return "bg-red-500";
    case "error":
      return "bg-red-500";
    case "processing":
      return "bg-amber-500 animate-pulse";
    default:
      return "bg-blue-500";
  }
}

function OutputBlock({
  title,
  subtitle,
  children,
  defaultOpen = false,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details
      open={defaultOpen}
      className="rounded-3xl border border-slate-200 bg-white shadow-sm"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-5">
        <div>
          <div className="text-lg font-semibold text-slate-900">{title}</div>
          {subtitle ? (
            <div className="mt-1 text-sm text-slate-500">{subtitle}</div>
          ) : null}
        </div>
        <div className="text-sm text-slate-400">Open</div>
      </summary>
      <div className="border-t border-slate-100 px-6 py-6">{children}</div>
    </details>
  );
}

function ResultCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
      <div className="text-sm font-semibold text-slate-900">{title}</div>
      <div className="mt-3 text-sm leading-7 text-slate-600">{children}</div>
    </div>
  );
}

function getProgressLabel(layerStates: { label: string; state: LayerState }[], loading: boolean) {
  if (!loading) {
    const hasRecommendation = layerStates.some(
      (layer) => layer.label === "CP8" && layer.state === "ready"
    );

    if (hasRecommendation) {
      return "Analysis complete";
    }

    return "Ready to analyse";
  }

  const processingLayer = layerStates.find((layer) => layer.state === "processing");

  switch (processingLayer?.label) {
    case "CP1":
      return "Checking candidate profile";
    case "CP2":
      return "Extracting the role";
    case "CP3":
      return "Interpreting requirements";
    case "CP4":
      return "Assessing company context";
    case "CP5":
      return "Preparing company research";
    case "CP6":
      return "Reading market signals";
    case "CP7":
      return "Comparing profile to role";
    case "CP8":
      return "Finalising recommendation";
    default:
      return "Analysing role";
  }
}

function getProgressPercent(layerStates: { label: string; state: LayerState }[], loading: boolean) {
  const completed = layerStates.filter((layer) => layer.state === "ready").length;
  const processing = layerStates.some((layer) => layer.state === "processing") ? 0.5 : 0;
  const total = layerStates.length || 1;

  if (!loading && completed === 0) return 0;

  return Math.min(100, Math.round(((completed + processing) / total) * 100));
}

function inferInputType(jobUrl: string, jobText: string): "url_only" | "pasted_text_only" | "url_and_pasted_text" | "unknown" {
  const hasUrl = Boolean(jobUrl.trim());
  const hasText = Boolean(jobText.trim());

  if (hasUrl && hasText) return "url_and_pasted_text";
  if (hasUrl) return "url_only";
  if (hasText) return "pasted_text_only";
  return "unknown";
}

function safeObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function buildStageStatusMap(telemetry: unknown): Record<string, unknown> {
  const stages =
    telemetry &&
    typeof telemetry === "object" &&
    Array.isArray((telemetry as { stages?: unknown[] }).stages)
      ? (telemetry as { stages: Array<{ stage?: string; status?: string }> }).stages
      : [];

  return stages.reduce<Record<string, unknown>>((acc, item) => {
    if (item.stage) {
      acc[item.stage] = item.status ?? "pending";
    }
    return acc;
  }, {});
}

function buildStageDurationMap(telemetry: unknown): Record<string, unknown> {
  const stages =
    telemetry &&
    typeof telemetry === "object" &&
    Array.isArray((telemetry as { stages?: unknown[] }).stages)
      ? (telemetry as { stages: Array<{ stage?: string; durationMs?: number | null }> }).stages
      : [];

  return stages.reduce<Record<string, unknown>>((acc, item) => {
    if (item.stage) {
      acc[item.stage] = item.durationMs ?? null;
    }
    return acc;
  }, {});
}

export default function WorkspaceJobPage() {
  const router = useRouter();

  const {
    state,
    setJobInput,
    setJobProfile,
    setInsights,
    setJobStatus,
    setJobError,
    setFinalDrafts,
    setFinalStatus,
    setFinalError,
    startTelemetryRun,
    updateTelemetryStage,
    addTelemetryWarning,
    addTelemetryError,
    addDegradedReason,
    finalizeTelemetryRun,
  } = useWorkspace();

  const [jobUrl, setJobUrl] = useState(state.jobUrl || "");
  const [jobDescription, setJobDescription] = useState(state.jobText || "");
  const [language, setLanguage] = useState<"EN" | "DE">(
    state.jobProfile?.outputLanguage === "de" ? "DE" : "EN"
  );

  const [loading, setLoading] = useState(false);
  const [progressStep, setProgressStep] = useState("");

  const [structuredJob, setStructuredJob] = useState<WorkspaceJobProfile | null>(
    state.jobProfile
  );

  const [applicationRecommendation, setApplicationRecommendation] =
    useState<ApplicationRecommendationResponse | null>(
      state.insights?.applicationRecommendation
        ? {
            ok: true,
            applicationRecommendation: state.insights.applicationRecommendation,
            advisorMessage: state.insights.advisorMessage || "",
            reasoningSummary: state.insights.reasoningSummary || "",
            strongMatches: state.insights.strongMatches || [],
            stretchMatches: state.insights.stretchMatches || [],
            riskAreas: state.insights.riskAreas || [],
            blockers: state.insights.blockers || [],
            positioningStrategy: state.insights.positioningStrategy || "",
            requirementsAnalysis: state.insights.requirementsAnalysis || [],
            meta: {
              model: "workspace-state",
              locale: state.jobProfile?.outputLanguage === "de" ? "de" : "en",
            },
          }
        : null
    );

  const [companyContextText, setCompanyContextText] = useState<string | null>(
    typeof state.insights?.companyContext === "string"
      ? state.insights.companyContext
      : state.insights?.companyContext
        ? JSON.stringify(state.insights.companyContext, null, 2)
        : null
  );

  const [marketSignalsText, setMarketSignalsText] = useState<string | null>(null);
  const [companyResearchText, setCompanyResearchText] = useState<string | null>(null);
  const [currentRunId, setCurrentRunId] = useState<string>(
    state.finalDrafts?.runId || ""
  );

  const candidateProfile = state.candidateProfile;
  const inputDocuments = state.uploadedFiles;

  const canRun = useMemo(() => {
    return Boolean(jobUrl.trim() || jobDescription.trim());
  }, [jobUrl, jobDescription]);

  useEffect(() => {
    if (!loading) return;

    const messages = [
      "Extracting the role details...",
      "Structuring the vacancy...",
      "Assessing company context...",
      "Reading market signals...",
      "Preparing company research...",
      "Comparing profile to role...",
      "Generating final documents...",
    ];

    let index = 0;
    setProgressStep(messages[index]);

    const interval = setInterval(() => {
      index = (index + 1) % messages.length;
      setProgressStep(messages[index]);
    }, 1400);

    return () => clearInterval(interval);
  }, [loading]);

  async function persistTailoringRun(payload: PersistTailoringRunPayload) {
    await fetch("/api/tailoring-runs", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  }

  async function runJobStep() {
    setLoading(true);
    setJobError(null);
    setFinalError(null);
    setJobStatus("loading");
    setFinalStatus("loading");
    setStructuredJob(null);
    setApplicationRecommendation(null);
    setCompanyContextText(null);
    setMarketSignalsText(null);
    setCompanyResearchText(null);
    setFinalDrafts(null);

    const runId = createRunId();
    setCurrentRunId(runId);

    const outputLanguage: "de" | "en" = language === "DE" ? "de" : "en";
    const inputType = inferInputType(jobUrl, jobDescription);

    startTelemetryRun({
      runId,
      language: outputLanguage,
      inputType,
      jobGeography: null,
      userGeography: null,
    });

    updateTelemetryStage("profile", {
      status: candidateProfile ? "success" : "partial",
    });

    if (!candidateProfile) {
      addDegradedReason("candidate_profile_missing");
      addTelemetryWarning("Candidate profile missing at run start.");
    }

    let persistedStructuredJob: TailoringExtractResponse | null = null;
    let persistedCompanyContext: CompanyContext | null = null;
    let persistedMarketSignals: Record<string, unknown> | null = null;
    let persistedCompanyResearch: Record<string, unknown> | null = null;
    let persistedRecommendation: ApplicationRecommendationResponse | null = null;
    let persistedFinalCv = "";
    let persistedFinalCoverLetter = "";

    try {
      setJobInput({
        jobUrl: jobUrl.trim(),
        jobText: jobDescription.trim(),
      });

      updateTelemetryStage("jobExtraction", { status: "processing" });

      const response = await fetch("/api/extract-job", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: jobUrl.trim() || undefined,
          jobDescriptionText: jobDescription.trim() || undefined,
          outputLanguage,
        }),
      });

      const data = (await response.json()) as TailoringExtractResponse;
      persistedStructuredJob = data;

      if (!response.ok) {
        updateTelemetryStage("jobExtraction", {
          status: "error",
          error: data.error || "Job extraction failed.",
        });
        addTelemetryError(data.error || "Job analysis failed.");
        setJobError(data.error || "Job analysis failed.");
        setJobStatus("error");
        setFinalStatus("idle");
        finalizeTelemetryRun({ outcome: "failed" });

        await persistTailoringRun({
          clientRunId: runId,
          jobUrl: jobUrl.trim(),
          jobDescriptionInput: jobDescription.trim(),
          outputLanguage,
          inputType,
          runOutcome: "failed",
          degradedReasonsJson: state.telemetry?.degradedReasons || ["job_extraction_failed"],
          telemetryJson: safeObject(state.telemetry),
          stageStatusesJson: buildStageStatusMap(state.telemetry),
          stageDurationsJson: buildStageDurationMap(state.telemetry),
          warningsJson: data.warnings || [],
        });

        return;
      }

      const normalizedJobProfile: WorkspaceJobProfile = {
        companyName: data.structuredJob.companyName || "",
        jobTitle: data.structuredJob.jobTitle || "",
        location: data.structuredJob.location || "",
        responsibilities: data.structuredJob.responsibilities || [],
        requirements: data.structuredJob.requirements || [],
        summary: data.structuredJob.summary || "",
        extractedText: data.extractedText || "",
        extractionSource:
          data.source === "direct"
            ? "direct-fetch"
            : data.source || "pasted-text",
        normalizedUrl: data.normalizedUrl || "",
        warnings: data.warnings || [],
        outputLanguage,
        rawResponse: data,
      };

      if (normalizedJobProfile.warnings?.length) {
        normalizedJobProfile.warnings.forEach((warning) => addTelemetryWarning(warning));
      }

      if (data.source === "blocked-or-thin-content") {
        addDegradedReason("weak_url_extraction");
        updateTelemetryStage("jobExtraction", {
          status: "partial",
          warning: "Blocked or thin content; fallback extraction used.",
        });
      } else {
        updateTelemetryStage("jobExtraction", { status: "success" });
      }

      updateTelemetryStage("requiredProfile", { status: "success" });

      setStructuredJob(normalizedJobProfile);
      setJobProfile(normalizedJobProfile);

      if (data.extractedText) {
        setJobDescription(data.extractedText);
        setJobInput({
          jobUrl: jobUrl.trim(),
          jobText: data.extractedText,
        });
      }

      let resolvedCompanyContext: CompanyContext | null = null;

      updateTelemetryStage("companyContext", { status: "processing" });

      try {
        const companyContextResponse = await fetch("/api/company-context", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            locale: outputLanguage,
            structuredJob: data.structuredJob,
            extractedText: data.extractedText || "",
          }),
        });

        const companyContextData =
          (await companyContextResponse.json()) as CompanyContextResponse;

        if (companyContextResponse.ok && companyContextData.ok) {
          resolvedCompanyContext = companyContextData.companyContext;
          persistedCompanyContext = resolvedCompanyContext;
          setCompanyContextText(stringifyCompanyContext(resolvedCompanyContext));
          updateTelemetryStage("companyContext", { status: "success" });
        } else {
          addDegradedReason("company_context_unavailable");
          updateTelemetryStage("companyContext", {
            status: "unavailable",
            warning:
              !companyContextData.ok
                ? companyContextData.error
                : "Company context failed.",
          });
          setCompanyContextText(
            JSON.stringify(
              {
                error:
                  !companyContextData.ok
                    ? companyContextData.error
                    : "Company context failed.",
              },
              null,
              2
            )
          );
        }
      } catch {
        addDegradedReason("company_context_unavailable");
        updateTelemetryStage("companyContext", {
          status: "unavailable",
          warning: "Company context request failed.",
        });
        setCompanyContextText(
          JSON.stringify(
            {
              error: "Company context request failed.",
            },
            null,
            2
          )
        );
      }

      let resolvedMarketSignals: Record<string, unknown> | null = null;

      updateTelemetryStage("marketSignals", { status: "processing" });

      try {
        const marketSignalsResponse = await fetch("/api/market-signals", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            locale: outputLanguage,
            structuredJob: data.structuredJob,
            extractedText: data.extractedText || "",
            companyContextSummary: resolvedCompanyContext?.summary || "",
          }),
        });

        const marketSignalsData = await marketSignalsResponse.json();

        if (marketSignalsResponse.ok && marketSignalsData?.ok) {
          resolvedMarketSignals = marketSignalsData.marketSignals || null;
          persistedMarketSignals = resolvedMarketSignals;
          setMarketSignalsText(
            JSON.stringify(marketSignalsData.marketSignals, null, 2)
          );
          updateTelemetryStage("marketSignals", { status: "success" });
        } else {
          addDegradedReason("market_signals_unavailable");
          updateTelemetryStage("marketSignals", {
            status: "unavailable",
            warning: marketSignalsData?.error || "Market signals failed.",
          });
          setMarketSignalsText(
            JSON.stringify(
              {
                error: marketSignalsData?.error || "Market signals failed.",
              },
              null,
              2
            )
          );
        }
      } catch {
        addDegradedReason("market_signals_unavailable");
        updateTelemetryStage("marketSignals", {
          status: "unavailable",
          warning: "Market signals request failed.",
        });
        setMarketSignalsText(
          JSON.stringify(
            {
              error: "Market signals request failed.",
            },
            null,
            2
          )
        );
      }

      let resolvedCompanyResearch: Record<string, unknown> | null = null;

      updateTelemetryStage("companyResearch", { status: "processing" });

      try {
        const companyResearchResponse = await fetch("/api/company-research", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            locale: outputLanguage,
            companyName: data.structuredJob.companyName || "",
            jobTitle: data.structuredJob.jobTitle || "",
            searchNotes: data.extractedText || "",
          }),
        });

        const companyResearchData = await companyResearchResponse.json();

        if (companyResearchResponse.ok && companyResearchData?.ok) {
          resolvedCompanyResearch = companyResearchData.companyResearch || null;
          persistedCompanyResearch = resolvedCompanyResearch;
          setCompanyResearchText(
            JSON.stringify(companyResearchData.companyResearch, null, 2)
          );
          updateTelemetryStage("companyResearch", { status: "success" });
        } else {
          addDegradedReason("company_research_unavailable");
          updateTelemetryStage("companyResearch", {
            status: "unavailable",
            warning: companyResearchData?.error || "Company research failed.",
          });
          setCompanyResearchText(
            JSON.stringify(
              {
                error: companyResearchData?.error || "Company research failed.",
              },
              null,
              2
            )
          );
        }
      } catch {
        addDegradedReason("company_research_unavailable");
        updateTelemetryStage("companyResearch", {
          status: "unavailable",
          warning: "Company research request failed.",
        });
        setCompanyResearchText(
          JSON.stringify(
            {
              error: "Company research request failed.",
            },
            null,
            2
          )
        );
      }

      let recommendationData: ApplicationRecommendationResponse | null = null;

      updateTelemetryStage("recommendation", { status: "processing" });

      if (candidateProfile) {
        const recommendationResponse = await fetch(
          "/api/tailoring/application-recommendation",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              locale: outputLanguage,
              targetLanguage: outputLanguage,
              candidateProfile,
              structuredJob: data.structuredJob,
              companyContext: resolvedCompanyContext,
              marketSignals: resolvedMarketSignals,
              companyResearch: resolvedCompanyResearch,
              extractedText: data.extractedText || "",
            }),
          }
        );

        recommendationData =
          (await recommendationResponse.json()) as ApplicationRecommendationResponse;

        persistedRecommendation = recommendationData;
        setApplicationRecommendation(recommendationData);

        if (recommendationResponse.ok && recommendationData.ok) {
          updateTelemetryStage("recommendation", { status: "success" });
        } else {
          addDegradedReason("recommendation_partial");
          updateTelemetryStage("recommendation", {
            status: "partial",
            warning:
              !recommendationData.ok
                ? recommendationData.error
                : "Recommendation incomplete.",
          });
        }
      } else {
        addDegradedReason("candidate_profile_missing");
        updateTelemetryStage("recommendation", {
          status: "partial",
          warning: "Candidate profile missing; recommendation skipped.",
        });
      }

      const normalizedInsights: WorkspaceInsights = {
        selectedEvidence:
          recommendationData && recommendationData.ok
            ? recommendationData.strongMatches || []
            : [],
        positioningBrief:
          recommendationData && recommendationData.ok
            ? recommendationData.positioningStrategy || ""
            : "",
        positioningStrategy:
          recommendationData && recommendationData.ok
            ? recommendationData.positioningStrategy || ""
            : "",
        missingSignals:
          recommendationData && recommendationData.ok
            ? [
                ...(recommendationData.riskAreas || []),
                ...(recommendationData.blockers || []),
              ]
            : [],
        companyContext: stringifyCompanyContext(resolvedCompanyContext),
        applicationRecommendation:
          recommendationData && recommendationData.ok
            ? recommendationData.applicationRecommendation
            : undefined,
        advisorMessage:
          recommendationData && recommendationData.ok
            ? recommendationData.advisorMessage || ""
            : "",
        reasoningSummary:
          recommendationData && recommendationData.ok
            ? recommendationData.reasoningSummary || ""
            : "",
        strongMatches:
          recommendationData && recommendationData.ok
            ? recommendationData.strongMatches || []
            : [],
        stretchMatches:
          recommendationData && recommendationData.ok
            ? recommendationData.stretchMatches || []
            : [],
        riskAreas:
          recommendationData && recommendationData.ok
            ? recommendationData.riskAreas || []
            : [],
        blockers:
          recommendationData && recommendationData.ok
            ? recommendationData.blockers || []
            : [],
        requirementsAnalysis:
          recommendationData && recommendationData.ok
            ? recommendationData.requirementsAnalysis || []
            : [],
        rawResponse: {
          recommendation: recommendationData,
          companyContext: resolvedCompanyContext,
          marketSignals: resolvedMarketSignals,
          companyResearch: resolvedCompanyResearch,
          runId,
        },
      };

      setInsights(normalizedInsights);
      setJobStatus("ready");
      setJobError(null);

      updateTelemetryStage("generation", { status: "processing" });

      if (!candidateProfile) {
        addDegradedReason("candidate_profile_missing");
        updateTelemetryStage("generation", {
          status: "partial",
          warning: "Candidate profile missing. Generation not completed.",
        });
        setFinalError("Candidate profile is missing. Please rebuild the profile first.");
        setFinalStatus("error");

        finalizeTelemetryRun({ outcome: "completed_with_limitations" });

        await persistTailoringRun({
          clientRunId: runId,
          jobUrl: jobUrl.trim(),
          jobDescriptionInput: jobDescription.trim(),
          normalizedUrl: data.normalizedUrl || "",
          outputLanguage,
          structuredJobJson: safeObject(data.structuredJob),
          extractedText: data.extractedText || "",
          extractionSource: data.source || "pasted-text",
          warningsJson: data.warnings || [],
          companyContextJson: safeObject(resolvedCompanyContext),
          marketSignalsJson: resolvedMarketSignals,
          companyResearchJson: resolvedCompanyResearch,
          applicationRecommendationJson: safeObject(recommendationData),
          inputType,
          runOutcome: "completed_with_limitations",
          degradedReasonsJson: ["candidate_profile_missing"],
          telemetryJson: safeObject(state.telemetry),
          stageStatusesJson: buildStageStatusMap(state.telemetry),
          stageDurationsJson: buildStageDurationMap(state.telemetry),
          jobGeography: data.structuredJob.location || null,
        });

        return;
      }

      const cvResponse = await fetch("/api/tailoring/generate-cv", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          candidateProfile,
          structuredJob: data.structuredJob,
          recommendation:
            recommendationData && recommendationData.ok ? recommendationData : null,
          targetLanguage: outputLanguage,
        }),
      });

      const cvData = (await cvResponse.json()) as GenerateCvResponse;

      if (!cvResponse.ok) {
        addDegradedReason("generation_failed");
        updateTelemetryStage("generation", {
          status: "error",
          error: cvData.error || "CV generation failed.",
        });
        addTelemetryError(cvData.error || "CV generation failed.");
        setFinalError(cvData.error || "CV generation failed.");
        setFinalStatus("error");
        finalizeTelemetryRun({ outcome: "failed" });

        await persistTailoringRun({
          clientRunId: runId,
          jobUrl: jobUrl.trim(),
          jobDescriptionInput: jobDescription.trim(),
          normalizedUrl: data.normalizedUrl || "",
          outputLanguage,
          structuredJobJson: safeObject(data.structuredJob),
          extractedText: data.extractedText || "",
          extractionSource: data.source || "pasted-text",
          warningsJson: data.warnings || [],
          companyContextJson: safeObject(resolvedCompanyContext),
          marketSignalsJson: resolvedMarketSignals,
          companyResearchJson: resolvedCompanyResearch,
          applicationRecommendationJson: safeObject(recommendationData),
          inputType,
          runOutcome: "failed",
          degradedReasonsJson: ["generation_failed"],
          telemetryJson: safeObject(state.telemetry),
          stageStatusesJson: buildStageStatusMap(state.telemetry),
          stageDurationsJson: buildStageDurationMap(state.telemetry),
          jobGeography: data.structuredJob.location || null,
        });

        return;
      }

      const coverLetterResponse = await fetch("/api/tailoring/generate-cover-letter", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          candidateProfile,
          structuredJob: data.structuredJob,
          recommendation:
            recommendationData && recommendationData.ok ? recommendationData : null,
          targetLanguage: outputLanguage,
        }),
      });

      const coverLetterData =
        (await coverLetterResponse.json()) as GenerateCoverLetterResponse;

      if (!coverLetterResponse.ok) {
        addDegradedReason("generation_failed");
        updateTelemetryStage("generation", {
          status: "error",
          error: coverLetterData.error || "Cover letter generation failed.",
        });
        addTelemetryError(coverLetterData.error || "Cover letter generation failed.");
        setFinalError(coverLetterData.error || "Cover letter generation failed.");
        setFinalStatus("error");
        finalizeTelemetryRun({ outcome: "failed" });

        await persistTailoringRun({
          clientRunId: runId,
          jobUrl: jobUrl.trim(),
          jobDescriptionInput: jobDescription.trim(),
          normalizedUrl: data.normalizedUrl || "",
          outputLanguage,
          structuredJobJson: safeObject(data.structuredJob),
          extractedText: data.extractedText || "",
          extractionSource: data.source || "pasted-text",
          warningsJson: data.warnings || [],
          companyContextJson: safeObject(resolvedCompanyContext),
          marketSignalsJson: resolvedMarketSignals,
          companyResearchJson: resolvedCompanyResearch,
          applicationRecommendationJson: safeObject(recommendationData),
          finalCvText: cvData.cvDraft || cvData.result || "",
          inputType,
          runOutcome: "failed",
          degradedReasonsJson: ["generation_failed"],
          telemetryJson: safeObject(state.telemetry),
          stageStatusesJson: buildStageStatusMap(state.telemetry),
          stageDurationsJson: buildStageDurationMap(state.telemetry),
          jobGeography: data.structuredJob.location || null,
        });

        return;
      }

      const finalCv = cvData.cvDraft || cvData.result || "";
      const finalCoverLetter =
        coverLetterData.coverLetterDraft || coverLetterData.result || "";

      persistedFinalCv = finalCv;
      persistedFinalCoverLetter = finalCoverLetter;

      updateTelemetryStage("generation", { status: "success" });

      const hasLimitations =
        Boolean(
          resolvedCompanyContext == null ||
            resolvedMarketSignals == null ||
            resolvedCompanyResearch == null ||
            !recommendationData ||
            !recommendationData.ok
        );

      if (hasLimitations) {
        finalizeTelemetryRun({ outcome: "completed_with_limitations" });
      } else {
        finalizeTelemetryRun({ outcome: "completed" });
      }

      setFinalDrafts({
        cvDraft: finalCv,
        coverLetterDraft: finalCoverLetter,
        finalCv,
        finalCoverLetter,
        outputLanguage: outputLanguage === "de" ? "German" : "English",
        status: "completed",
        runId,
        rawResponse: {
          structuredJob: data,
          recommendation: recommendationData,
          companyContext: resolvedCompanyContext,
          marketSignals: resolvedMarketSignals,
          companyResearch: resolvedCompanyResearch,
          generation: {
            cv: cvData,
            coverLetter: coverLetterData,
          },
        },
      });

      setFinalStatus("ready");
      setFinalError(null);

      await persistTailoringRun({
        clientRunId: runId,
        jobUrl: jobUrl.trim(),
        jobDescriptionInput: jobDescription.trim(),
        normalizedUrl: data.normalizedUrl || "",
        outputLanguage,
        structuredJobJson: safeObject(data.structuredJob),
        extractedText: data.extractedText || "",
        extractionSource: data.source || "pasted-text",
        warningsJson: data.warnings || [],
        companyContextJson: safeObject(resolvedCompanyContext),
        marketSignalsJson: resolvedMarketSignals,
        companyResearchJson: resolvedCompanyResearch,
        applicationRecommendationJson: safeObject(recommendationData),
        finalCvText: finalCv,
        finalCoverLetterText: finalCoverLetter,
        inputType,
        runOutcome: hasLimitations ? "completed_with_limitations" : "completed",
        degradedReasonsJson: state.telemetry?.degradedReasons || [],
        telemetryJson: safeObject(state.telemetry),
        stageStatusesJson: buildStageStatusMap(state.telemetry),
        stageDurationsJson: buildStageDurationMap(state.telemetry),
        jobGeography: data.structuredJob.location || null,
      });

      router.push("/workspace/final");
    } catch (err) {
      console.error(err);
      addTelemetryError("Request failed.");
      setJobError("Request failed.");
      setJobStatus("error");
      setFinalStatus("error");
      finalizeTelemetryRun({ outcome: "failed" });

      try {
        await persistTailoringRun({
          clientRunId: runId,
          jobUrl: jobUrl.trim(),
          jobDescriptionInput: jobDescription.trim(),
          normalizedUrl: persistedStructuredJob?.normalizedUrl || "",
          outputLanguage,
          structuredJobJson: safeObject(persistedStructuredJob?.structuredJob),
          extractedText: persistedStructuredJob?.extractedText || "",
          extractionSource: persistedStructuredJob?.source || "pasted-text",
          warningsJson: persistedStructuredJob?.warnings || [],
          companyContextJson: safeObject(persistedCompanyContext),
          marketSignalsJson: persistedMarketSignals,
          companyResearchJson: persistedCompanyResearch,
          applicationRecommendationJson: safeObject(persistedRecommendation),
          finalCvText: persistedFinalCv,
          finalCoverLetterText: persistedFinalCoverLetter,
          inputType,
          runOutcome: "failed",
          degradedReasonsJson: state.telemetry?.degradedReasons || ["unexpected_request_failure"],
          telemetryJson: safeObject(state.telemetry),
          stageStatusesJson: buildStageStatusMap(state.telemetry),
          stageDurationsJson: buildStageDurationMap(state.telemetry),
          jobGeography: persistedStructuredJob?.structuredJob.location || null,
        });
      } catch {
        // ignore persistence failure here
      }
    } finally {
      setLoading(false);
      setProgressStep("");
    }
  }

  const candidateSummary = useMemo(() => {
    return buildCandidateSummary(candidateProfile);
  }, [candidateProfile]);

  const layerStates = useMemo(() => {
    const profile: LayerState = candidateProfile ? "ready" : "idle";

    const job: LayerState = loading
      ? "processing"
      : structuredJob
        ? "ready"
        : "idle";

    const requiredProfile: LayerState = loading
      ? "processing"
      : structuredJob
        ? "ready"
        : "idle";

    const companyContext: LayerState = loading
      ? "processing"
      : companyContextText
        ? !companyContextText.includes('"error"')
          ? "ready"
          : "error"
        : structuredJob
          ? "idle"
          : "idle";

    const companyResearch: LayerState = loading
      ? "processing"
      : companyResearchText
        ? !companyResearchText.includes('"error"')
          ? "ready"
          : "error"
        : structuredJob
          ? "idle"
          : "idle";

    const marketSignals: LayerState = loading
      ? "processing"
      : marketSignalsText
        ? !marketSignalsText.includes('"error"')
          ? "ready"
          : "error"
        : structuredJob
          ? "idle"
          : "idle";

    const fit: LayerState = loading
      ? "processing"
      : applicationRecommendation
        ? applicationRecommendation.ok
          ? "ready"
          : "warning"
        : structuredJob && candidateProfile
          ? "idle"
          : "idle";

    const recommendation: LayerState = loading
      ? "processing"
      : applicationRecommendation
        ? applicationRecommendation.ok
          ? "ready"
          : "warning"
        : structuredJob && candidateProfile
          ? "idle"
          : "idle";

    return [
      { label: "CP1", state: profile },
      { label: "CP2", state: job },
      { label: "CP3", state: requiredProfile },
      { label: "CP4", state: companyContext },
      { label: "CP5", state: companyResearch },
      { label: "CP6", state: marketSignals },
      { label: "CP7", state: fit },
      { label: "CP8", state: recommendation },
    ];
  }, [
    candidateProfile,
    structuredJob,
    companyContextText,
    companyResearchText,
    marketSignalsText,
    applicationRecommendation,
    loading,
  ]);

  const progressLabel = useMemo(
    () => getProgressLabel(layerStates, loading),
    [layerStates, loading]
  );

  const progressPercent = useMemo(
    () => getProgressPercent(layerStates, loading),
    [layerStates, loading]
  );

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 lg:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-6 lg:grid-cols-[74px_minmax(0,1fr)]">
          <aside className="hidden lg:flex">
            <div className="flex w-full flex-col items-center rounded-3xl border border-slate-200 bg-white py-6 shadow-sm">
              <div
                className="mt-2 text-xs font-semibold uppercase tracking-[0.35em] text-slate-400"
                style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
              >
                Workspace
              </div>
              <div className="mt-8 h-10 w-px bg-slate-200" />
              <div
                className="mt-8 text-xs font-semibold uppercase tracking-[0.35em] text-slate-700"
                style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
              >
                Analyse the role
              </div>
            </div>
          </aside>

          <section className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-slate-200 bg-white px-6 py-4 shadow-sm">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Guided application workspace
                </div>
                <div className="mt-1 text-sm text-slate-500">
                  Job analysis, progress tracking, and recommendation handoff.
                </div>
              </div>

              {currentRunId ? (
                <span className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700">
                  Run ID: {currentRunId}
                </span>
              ) : null}
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-900">
                    Candidate profile handoff
                  </div>
                  <div className="mt-1 text-sm text-slate-500">
                    {candidateProfile
                      ? candidateSummary
                      : "No stored profile found. Create or paste a CV first, then return here."}
                  </div>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-3">
                  <div
                    className={`rounded-full border px-4 py-2 text-sm ${
                      candidateProfile
                        ? "border-green-200 bg-green-50 text-green-700"
                        : "border-amber-200 bg-amber-50 text-amber-700"
                    }`}
                  >
                    {candidateProfile ? "Profile ready" : "Profile missing"}
                  </div>

                  <Link
                    href="/profile"
                    className={`rounded-xl px-4 py-2 text-sm font-medium ${
                      candidateProfile
                        ? "border border-slate-200 bg-white text-slate-900 hover:bg-slate-50"
                        : "bg-blue-600 text-white hover:bg-blue-700"
                    }`}
                  >
                    {candidateProfile ? "Update profile" : "Go to Profile"}
                  </Link>
                </div>
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
              <div className="space-y-5">
                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-lg font-semibold text-slate-900">
                        Profile + source
                      </div>
                      <div className="mt-1 text-sm text-slate-500">
                        Profile status, supporting docs, and URL input.
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => setLanguage("EN")}
                        className={`rounded-full border px-4 py-2 text-sm ${
                          language === "EN"
                            ? "border-blue-600 bg-blue-600 text-white"
                            : "border-slate-200 bg-white text-slate-900"
                        }`}
                      >
                        English
                      </button>
                      <button
                        onClick={() => setLanguage("DE")}
                        className={`rounded-full border px-4 py-2 text-sm ${
                          language === "DE"
                            ? "border-blue-600 bg-blue-600 text-white"
                            : "border-slate-200 bg-white text-slate-900"
                        }`}
                      >
                        German
                      </button>
                    </div>
                  </div>

                  <div className="mt-5 space-y-4">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="text-sm font-semibold text-slate-900">
                        Profile summary
                      </div>
                      <div className="mt-2 text-sm leading-7 text-slate-600">
                        {candidateSummary}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="text-sm font-semibold text-slate-900">
                        Supporting documents
                      </div>
                      <div className="mt-2 text-sm leading-7 text-slate-600">
                        {inputDocuments.length
                          ? `${inputDocuments.length} document(s) loaded`
                          : "No supporting documents loaded"}
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-900">
                        Job posting URL
                      </label>
                      <input
                        type="text"
                        value={jobUrl}
                        onChange={(e) => setJobUrl(e.target.value)}
                        className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-400"
                        placeholder="Paste LinkedIn, company page, or other job URL..."
                      />
                      <p className="mt-2 text-xs leading-6 text-slate-500">
                        URL is mainly for extraction. Pasted job text can still act as fallback.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-lg font-semibold text-slate-900">
                      Job description
                    </div>
                    <div className="mt-1 text-sm text-slate-500">
                      Paste the JD directly for the most reliable extraction.
                    </div>
                  </div>

                  <button
                    onClick={runJobStep}
                    disabled={!canRun || loading}
                    className="flex items-center gap-3 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loading ? <Spinner /> : null}
                    {loading ? "Analysing role..." : "Analyse role"}
                  </button>
                </div>

                <textarea
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  className="mt-5 min-h-[360px] w-full rounded-2xl border border-slate-300 bg-white p-4 text-sm outline-none transition focus:border-blue-400"
                  placeholder="Paste the job description here..."
                />

                {state.jobError ? (
                  <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {state.jobError}
                  </div>
                ) : null}

                {state.finalError ? (
                  <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {state.finalError}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
              <div className="flex flex-col gap-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">
                      Progress and stage status
                    </div>
                    <div className="mt-1 text-sm text-slate-500">
                      {loading
                        ? progressStep || progressLabel
                        : "Track the current run without exposing internal engine details."}
                    </div>
                  </div>

                  <div className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700">
                    {progressPercent}% complete
                  </div>
                </div>

                <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      loading
                        ? "bg-amber-500"
                        : progressPercent === 100
                          ? "bg-green-500"
                          : "bg-blue-500"
                    }`}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {layerStates.map((layer) => (
                    <div
                      key={layer.label}
                      className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm ${getLayerClasses(
                        layer.state
                      )}`}
                    >
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${getLayerDotClasses(
                          layer.state
                        )}`}
                      />
                      <span>{layer.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <OutputBlock
              title="Recommendation output"
              subtitle="Application recommendation, advisor message, risk areas, and positioning."
              defaultOpen={Boolean(applicationRecommendation)}
            >
              {!applicationRecommendation ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
                  No recommendation yet.
                </div>
              ) : applicationRecommendation.ok ? (
                <div className="space-y-6">
                  <div className="flex flex-wrap items-center gap-3">
                    <span
                      className={`rounded-full border px-4 py-2 text-sm font-medium ${getRecommendationClasses(
                        applicationRecommendation.applicationRecommendation
                      )}`}
                    >
                      {getRecommendationLabel(
                        applicationRecommendation.applicationRecommendation
                      )}
                    </span>

                    {currentRunId ? (
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700">
                        Run ID: {currentRunId}
                      </span>
                    ) : null}
                  </div>

                  <div className="grid gap-5 lg:grid-cols-2">
                    <ResultCard title="Advisor message">
                      {applicationRecommendation.advisorMessage}
                    </ResultCard>

                    <ResultCard title="Reasoning summary">
                      {applicationRecommendation.reasoningSummary}
                    </ResultCard>
                  </div>

                  <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-4">
                    <ResultCard title="Strong matches">
                      <ul className="list-disc space-y-2 pl-5">
                        {applicationRecommendation.strongMatches.length ? (
                          applicationRecommendation.strongMatches.map((item, index) => (
                            <li key={`${item}-${index}`}>{item}</li>
                          ))
                        ) : (
                          <li>-</li>
                        )}
                      </ul>
                    </ResultCard>

                    <ResultCard title="Stretch matches">
                      <ul className="list-disc space-y-2 pl-5">
                        {applicationRecommendation.stretchMatches.length ? (
                          applicationRecommendation.stretchMatches.map((item, index) => (
                            <li key={`${item}-${index}`}>{item}</li>
                          ))
                        ) : (
                          <li>-</li>
                        )}
                      </ul>
                    </ResultCard>

                    <ResultCard title="Risk areas">
                      <ul className="list-disc space-y-2 pl-5">
                        {applicationRecommendation.riskAreas.length ? (
                          applicationRecommendation.riskAreas.map((item, index) => (
                            <li key={`${item}-${index}`}>{item}</li>
                          ))
                        ) : (
                          <li>-</li>
                        )}
                      </ul>
                    </ResultCard>

                    <ResultCard title="Blockers">
                      <ul className="list-disc space-y-2 pl-5">
                        {applicationRecommendation.blockers.length ? (
                          applicationRecommendation.blockers.map((item, index) => (
                            <li key={`${item}-${index}`}>{item}</li>
                          ))
                        ) : (
                          <li>-</li>
                        )}
                      </ul>
                    </ResultCard>
                  </div>

                  <ResultCard title="Positioning strategy">
                    {applicationRecommendation.positioningStrategy || "-"}
                  </ResultCard>

                  <FeedbackStars
                    runId={currentRunId}
                    stage="job_analysis"
                    prompt={language === "DE" ? "Diesen Schritt bewerten" : "Rate this step"}
                    locale={language === "DE" ? "de" : "en"}
                  />
                </div>
              ) : (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
                  {applicationRecommendation.error}
                </div>
              )}
            </OutputBlock>

            <div className="grid gap-5 lg:grid-cols-2">
              <OutputBlock
                title="Structured job output"
                subtitle="Cleaned and structured role data from extraction."
                defaultOpen={false}
              >
                {!structuredJob ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
                    No structured job yet.
                  </div>
                ) : (
                  <div className="space-y-5">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700">
                        Source: {getSourceLabel(structuredJob.extractionSource || "pasted-text")}
                      </span>

                      {currentRunId ? (
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700">
                          Run ID: {currentRunId}
                        </span>
                      ) : null}
                    </div>

                    <div className="grid gap-4">
                      <ResultCard title="Company">{structuredJob.companyName || "-"}</ResultCard>
                      <ResultCard title="Job title">{structuredJob.jobTitle || "-"}</ResultCard>
                      <ResultCard title="Location">{structuredJob.location || "-"}</ResultCard>
                      <ResultCard title="Summary">{structuredJob.summary || "-"}</ResultCard>
                    </div>
                  </div>
                )}
              </OutputBlock>

              <OutputBlock
                title="Company context"
                subtitle="Company and operating context used for interpretation."
                defaultOpen={false}
              >
                {!companyContextText ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
                    No company context yet.
                  </div>
                ) : (
                  <textarea
                    value={companyContextText}
                    onChange={() => {}}
                    spellCheck={false}
                    className="min-h-[260px] w-full rounded-2xl border border-slate-300 bg-white p-4 text-sm"
                  />
                )}
              </OutputBlock>

              <OutputBlock
                title="Market signals"
                subtitle="Hiring posture and wording signals inferred from the job ad."
                defaultOpen={false}
              >
                {!marketSignalsText ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
                    No market signals yet.
                  </div>
                ) : (
                  <textarea
                    value={marketSignalsText}
                    onChange={() => {}}
                    spellCheck={false}
                    className="min-h-[260px] w-full rounded-2xl border border-slate-300 bg-white p-4 text-sm"
                  />
                )}
              </OutputBlock>

              <OutputBlock
                title="Company research"
                subtitle="External company-facing angles and risk signals."
                defaultOpen={false}
              >
                {!companyResearchText ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
                    No company research yet.
                  </div>
                ) : (
                  <textarea
                    value={companyResearchText}
                    onChange={() => {}}
                    spellCheck={false}
                    className="min-h-[260px] w-full rounded-2xl border border-slate-300 bg-white p-4 text-sm"
                  />
                )}
              </OutputBlock>

              <OutputBlock
                title="Cleaned extracted text"
                subtitle="Source text retained for review and later debugging."
                defaultOpen={false}
              >
                {!structuredJob?.extractedText ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
                    No extracted text yet.
                  </div>
                ) : (
                  <textarea
                    value={structuredJob.extractedText}
                    onChange={() => {}}
                    spellCheck={false}
                    className="min-h-[260px] w-full rounded-2xl border border-slate-300 bg-white p-4 text-sm"
                  />
                )}
              </OutputBlock>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}