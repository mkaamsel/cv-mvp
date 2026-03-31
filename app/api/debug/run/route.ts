import { NextRequest, NextResponse } from "next/server";

type JsonRecord = Record<string, unknown>;

type StepStatus = "pending" | "ok" | "partial" | "error" | "skipped";

type DebugStepResult = {
  key:
    | "candidateProfile"
    | "structuredJob"
    | "recommendation"
    | "cv"
    | "coverLetter"
    | "insights";
  label: string;
  status: StepStatus;
  startedAt: string | null;
  finishedAt: string | null;
  durationMs: number | null;
  endpoint?: string;
  requestBody?: unknown;
  responseBody?: unknown;
  warnings: string[];
  error?: string;
};

type DebugRunRecord = {
  runId: string;
  createdAt: string;
  status: "ok" | "partial" | "error";
  targetLanguage: string;
  sourceSummary: {
    hasCandidateProfileInput: boolean;
    hasStructuredJobInput: boolean;
    hasCandidateDocuments: boolean;
    hasJobText: boolean;
    hasJobUrl: boolean;
  };
  steps: DebugStepResult[];
  outputs: {
    candidateProfile: unknown | null;
    structuredJob: unknown | null;
    recommendation: unknown | null;
    cv: unknown | null;
    coverLetter: unknown | null;
    insights: unknown | null;
  };
  warnings: string[];
  errors: string[];
};

type DebugRequestBody = {
  targetLanguage?: string;

  candidateProfile?: unknown;
  structuredJob?: unknown;

  candidateDocuments?: unknown;
  extractCandidateProfilePayload?: JsonRecord;

  jobDescriptionText?: string;
  jobUrl?: string;
  jobExtractionPayload?: JsonRecord;

  recommendationPayload?: JsonRecord;
  cvPayload?: JsonRecord;
  coverLetterPayload?: JsonRecord;
  insightsPayload?: JsonRecord;

  endpoints?: {
    extractCandidateProfile?: string;
    extractJob?: string;
    applicationRecommendation?: string;
    generateCv?: string;
    generateCoverLetter?: string;
    generateInsights?: string;
  };
};

const debugRuns = new Map<string, DebugRunRecord>();
const MAX_RUNS = 50;

function nowIso(): string {
  return new Date().toISOString();
}

function createRunId(): string {
  const randomPart = Math.random().toString(36).slice(2, 8);
  return `run_${Date.now()}_${randomPart}`;
}

function pruneRuns(): void {
  const runs = Array.from(debugRuns.values()).sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt)
  );

  const overflow = runs.slice(MAX_RUNS);

  for (const run of overflow) {
    debugRuns.delete(run.runId);
  }
}

function getOrigin(request: NextRequest): string {
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

function buildInternalUrl(request: NextRequest, path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${getOrigin(request)}${normalizedPath}`;
}

function normalizeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return "Unknown error";
}

function isNonEmptyObject(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function makeStep(
  key: DebugStepResult["key"],
  label: string
): DebugStepResult {
  return {
    key,
    label,
    status: "pending",
    startedAt: null,
    finishedAt: null,
    durationMs: null,
    warnings: [],
  };
}

async function callInternalEndpoint(
  request: NextRequest,
  endpoint: string,
  payload: JsonRecord,
  step: DebugStepResult
): Promise<unknown> {
  const started = Date.now();
  step.startedAt = nowIso();
  step.endpoint = endpoint;
  step.requestBody = payload;

  try {
    const response = await fetch(buildInternalUrl(request, endpoint), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    const text = await response.text();
    let parsed: unknown = null;

    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      parsed = { rawText: text };
    }

    step.responseBody = parsed;
    step.finishedAt = nowIso();
    step.durationMs = Date.now() - started;

    if (!response.ok) {
      step.status = "error";
      step.error = `HTTP ${response.status}`;
      throw new Error(
        `Call to ${endpoint} failed with status ${response.status}`
      );
    }

    step.status = "ok";
    return parsed;
  } catch (error) {
    step.finishedAt = nowIso();
    step.durationMs = Date.now() - started;
    step.status = "error";
    step.error = normalizeErrorMessage(error);
    throw error;
  }
}

function extractLikelyPayload<T = unknown>(
  value: unknown,
  keys: string[]
): T | null {
  if (!isNonEmptyObject(value)) {
    return null;
  }

  for (const key of keys) {
    if (key in value) {
      return value[key] as T;
    }
  }

  return value as T;
}

function buildFallbackInsights(args: {
  recommendation: unknown;
  candidateProfile: unknown;
  structuredJob: unknown;
}): JsonRecord {
  const warnings: string[] = [];
  const evidenceGaps: string[] = [];
  const strengthSignals: string[] = [];

  const recommendationObject = isNonEmptyObject(args.recommendation)
    ? args.recommendation
    : null;

  const candidateProfileObject = isNonEmptyObject(args.candidateProfile)
    ? args.candidateProfile
    : null;

  const structuredJobObject = isNonEmptyObject(args.structuredJob)
    ? args.structuredJob
    : null;

  if (recommendationObject) {
    const recommendationWarnings = recommendationObject.warnings;
    const missingRequirements = recommendationObject.missingRequirements;
    const strengths = recommendationObject.strengths;

    if (Array.isArray(recommendationWarnings)) {
      warnings.push(
        ...recommendationWarnings.filter(
          (item): item is string => typeof item === "string"
        )
      );
    }

    if (Array.isArray(missingRequirements)) {
      evidenceGaps.push(
        ...missingRequirements.filter(
          (item): item is string => typeof item === "string"
        )
      );
    }

    if (Array.isArray(strengths)) {
      strengthSignals.push(
        ...strengths.filter((item): item is string => typeof item === "string")
      );
    }
  }

  if (candidateProfileObject && !("verifiedClaims" in candidateProfileObject)) {
    warnings.push("CandidateProfile has no verifiedClaims field.");
  }

  if (structuredJobObject && !("requirements" in structuredJobObject)) {
    warnings.push("StructuredJob has no requirements field.");
  }

  return {
    source: "fallback",
    summary:
      "Fallback insights generated inside debug route because no dedicated insights endpoint was available.",
    warnings,
    evidenceGaps,
    strengthSignals,
  };
}

function buildRunSummary(run: DebugRunRecord): Pick<
  DebugRunRecord,
  "runId" | "createdAt" | "status" | "targetLanguage" | "warnings" | "errors"
> & {
  stepStatuses: Array<{
    key: DebugStepResult["key"];
    status: StepStatus;
    durationMs: number | null;
  }>;
} {
  return {
    runId: run.runId,
    createdAt: run.createdAt,
    status: run.status,
    targetLanguage: run.targetLanguage,
    warnings: run.warnings,
    errors: run.errors,
    stepStatuses: run.steps.map((step) => ({
      key: step.key,
      status: step.status,
      durationMs: step.durationMs,
    })),
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const runId = searchParams.get("runId");

  if (runId) {
    const run = debugRuns.get(runId);

    if (!run) {
      return NextResponse.json(
        { error: `No debug run found for runId "${runId}".` },
        { status: 404 }
      );
    }

    return NextResponse.json(run, { status: 200 });
  }

  const runs = Array.from(debugRuns.values())
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map(buildRunSummary);

  return NextResponse.json(
    {
      runs,
      count: runs.length,
    },
    { status: 200 }
  );
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as DebugRequestBody;
  const runId = createRunId();
  const createdAt = nowIso();

  const endpoints = {
    extractCandidateProfile:
      body.endpoints?.extractCandidateProfile ??
      "/api/extract-candidate-profile",
    extractJob: body.endpoints?.extractJob ?? "/api/extract-job",
    applicationRecommendation:
      body.endpoints?.applicationRecommendation ??
      "/api/tailoring/application-recommendation",
    generateCv:
      body.endpoints?.generateCv ?? "/api/tailoring/generate-cv",
    generateCoverLetter:
      body.endpoints?.generateCoverLetter ??
      "/api/tailoring/generate-cover-letter",
    generateInsights: body.endpoints?.generateInsights ?? "",
  };

  const targetLanguage = body.targetLanguage ?? "English";

  const steps: DebugStepResult[] = [
    makeStep("candidateProfile", "Candidate Profile"),
    makeStep("structuredJob", "Structured Job"),
    makeStep("recommendation", "Application Recommendation"),
    makeStep("cv", "Generated CV"),
    makeStep("coverLetter", "Generated Cover Letter"),
    makeStep("insights", "Insights"),
  ];

  const run: DebugRunRecord = {
    runId,
    createdAt,
    status: "ok",
    targetLanguage,
    sourceSummary: {
      hasCandidateProfileInput: body.candidateProfile !== undefined,
      hasStructuredJobInput: body.structuredJob !== undefined,
      hasCandidateDocuments: body.candidateDocuments !== undefined,
      hasJobText: Boolean(body.jobDescriptionText),
      hasJobUrl: Boolean(body.jobUrl),
    },
    steps,
    outputs: {
      candidateProfile: null,
      structuredJob: null,
      recommendation: null,
      cv: null,
      coverLetter: null,
      insights: null,
    },
    warnings: [],
    errors: [],
  };

  debugRuns.set(runId, run);
  pruneRuns();

  const stepByKey = {
    candidateProfile: steps[0],
    structuredJob: steps[1],
    recommendation: steps[2],
    cv: steps[3],
    coverLetter: steps[4],
    insights: steps[5],
  };

  try {
    if (body.candidateProfile !== undefined) {
      stepByKey.candidateProfile.status = "ok";
      stepByKey.candidateProfile.startedAt = nowIso();
      stepByKey.candidateProfile.finishedAt = nowIso();
      stepByKey.candidateProfile.durationMs = 0;
      stepByKey.candidateProfile.responseBody = body.candidateProfile;
      run.outputs.candidateProfile = body.candidateProfile;
    } else if (body.extractCandidateProfilePayload || body.candidateDocuments) {
      const payload =
        body.extractCandidateProfilePayload ??
        ({
          documents: body.candidateDocuments,
          targetLanguage,
        } satisfies JsonRecord);

      const rawResponse = await callInternalEndpoint(
        request,
        endpoints.extractCandidateProfile,
        payload,
        stepByKey.candidateProfile
      );

      run.outputs.candidateProfile = extractLikelyPayload(rawResponse, [
        "candidateProfile",
        "profile",
        "normalizedProfile",
      ]);
    } else {
      stepByKey.candidateProfile.status = "skipped";
      stepByKey.candidateProfile.warnings.push(
        "No candidateProfile or candidateDocuments were supplied."
      );
      run.warnings.push("CandidateProfile step skipped.");
    }

    if (body.structuredJob !== undefined) {
      stepByKey.structuredJob.status = "ok";
      stepByKey.structuredJob.startedAt = nowIso();
      stepByKey.structuredJob.finishedAt = nowIso();
      stepByKey.structuredJob.durationMs = 0;
      stepByKey.structuredJob.responseBody = body.structuredJob;
      run.outputs.structuredJob = body.structuredJob;
    } else if (
      body.jobExtractionPayload ||
      body.jobDescriptionText ||
      body.jobUrl
    ) {
      const payload =
        body.jobExtractionPayload ??
        ({
          ...(body.jobUrl ? { url: body.jobUrl } : {}),
          ...(body.jobDescriptionText
            ? { jobDescriptionText: body.jobDescriptionText }
            : {}),
        } satisfies JsonRecord);

      try {
        const rawResponse = await callInternalEndpoint(
          request,
          endpoints.extractJob,
          payload,
          stepByKey.structuredJob
        );

        run.outputs.structuredJob = extractLikelyPayload(rawResponse, [
          "structuredJob",
          "jobProfile",
          "job",
          "normalizedJob",
        ]);
      } catch (error) {
        stepByKey.structuredJob.warnings.push(
          `Job extraction failed at ${endpoints.extractJob}.`
        );
        run.warnings.push(
          "StructuredJob step failed. Provide structuredJob directly or fix the job extraction endpoint contract."
        );
        run.errors.push(normalizeErrorMessage(error));
      }
    } else {
      stepByKey.structuredJob.status = "skipped";
      stepByKey.structuredJob.warnings.push(
        "No structuredJob, jobDescriptionText, or jobUrl were supplied."
      );
      run.warnings.push("StructuredJob step skipped.");
    }

    if (run.outputs.candidateProfile && run.outputs.structuredJob) {
      const payload =
        body.recommendationPayload ??
        ({
          candidateProfile: run.outputs.candidateProfile,
          structuredJob: run.outputs.structuredJob,
          targetLanguage,
        } satisfies JsonRecord);

      try {
        const rawResponse = await callInternalEndpoint(
          request,
          endpoints.applicationRecommendation,
          payload,
          stepByKey.recommendation
        );

        run.outputs.recommendation = extractLikelyPayload(rawResponse, [
          "recommendation",
          "applicationRecommendation",
          "positioningStrategy",
        ]);
      } catch (error) {
        run.errors.push(normalizeErrorMessage(error));
      }
    } else {
      stepByKey.recommendation.status = "skipped";
      stepByKey.recommendation.warnings.push(
        "Recommendation requires both candidateProfile and structuredJob."
      );
      run.warnings.push("Recommendation step skipped.");
    }

    if (
      run.outputs.candidateProfile &&
      run.outputs.structuredJob &&
      run.outputs.recommendation
    ) {
      const payload =
        body.cvPayload ??
        ({
          candidateProfile: run.outputs.candidateProfile,
          structuredJob: run.outputs.structuredJob,
          recommendation: run.outputs.recommendation,
          targetLanguage,
        } satisfies JsonRecord);

      try {
        const rawResponse = await callInternalEndpoint(
          request,
          endpoints.generateCv,
          payload,
          stepByKey.cv
        );

        run.outputs.cv = extractLikelyPayload(rawResponse, [
          "cv",
          "cvDraft",
          "finalCv",
        ]);
      } catch (error) {
        run.errors.push(normalizeErrorMessage(error));
      }
    } else {
      stepByKey.cv.status = "skipped";
      stepByKey.cv.warnings.push(
        "CV generation requires candidateProfile, structuredJob, and recommendation."
      );
      run.warnings.push("CV step skipped.");
    }

    if (
      run.outputs.candidateProfile &&
      run.outputs.structuredJob &&
      run.outputs.recommendation
    ) {
      const payload =
        body.coverLetterPayload ??
        ({
          candidateProfile: run.outputs.candidateProfile,
          structuredJob: run.outputs.structuredJob,
          recommendation: run.outputs.recommendation,
          targetLanguage,
        } satisfies JsonRecord);

      try {
        const rawResponse = await callInternalEndpoint(
          request,
          endpoints.generateCoverLetter,
          payload,
          stepByKey.coverLetter
        );

        run.outputs.coverLetter = extractLikelyPayload(rawResponse, [
          "coverLetter",
          "coverLetterDraft",
          "finalCoverLetter",
        ]);
      } catch (error) {
        run.errors.push(normalizeErrorMessage(error));
      }
    } else {
      stepByKey.coverLetter.status = "skipped";
      stepByKey.coverLetter.warnings.push(
        "Cover letter generation requires candidateProfile, structuredJob, and recommendation."
      );
      run.warnings.push("Cover letter step skipped.");
    }

    if (
      run.outputs.candidateProfile &&
      run.outputs.structuredJob &&
      run.outputs.recommendation
    ) {
      if (endpoints.generateInsights) {
        const payload =
          body.insightsPayload ??
          ({
            candidateProfile: run.outputs.candidateProfile,
            structuredJob: run.outputs.structuredJob,
            recommendation: run.outputs.recommendation,
            targetLanguage,
          } satisfies JsonRecord);

        try {
          const rawResponse = await callInternalEndpoint(
            request,
            endpoints.generateInsights,
            payload,
            stepByKey.insights
          );

          run.outputs.insights = extractLikelyPayload(rawResponse, [
            "insights",
            "analysis",
          ]);
        } catch (error) {
          stepByKey.insights.status = "partial";
          stepByKey.insights.warnings.push(
            "Dedicated insights endpoint failed. Fallback insights were created."
          );
          run.outputs.insights = buildFallbackInsights({
            recommendation: run.outputs.recommendation,
            candidateProfile: run.outputs.candidateProfile,
            structuredJob: run.outputs.structuredJob,
          });
          run.warnings.push(normalizeErrorMessage(error));
        }
      } else {
        stepByKey.insights.status = "partial";
        stepByKey.insights.startedAt = nowIso();
        stepByKey.insights.finishedAt = nowIso();
        stepByKey.insights.durationMs = 0;
        stepByKey.insights.warnings.push(
          "No dedicated insights endpoint configured. Fallback insights were created."
        );
        run.outputs.insights = buildFallbackInsights({
          recommendation: run.outputs.recommendation,
          candidateProfile: run.outputs.candidateProfile,
          structuredJob: run.outputs.structuredJob,
        });
      }
    } else {
      stepByKey.insights.status = "skipped";
      stepByKey.insights.warnings.push(
        "Insights require candidateProfile, structuredJob, and recommendation."
      );
      run.warnings.push("Insights step skipped.");
    }

    const hasHardErrors = run.steps.some((step) => step.status === "error");
    const hasPartialsOrSkips = run.steps.some(
      (step) => step.status === "partial" || step.status === "skipped"
    );

    run.status = hasHardErrors ? "error" : hasPartialsOrSkips ? "partial" : "ok";

    return NextResponse.json(
      {
        runId: run.runId,
        createdAt: run.createdAt,
        status: run.status,
        targetLanguage: run.targetLanguage,
        warnings: run.warnings,
        errors: run.errors,
        steps: run.steps,
        outputs: run.outputs,
      },
      { status: 200 }
    );
  } catch (error) {
    run.status = "error";
    run.errors.push(normalizeErrorMessage(error));

    return NextResponse.json(
      {
        runId: run.runId,
        createdAt: run.createdAt,
        status: run.status,
        warnings: run.warnings,
        errors: run.errors,
        steps: run.steps,
        outputs: run.outputs,
      },
      { status: 500 }
    );
  }
}