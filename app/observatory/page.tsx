"use client";

import { useEffect, useMemo, useState } from "react";

type ObservatoryResponse = {
  ok: true;
  summary: {
    totalRuns: number;
    runsToday: number;
    completedRuns: number;
    limitedRuns: number;
    failedRuns: number;
    successRate: number;
    avgStageDurationMs: number;
    avgStars: number;
    lowRatedCount: number;
    highRatedCount: number;
    activeUsers30d: number;
    activeUsersToday: number;
  };
  technical: {
    degradedReasons: Array<{ label: string; count: number }>;
    stageReliability: Array<{
      stage: string;
      success: number;
      partial: number;
      error: number;
    }>;
  };
  quality: {
    latestFeedback: Array<{
      createdAt: string;
      runId: string;
      stage: string;
      stars: number;
      comment: string;
    }>;
  };
  market: {
    byLanguage: Array<{ label: string; count: number }>;
    byInputType: Array<{ label: string; count: number }>;
    runsPerDay: Array<{ day: string; count: number }>;
  };
  reviewQueue: Array<{
    createdAt: string;
    runId: string;
    outcome: string;
    inputType: string;
    language: string;
    geography: string;
    degradedReasons: string[];
    stars: number | null;
    comment: string | null;
  }>;
};

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: ObservatoryResponse };

function StatCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string | number;
  helper?: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-sm font-medium text-slate-500">{label}</div>
      <div className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{value}</div>
      {helper ? <div className="mt-2 text-xs text-slate-400">{helper}</div> : null}
    </div>
  );
}

function Panel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        {subtitle ? <p className="text-sm text-slate-500">{subtitle}</p> : null}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function SimpleBarList({
  items,
  emptyLabel,
}: {
  items: Array<{ label: string; count: number }>;
  emptyLabel: string;
}) {
  const max = useMemo(
    () => items.reduce((highest, item) => Math.max(highest, item.count), 0),
    [items]
  );

  if (!items.length) {
    return <div className="text-sm text-slate-500">{emptyLabel}</div>;
  }

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const width = max ? Math.max(8, Math.round((item.count / max) * 100)) : 0;
        return (
          <div key={item.label}>
            <div className="mb-1 flex items-center justify-between gap-4 text-sm">
              <span className="text-slate-700">{item.label}</span>
              <span className="font-medium text-slate-500">{item.count}</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-blue-500"
                style={{ width: `${width}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RunsTrend({ items }: { items: Array<{ day: string; count: number }> }) {
  const max = items.reduce((highest, item) => Math.max(highest, item.count), 0);

  if (!items.length) {
    return <div className="text-sm text-slate-500">No recent run history yet.</div>;
  }

  return (
    <div className="flex items-end gap-3 overflow-x-auto">
      {items.map((item) => {
        const height = max ? Math.max(16, Math.round((item.count / max) * 140)) : 16;
        return (
          <div key={item.day} className="flex min-w-[48px] flex-col items-center gap-2">
            <div className="text-xs text-slate-500">{item.count}</div>
            <div
              className="w-8 rounded-t-xl bg-blue-500"
              style={{ height }}
            />
            <div className="text-center text-[11px] text-slate-400">
              {item.day.slice(5)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default function ObservatoryPage() {
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        const response = await fetch("/api/observatory", {
          method: "GET",
          cache: "no-store",
        });

        const data = (await response.json()) as ObservatoryResponse | { ok: false; error: string };

        if (!response.ok || !("ok" in data) || !data.ok) {
          throw new Error("error" in data ? data.error : "Failed to load observatory data.");
        }

        if (!cancelled) {
          setState({ status: "ready", data });
        }
      } catch (error) {
        if (!cancelled) {
          setState({
            status: "error",
            message: error instanceof Error ? error.message : "Unknown observatory error.",
          });
        }
      }
    }

    void loadData();
    const interval = setInterval(() => {
      void loadData();
    }, 10000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  if (state.status === "loading") {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-6 lg:px-6">
        <div className="mx-auto max-w-7xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="text-lg font-semibold text-slate-900">Loading observatory…</div>
          <div className="mt-2 text-sm text-slate-500">
            Gathering technical, quality, and usage signals.
          </div>
        </div>
      </main>
    );
  }

  if (state.status === "error") {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-6 lg:px-6">
        <div className="mx-auto max-w-7xl rounded-3xl border border-red-200 bg-red-50 p-8 shadow-sm">
          <div className="text-lg font-semibold text-red-700">Observatory unavailable</div>
          <div className="mt-2 text-sm text-red-600">{state.message}</div>
        </div>
      </main>
    );
  }

  const { data } = state;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 lg:px-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
            Internal observatory
          </div>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight text-slate-900">
            AI Operations Dashboard
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-500">
            One-page control room for system health, output quality, and usage patterns.
          </p>
        </section>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total runs" value={data.summary.totalRuns} helper="Last 30 days" />
          <StatCard
            label="Success rate"
            value={`${data.summary.successRate}%`}
            helper="Completed runs only"
          />
          <StatCard
            label="Average stars"
            value={data.summary.avgStars || "–"}
            helper="Feedback-based quality signal"
          />
          <StatCard
            label="Active users"
            value={data.summary.activeUsers30d}
            helper="Distinct users in 30 days"
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
          <Panel
            title="Technical health"
            subtitle="Run outcomes, degraded reasons, and stage reliability."
          >
            <div className="grid gap-4 md:grid-cols-4">
              <StatCard label="Runs today" value={data.summary.runsToday} />
              <StatCard label="Completed" value={data.summary.completedRuns} />
              <StatCard label="With limitations" value={data.summary.limitedRuns} />
              <StatCard label="Failed" value={data.summary.failedRuns} />
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <div>
                <div className="mb-3 text-sm font-semibold text-slate-900">Top degraded reasons</div>
                <SimpleBarList
                  items={data.technical.degradedReasons}
                  emptyLabel="No degraded runs recorded yet."
                />
              </div>

              <div>
                <div className="mb-3 text-sm font-semibold text-slate-900">Stage reliability</div>
                <div className="space-y-3">
                  {data.technical.stageReliability.length ? (
                    data.technical.stageReliability.map((stage) => {
                      const total = stage.success + stage.partial + stage.error || 1;
                      const successWidth = (stage.success / total) * 100;
                      const partialWidth = (stage.partial / total) * 100;
                      const errorWidth = (stage.error / total) * 100;

                      return (
                        <div key={stage.stage}>
                          <div className="mb-1 flex items-center justify-between text-sm">
                            <span className="text-slate-700">{stage.stage}</span>
                            <span className="text-slate-500">
                              {stage.success}/{total} success
                            </span>
                          </div>
                          <div className="flex h-3 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="bg-green-500"
                              style={{ width: `${successWidth}%` }}
                            />
                            <div
                              className="bg-amber-400"
                              style={{ width: `${partialWidth}%` }}
                            />
                            <div
                              className="bg-red-500"
                              style={{ width: `${errorWidth}%` }}
                            />
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-sm text-slate-500">No stage telemetry yet.</div>
                  )}
                </div>
              </div>
            </div>
          </Panel>

          <Panel
            title="Output quality"
            subtitle="Human feedback and recent weak-output signals."
          >
            <div className="grid gap-4 md:grid-cols-3">
              <StatCard label="Average stars" value={data.summary.avgStars || "–"} />
              <StatCard label="Low-rated runs" value={data.summary.lowRatedCount} />
              <StatCard label="High-rated runs" value={data.summary.highRatedCount} />
            </div>

            <div className="mt-6">
              <div className="mb-3 text-sm font-semibold text-slate-900">Latest feedback</div>
              <div className="overflow-hidden rounded-2xl border border-slate-200">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-medium">When</th>
                      <th className="px-4 py-3 font-medium">Run</th>
                      <th className="px-4 py-3 font-medium">Stage</th>
                      <th className="px-4 py-3 font-medium">Stars</th>
                      <th className="px-4 py-3 font-medium">Comment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.quality.latestFeedback.length ? (
                      data.quality.latestFeedback.map((item) => (
                        <tr key={`${item.runId}-${item.createdAt}`} className="border-t border-slate-100">
                          <td className="px-4 py-3 text-slate-600">{formatDateTime(item.createdAt)}</td>
                          <td className="px-4 py-3 font-mono text-xs text-slate-600">{item.runId}</td>
                          <td className="px-4 py-3 text-slate-600">{item.stage}</td>
                          <td className="px-4 py-3 font-semibold text-slate-900">{item.stars}</td>
                          <td className="px-4 py-3 text-slate-600">{item.comment || "–"}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                          No feedback submitted yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </Panel>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.05fr_1.15fr]">
          <Panel
            title="Usage and market signals"
            subtitle="Run volume, language mix, and input behavior."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <StatCard label="Users today" value={data.summary.activeUsersToday} />
              <StatCard label="Avg stage time" value={`${data.summary.avgStageDurationMs} ms`} />
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <div>
                <div className="mb-3 text-sm font-semibold text-slate-900">Runs by language</div>
                <SimpleBarList
                  items={data.market.byLanguage}
                  emptyLabel="No language data yet."
                />
              </div>

              <div>
                <div className="mb-3 text-sm font-semibold text-slate-900">Runs by input type</div>
                <SimpleBarList
                  items={data.market.byInputType}
                  emptyLabel="No input type data yet."
                />
              </div>
            </div>

            <div className="mt-6">
              <div className="mb-3 text-sm font-semibold text-slate-900">Runs over time</div>
              <RunsTrend items={data.market.runsPerDay} />
            </div>
          </Panel>

          <Panel
            title="Review queue"
            subtitle="Latest runs to inspect manually when quality or reliability drops."
          >
            <div className="overflow-hidden rounded-2xl border border-slate-200">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">When</th>
                    <th className="px-4 py-3 font-medium">Run</th>
                    <th className="px-4 py-3 font-medium">Outcome</th>
                    <th className="px-4 py-3 font-medium">Stars</th>
                    <th className="px-4 py-3 font-medium">Reasons</th>
                  </tr>
                </thead>
                <tbody>
                  {data.reviewQueue.length ? (
                    data.reviewQueue.map((item) => (
                      <tr key={`${item.runId}-${item.createdAt}`} className="border-t border-slate-100 align-top">
                        <td className="px-4 py-3 text-slate-600">{formatDateTime(item.createdAt)}</td>
                        <td className="px-4 py-3">
                          <div className="font-mono text-xs text-slate-700">{item.runId}</div>
                          <div className="mt-1 text-xs text-slate-400">
                            {item.language} · {item.inputType}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-700">{item.outcome}</td>
                        <td className="px-4 py-3 font-semibold text-slate-900">
                          {item.stars ?? "–"}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {item.degradedReasons.length ? item.degradedReasons.join(", ") : "–"}
                          {item.comment ? (
                            <div className="mt-1 text-xs text-slate-400">{item.comment}</div>
                          ) : null}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                        No runs recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>
      </div>
    </main>
  );
}