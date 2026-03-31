import Link from "next/link";
import { notFound } from "next/navigation";

type RunPageProps = {
  params: Promise<{
    runId: string;
  }>;
};

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

function badgeClass(status: string | null) {
  if (status === "completed" || status === "success" || status === "ok") {
    return "bg-green-100 text-green-800 border-green-200";
  }

  if (status === "partial" || status === "running" || status === "pending") {
    return "bg-yellow-100 text-yellow-800 border-yellow-200";
  }

  if (status === "failed" || status === "error") {
    return "bg-red-100 text-red-800 border-red-200";
  }

  return "bg-neutral-100 text-neutral-700 border-neutral-200";
}

function formatDate(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function renderJson(value: unknown) {
  return JSON.stringify(value ?? null, null, 2);
}

function renderArray(items: unknown[] | null | undefined) {
  if (!items || items.length === 0) {
    return <p className="text-sm text-neutral-500">None.</p>;
  }

  return (
    <ul className="list-disc space-y-1 pl-5 text-sm text-neutral-800">
      {items.map((item, index) => (
        <li key={index}>{typeof item === "string" ? item : renderJson(item)}</li>
      ))}
    </ul>
  );
}

function TextBlock({
  title,
  text,
}: {
  title: string;
  text: string | null | undefined;
}) {
  return (
    <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-semibold">{title}</h2>
      <pre className="mt-4 whitespace-pre-wrap rounded-2xl bg-neutral-50 p-4 text-sm leading-6 text-neutral-800">
        {text?.trim() ? text : "—"}
      </pre>
    </section>
  );
}

function JsonBlock({
  title,
  value,
}: {
  title: string;
  value: unknown;
}) {
  return (
    <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-semibold">{title}</h2>
      <pre className="mt-4 overflow-x-auto whitespace-pre-wrap rounded-2xl bg-neutral-50 p-4 text-sm leading-6 text-neutral-800">
        {renderJson(value)}
      </pre>
    </section>
  );
}

function StepTimeline({ steps }: { steps: DebugStepResult[] }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {steps.map((step) => (
        <div
          key={step.key}
          className={`rounded-2xl border p-4 text-sm ${badgeClass(step.status)}`}
        >
          <div className="text-xs uppercase tracking-wide">{step.status}</div>
          <div className="mt-2 font-medium">{step.label}</div>
          <div className="mt-2 text-xs opacity-80">
            Duration: {step.durationMs ?? "—"} ms
          </div>
          {step.endpoint ? (
            <div className="mt-1 break-all text-xs opacity-80">
              Endpoint: {step.endpoint}
            </div>
          ) : null}
          {step.error ? (
            <div className="mt-2 rounded-xl bg-white/60 p-2 text-xs">
              Error: {step.error}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export default async function DebugRunDetailPage({ params }: RunPageProps) {
  const { runId } = await params;

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/api/debug?runId=${encodeURIComponent(runId)}`,
    {
      cache: "no-store",
    }
  );

  const runResult = (await response.json().catch(() => null)) as
    | DebugRunRecord
    | { error?: string }
    | null;

  if (!response.ok) {
    if (response.status === 404) {
      notFound();
    }

    const message =
      runResult && typeof runResult === "object" && "error" in runResult
        ? runResult.error
        : "Unknown error";

    throw new Error(`Failed to load run: ${message}`);
  }

  const run = runResult as DebugRunRecord;

  const totalDuration = run.steps.reduce((sum, step) => {
    return sum + (typeof step.durationMs === "number" ? step.durationMs : 0);
  }, 0);

  const totalWarnings =
    run.warnings.length +
    run.steps.reduce((sum, step) => sum + step.warnings.length, 0);

  return (
    <main className="min-h-screen bg-white px-6 py-10 text-neutral-900">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight">Run Debug View</h1>
            <p className="mt-3 text-lg text-neutral-600">
              Full internal inspection for a single pipeline execution.
            </p>
          </div>

          <div className="flex gap-3">
            <Link
              href="/debug"
              className="rounded-2xl border border-neutral-300 px-5 py-3 text-sm font-medium text-neutral-800 transition hover:bg-neutral-50"
            >
              All Runs
            </Link>
            <Link
              href="/test-generate"
              className="rounded-2xl border border-neutral-300 px-5 py-3 text-sm font-medium text-neutral-800 transition hover:bg-neutral-50"
            >
              Test Generate
            </Link>
          </div>
        </div>

        <section className="mt-8 rounded-3xl border border-neutral-200 bg-neutral-50 p-6">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-white px-3 py-1 text-xs font-medium uppercase tracking-wide text-neutral-700">
              Run ID: {run.runId}
            </span>
            <span
              className={`rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-wide ${badgeClass(
                run.status
              )}`}
            >
              {run.status}
            </span>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-medium uppercase tracking-wide text-neutral-700">
              Output: {run.targetLanguage}
            </span>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-4">
            <div className="rounded-2xl bg-white p-4">
              <div className="text-xs uppercase tracking-wide text-neutral-500">
                Created
              </div>
              <div className="mt-2 text-sm font-medium text-neutral-900">
                {formatDate(run.createdAt)}
              </div>
            </div>

            <div className="rounded-2xl bg-white p-4">
              <div className="text-xs uppercase tracking-wide text-neutral-500">
                Step Duration
              </div>
              <div className="mt-2 text-sm font-medium text-neutral-900">
                {totalDuration} ms
              </div>
            </div>

            <div className="rounded-2xl bg-white p-4">
              <div className="text-xs uppercase tracking-wide text-neutral-500">
                Warnings
              </div>
              <div className="mt-2 text-sm font-medium text-neutral-900">
                {totalWarnings}
              </div>
            </div>

            <div className="rounded-2xl bg-white p-4">
              <div className="text-xs uppercase tracking-wide text-neutral-500">
                Errors
              </div>
              <div className="mt-2 text-sm font-medium text-neutral-900">
                {run.errors.length}
              </div>
            </div>
          </div>

          <div className="mt-6">
            <h2 className="text-lg font-semibold">Pipeline Steps</h2>
            <div className="mt-4">
              <StepTimeline steps={run.steps} />
            </div>
          </div>
        </section>

        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-semibold">Run Warnings</h2>
            <div className="mt-4">{renderArray(run.warnings)}</div>
          </section>

          <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-semibold">Run Errors</h2>
            <div className="mt-4">{renderArray(run.errors)}</div>
          </section>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          <JsonBlock title="Source Summary" value={run.sourceSummary} />
          <JsonBlock title="Step Metadata" value={run.steps} />
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          <JsonBlock
            title="Candidate Profile"
            value={run.outputs.candidateProfile}
          />
          <JsonBlock title="Structured Job" value={run.outputs.structuredJob} />
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          <JsonBlock
            title="Application Recommendation"
            value={run.outputs.recommendation}
          />
          <JsonBlock title="Insights" value={run.outputs.insights} />
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          <TextBlock
            title="Generated CV"
            text={
              typeof run.outputs.cv === "string"
                ? run.outputs.cv
                : renderJson(run.outputs.cv)
            }
          />
          <TextBlock
            title="Generated Cover Letter"
            text={
              typeof run.outputs.coverLetter === "string"
                ? run.outputs.coverLetter
                : renderJson(run.outputs.coverLetter)
            }
          />
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          {run.steps.map((step) => (
            <JsonBlock
              key={`${step.key}-request`}
              title={`${step.label} Request`}
              value={step.requestBody ?? null}
            />
          ))}
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          {run.steps.map((step) => (
            <JsonBlock
              key={`${step.key}-response`}
              title={`${step.label} Response`}
              value={step.responseBody ?? null}
            />
          ))}
        </div>
      </div>
    </main>
  );
}