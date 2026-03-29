import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/admin";

type RunPageProps = {
  params: Promise<{
    runId: string;
  }>;
};

type RunRow = {
  id: string;
  status: string | null;
  current_stage: string | null;
  mode: string | null;
  output_language: string | null;
  model_name: string | null;
  warnings: unknown[] | null;
  error_text: string | null;
  duration_ms: number | null;
  created_at?: string | null;
};

type InputRow = {
  cv_source_type: string | null;
  cv_file_name: string | null;
  cv_original_text: string | null;
  cv_processed_text: string | null;
  job_source_type: string | null;
  job_url: string | null;
  job_original_text: string | null;
  job_processed_text: string | null;
  extraction_warnings: unknown[] | null;
};

type OutputRow = {
  draft_cv: string | null;
  draft_cover_letter: string | null;
  final_cv: string | null;
  final_cover_letter: string | null;
  review_findings: unknown[] | null;
  discovery_signals: unknown[] | null;
};

function badgeClass(status: string | null) {
  if (status === "completed" || status === "success") {
    return "bg-green-100 text-green-800 border-green-200";
  }

  if (status === "partial" || status === "running") {
    return "bg-yellow-100 text-yellow-800 border-yellow-200";
  }

  if (status === "failed") {
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

function StageTimeline({ currentStage }: { currentStage: string | null }) {
  const stages = [
    "input_prepared",
    "competencies_mapped",
    "evidence_selected",
    "positioning_built",
    "cv_drafted",
    "cover_letter_drafted",
    "review_completed",
    "done",
  ];

  const currentIndex = currentStage ? stages.indexOf(currentStage) : -1;

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {stages.map((stage, index) => {
        const isDone = currentIndex >= index;
        const isCurrent = currentStage === stage;

        return (
          <div
            key={stage}
            className={`rounded-2xl border p-4 text-sm ${
              isCurrent
                ? "border-black bg-black text-white"
                : isDone
                ? "border-green-200 bg-green-50 text-green-800"
                : "border-neutral-200 bg-neutral-50 text-neutral-500"
            }`}
          >
            <div className="text-xs uppercase tracking-wide">
              {isCurrent ? "Current" : isDone ? "Reached" : "Pending"}
            </div>
            <div className="mt-2 font-medium">{stage}</div>
          </div>
        );
      })}
    </div>
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

export default async function DebugRunDetailPage({ params }: RunPageProps) {
  const { runId } = await params;

  const runResult = await supabaseAdmin
    .from("application_runs")
    .select(
      "id, status, current_stage, mode, output_language, model_name, warnings, error_text, duration_ms, created_at"
    )
    .eq("id", runId)
    .single();

  if (runResult.error && runResult.error.code !== "PGRST116") {
    throw new Error(`Failed to load run: ${runResult.error.message}`);
  }

  if (!runResult.data) {
    notFound();
  }

  const inputsResult = await supabaseAdmin
    .from("application_inputs")
    .select(
      "cv_source_type, cv_file_name, cv_original_text, cv_processed_text, job_source_type, job_url, job_original_text, job_processed_text, extraction_warnings"
    )
    .eq("run_id", runId)
    .limit(1)
    .maybeSingle();

  if (inputsResult.error) {
    throw new Error(`Failed to load inputs: ${inputsResult.error.message}`);
  }

  const outputsResult = await supabaseAdmin
    .from("application_outputs")
    .select(
      "draft_cv, draft_cover_letter, final_cv, final_cover_letter, review_findings, discovery_signals"
    )
    .eq("run_id", runId)
    .limit(1)
    .maybeSingle();

  if (outputsResult.error) {
    throw new Error(`Failed to load outputs: ${outputsResult.error.message}`);
  }

  const run = runResult.data as RunRow;
  const inputs = (inputsResult.data ?? null) as InputRow | null;
  const outputs = (outputsResult.data ?? null) as OutputRow | null;

  return (
    <main className="min-h-screen bg-white px-6 py-10 text-neutral-900">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight">Run Debug View</h1>
            <p className="mt-3 text-lg text-neutral-600">
              Full internal inspection for a single application generation run.
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
              Run ID: {run.id}
            </span>
            <span
              className={`rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-wide ${badgeClass(
                run.status
              )}`}
            >
              {run.status ?? "unknown"}
            </span>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-medium uppercase tracking-wide text-neutral-700">
              Stage: {run.current_stage ?? "—"}
            </span>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-medium uppercase tracking-wide text-neutral-700">
              Mode: {run.mode ?? "—"}
            </span>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-medium uppercase tracking-wide text-neutral-700">
              Output: {run.output_language ?? "—"}
            </span>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-medium uppercase tracking-wide text-neutral-700">
              Model: {run.model_name ?? "—"}
            </span>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-4">
            <div className="rounded-2xl bg-white p-4">
              <div className="text-xs uppercase tracking-wide text-neutral-500">
                Created
              </div>
              <div className="mt-2 text-sm font-medium text-neutral-900">
                {formatDate(run.created_at)}
              </div>
            </div>

            <div className="rounded-2xl bg-white p-4">
              <div className="text-xs uppercase tracking-wide text-neutral-500">
                Duration
              </div>
              <div className="mt-2 text-sm font-medium text-neutral-900">
                {run.duration_ms ?? "—"} ms
              </div>
            </div>

            <div className="rounded-2xl bg-white p-4">
              <div className="text-xs uppercase tracking-wide text-neutral-500">
                Warnings
              </div>
              <div className="mt-2 text-sm font-medium text-neutral-900">
                {Array.isArray(run.warnings) ? run.warnings.length : 0}
              </div>
            </div>

            <div className="rounded-2xl bg-white p-4">
              <div className="text-xs uppercase tracking-wide text-neutral-500">
                Error
              </div>
              <div className="mt-2 text-sm font-medium text-neutral-900">
                {run.error_text ? "Yes" : "No"}
              </div>
            </div>
          </div>

          <div className="mt-6">
            <h2 className="text-lg font-semibold">Run Progress</h2>
            <div className="mt-4">
              <StageTimeline currentStage={run.current_stage} />
            </div>
          </div>
        </section>

        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-semibold">Run Warnings</h2>
            <div className="mt-4">{renderArray(run.warnings)}</div>
          </section>

          <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-semibold">Run Error</h2>
            <pre className="mt-4 whitespace-pre-wrap rounded-2xl bg-neutral-50 p-4 text-sm leading-6 text-neutral-800">
              {run.error_text?.trim() ? run.error_text : "None."}
            </pre>
          </section>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-semibold">Input Metadata</h2>

            <div className="mt-4 space-y-3 text-sm text-neutral-800">
              <p>
                <span className="font-semibold">CV source type:</span>{" "}
                {inputs?.cv_source_type ?? "—"}
              </p>
              <p>
                <span className="font-semibold">CV file name:</span>{" "}
                {inputs?.cv_file_name ?? "—"}
              </p>
              <p>
                <span className="font-semibold">Job source type:</span>{" "}
                {inputs?.job_source_type ?? "—"}
              </p>
              <p>
                <span className="font-semibold">Job URL:</span>{" "}
                {inputs?.job_url ?? "—"}
              </p>
            </div>

            <h3 className="mt-6 text-lg font-semibold">Extraction Warnings</h3>
            <div className="mt-2">{renderArray(inputs?.extraction_warnings)}</div>
          </section>

          <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-semibold">Stored Review Metadata</h2>

            <h3 className="mt-4 text-lg font-semibold">Review Findings</h3>
            <pre className="mt-2 whitespace-pre-wrap rounded-2xl bg-neutral-50 p-4 text-sm leading-6 text-neutral-800">
              {renderJson(outputs?.review_findings ?? [])}
            </pre>

            <h3 className="mt-6 text-lg font-semibold">Discovery Signals</h3>
            <pre className="mt-2 whitespace-pre-wrap rounded-2xl bg-neutral-50 p-4 text-sm leading-6 text-neutral-800">
              {renderJson(outputs?.discovery_signals ?? [])}
            </pre>
          </section>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          <TextBlock title="CV Original Text" text={inputs?.cv_original_text} />
          <TextBlock title="Job Original Text" text={inputs?.job_original_text} />
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          <TextBlock title="CV Processed Text" text={inputs?.cv_processed_text} />
          <TextBlock
            title="Job Processed Text"
            text={inputs?.job_processed_text}
          />
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          <TextBlock title="Draft CV" text={outputs?.draft_cv} />
          <TextBlock
            title="Draft Cover Letter"
            text={outputs?.draft_cover_letter}
          />
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          <TextBlock title="Final CV" text={outputs?.final_cv} />
          <TextBlock
            title="Final Cover Letter"
            text={outputs?.final_cover_letter}
          />
        </div>
      </div>
    </main>
  );
}