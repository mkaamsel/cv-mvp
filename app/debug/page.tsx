import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase/admin";

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

export default async function DebugRunsPage() {
  const { data, error } = await supabaseAdmin
    .from("application_runs")
    .select(
      "id, status, current_stage, mode, output_language, model_name, warnings, error_text, duration_ms, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    throw new Error(`Failed to load debug runs: ${error.message}`);
  }

  const runs = (data ?? []) as RunRow[];

  return (
    <main className="min-h-screen bg-white px-6 py-10 text-neutral-900">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight">Debug Runs</h1>
            <p className="mt-3 text-lg text-neutral-600">
              Internal observability view for recent application generation runs.
            </p>
          </div>

          <Link
            href="/test-generate"
            className="rounded-2xl border border-neutral-300 px-5 py-3 text-sm font-medium text-neutral-800 transition hover:bg-neutral-50"
          >
            Back to Test Generate
          </Link>
        </div>

        <section className="mt-8 rounded-3xl border border-neutral-200 bg-white p-4 shadow-sm">
          {runs.length === 0 ? (
            <div className="rounded-2xl bg-neutral-50 p-6 text-sm text-neutral-600">
              No runs found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-y-3">
                <thead>
                  <tr className="text-left text-sm text-neutral-500">
                    <th className="px-3 py-2 font-medium">Run</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">Stage</th>
                    <th className="px-3 py-2 font-medium">Mode</th>
                    <th className="px-3 py-2 font-medium">Language</th>
                    <th className="px-3 py-2 font-medium">Warnings</th>
                    <th className="px-3 py-2 font-medium">Duration</th>
                    <th className="px-3 py-2 font-medium">Created</th>
                    <th className="px-3 py-2 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map((run) => {
                    const warningCount = Array.isArray(run.warnings)
                      ? run.warnings.length
                      : 0;

                    return (
                      <tr
                        key={run.id}
                        className="rounded-2xl border border-neutral-200 bg-neutral-50 text-sm"
                      >
                        <td className="px-3 py-4 font-mono text-xs text-neutral-700">
                          {run.id}
                        </td>
                        <td className="px-3 py-4">
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${badgeClass(
                              run.status
                            )}`}
                          >
                            {run.status ?? "unknown"}
                          </span>
                        </td>
                        <td className="px-3 py-4 text-neutral-700">
                          {run.current_stage ?? "—"}
                        </td>
                        <td className="px-3 py-4 text-neutral-700">
                          {run.mode ?? "—"}
                        </td>
                        <td className="px-3 py-4 text-neutral-700">
                          {run.output_language ?? "—"}
                        </td>
                        <td className="px-3 py-4 text-neutral-700">
                          {warningCount}
                        </td>
                        <td className="px-3 py-4 text-neutral-700">
                          {run.duration_ms ?? "—"}
                        </td>
                        <td className="px-3 py-4 text-neutral-700">
                          {formatDate(run.created_at)}
                        </td>
                        <td className="px-3 py-4">
                          <Link
                            href={`/debug/runs/${run.id}`}
                            className="rounded-xl border border-neutral-300 px-3 py-2 text-xs font-medium text-neutral-800 transition hover:bg-white"
                          >
                            Open
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}