"use client";

import { useEffect, useState } from "react";
import { designTokens } from "@/lib/design/tokens";

const t = designTokens;

// ── Shape of /api/observatory response ───────────────────────────────────────

type ObservatorySummary = {
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

type StageReliabilityRow = {
  stage: string;
  success: number;
  partial: number;
  error: number;
};

type DegradedReasonRow = {
  label: string;
  count: number;
};

type LabelCountRow = {
  label: string;
  count: number;
};

type RunsPerDayRow = {
  day: string;
  count: number;
};

type FeedbackRow = {
  createdAt: string;
  runId: string;
  stage: string;
  stars: number;
  comment: string;
};

type ReviewQueueRow = {
  createdAt: string;
  runId: string;
  outcome: string;
  inputType: string;
  language: string;
  geography: string;
  degradedReasons: string[];
  stars: number | null;
  comment: string | null;
};

type ObservatoryData = {
  ok: boolean;
  summary: ObservatorySummary;
  technical: {
    degradedReasons: DegradedReasonRow[];
    stageReliability: StageReliabilityRow[];
  };
  quality: {
    latestFeedback: FeedbackRow[];
  };
  market: {
    byLanguage: LabelCountRow[];
    byInputType: LabelCountRow[];
    runsPerDay: RunsPerDayRow[];
  };
  reviewQueue: ReviewQueueRow[];
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function outcomeColor(outcome: string): string {
  if (outcome === "Completed") return t.colors.success;
  if (outcome === "With limitations") return t.colors.warning;
  if (outcome === "Failed") return t.colors.danger;
  return t.colors.backgroundSoft;
}

function stageTotal(row: StageReliabilityRow): number {
  return row.success + row.partial + row.error;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
}) {
  return (
    <div
      style={{
        background: accent ?? t.colors.surface,
        border: `1px solid ${t.colors.border}`,
        borderRadius: t.radius.md,
        padding: "16px 20px",
        minWidth: 140,
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: t.colors.textMuted,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 28,
          fontWeight: 700,
          color: t.colors.textPrimary,
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 12, color: t.colors.textMuted, marginTop: 4 }}>
          {sub}
        </div>
      )}
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{
        fontSize: 13,
        fontWeight: 700,
        color: t.colors.textMuted,
        textTransform: "uppercase",
        letterSpacing: "0.07em",
        margin: "32px 0 12px",
      }}
    >
      {children}
    </h2>
  );
}

function Table({
  head,
  children,
}: {
  head: string[];
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        overflowX: "auto",
        border: `1px solid ${t.colors.border}`,
        borderRadius: t.radius.md,
      }}
    >
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ background: t.colors.backgroundSoft }}>
            {head.map((h) => (
              <th
                key={h}
                style={{
                  padding: "8px 14px",
                  textAlign: "left",
                  fontWeight: 600,
                  color: t.colors.textSecondary,
                  whiteSpace: "nowrap",
                  borderBottom: `1px solid ${t.colors.border}`,
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function Td({
  children,
  muted,
  mono,
}: {
  children: React.ReactNode;
  muted?: boolean;
  mono?: boolean;
}) {
  return (
    <td
      style={{
        padding: "8px 14px",
        color: muted ? t.colors.textMuted : t.colors.textPrimary,
        fontFamily: mono ? "monospace" : undefined,
        borderBottom: `1px solid ${t.colors.borderSoft}`,
        verticalAlign: "top",
      }}
    >
      {children}
    </td>
  );
}

function Tr({ children }: { children: React.ReactNode }) {
  return <tr style={{ background: t.colors.surface }}>{children}</tr>;
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ObservatoryPage() {
  const [data, setData] = useState<ObservatoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/observatory");
      const json = await res.json();
      if (!json.ok) {
        setError(json.error ?? "Observatory returned an error.");
      } else {
        setData(json as ObservatoryData);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load observatory data.");
    }
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  const pageStyle: React.CSSProperties = {
    padding: "40px 48px",
    maxWidth: 1100,
    background: t.colors.background,
    minHeight: "100vh",
    fontFamily: "inherit",
  };

  if (loading) {
    return (
      <main style={pageStyle}>
        <h1 style={{ color: t.colors.textPrimary }}>Observatory</h1>
        <p style={{ color: t.colors.textMuted, marginTop: 16 }}>Loading…</p>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main style={pageStyle}>
        <h1 style={{ color: t.colors.textPrimary }}>Observatory</h1>
        <p style={{ color: t.colors.danger, marginTop: 16 }}>{error ?? "No data."}</p>
        <button
          onClick={loadData}
          style={{
            marginTop: 16,
            padding: "8px 18px",
            borderRadius: t.radius.sm,
            border: `1px solid ${t.colors.border}`,
            background: t.colors.surface,
            cursor: "pointer",
            fontSize: 13,
          }}
        >
          Retry
        </button>
      </main>
    );
  }

  const { summary, technical, quality, market, reviewQueue } = data;

  return (
    <main style={pageStyle}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 8,
        }}
      >
        <h1 style={{ fontSize: 22, fontWeight: 700, color: t.colors.textPrimary, margin: 0 }}>
          Observatory
        </h1>
        <button
          onClick={loadData}
          style={{
            padding: "6px 16px",
            borderRadius: t.radius.sm,
            border: `1px solid ${t.colors.border}`,
            background: t.colors.surface,
            cursor: "pointer",
            fontSize: 12,
            color: t.colors.textSecondary,
          }}
        >
          Refresh
        </button>
      </div>
      <p style={{ fontSize: 13, color: t.colors.textMuted, margin: "0 0 8px" }}>
        Last 30 days · {summary.totalRuns} runs recorded
      </p>

      {/* ── Summary stats ── */}
      <SectionHeading>Run summary</SectionHeading>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
        <StatCard label="Total runs" value={summary.totalRuns} sub={`${summary.runsToday} today`} />
        <StatCard
          label="Success rate"
          value={`${summary.successRate}%`}
          sub={`${summary.completedRuns} completed`}
          accent={summary.successRate >= 80 ? t.colors.accentGreen : t.colors.accentYellow}
        />
        <StatCard label="With limitations" value={summary.limitedRuns} />
        <StatCard
          label="Failed"
          value={summary.failedRuns}
          accent={summary.failedRuns > 0 ? t.colors.danger : undefined}
        />
        <StatCard
          label="Avg stage duration"
          value={`${summary.avgStageDurationMs} ms`}
        />
        <StatCard
          label="Active users (30d)"
          value={summary.activeUsers30d}
          sub={`${summary.activeUsersToday} today`}
        />
        <StatCard
          label="Avg rating"
          value={summary.avgStars > 0 ? summary.avgStars.toFixed(1) : "—"}
          sub={`${summary.highRatedCount} high · ${summary.lowRatedCount} low`}
        />
      </div>

      {/* ── Stage reliability ── */}
      {technical.stageReliability.length > 0 && (
        <>
          <SectionHeading>Stage reliability</SectionHeading>
          <Table head={["Stage", "Success", "Partial", "Error", "Total", "Pass %"]}>
            {technical.stageReliability.map((row) => {
              const total = stageTotal(row);
              const pct = total > 0 ? Math.round((row.success / total) * 100) : 0;
              return (
                <Tr key={row.stage}>
                  <Td mono>{row.stage}</Td>
                  <Td>{row.success}</Td>
                  <Td muted={row.partial === 0}>{row.partial}</Td>
                  <Td muted={row.error === 0}>{row.error}</Td>
                  <Td muted>{total}</Td>
                  <Td>
                    <span
                      style={{
                        background:
                          pct >= 90
                            ? t.colors.success
                            : pct >= 70
                              ? t.colors.warning
                              : t.colors.danger,
                        padding: "1px 8px",
                        borderRadius: 999,
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      {pct}%
                    </span>
                  </Td>
                </Tr>
              );
            })}
          </Table>
        </>
      )}

      {/* ── Degraded reasons ── */}
      {technical.degradedReasons.length > 0 && (
        <>
          <SectionHeading>Top degraded reasons</SectionHeading>
          <Table head={["Reason", "Count"]}>
            {technical.degradedReasons.map((row) => (
              <Tr key={row.label}>
                <Td>{row.label}</Td>
                <Td>{row.count}</Td>
              </Tr>
            ))}
          </Table>
        </>
      )}

      {/* ── Market breakdown ── */}
      <SectionHeading>Market breakdown</SectionHeading>
      <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
        {market.byLanguage.length > 0 && (
          <div style={{ minWidth: 200, flex: 1 }}>
            <div
              style={{ fontSize: 12, fontWeight: 600, color: t.colors.textMuted, marginBottom: 8 }}
            >
              By language
            </div>
            <Table head={["Language", "Runs"]}>
              {market.byLanguage.map((row) => (
                <Tr key={row.label}>
                  <Td>{row.label}</Td>
                  <Td>{row.count}</Td>
                </Tr>
              ))}
            </Table>
          </div>
        )}
        {market.byInputType.length > 0 && (
          <div style={{ minWidth: 200, flex: 1 }}>
            <div
              style={{ fontSize: 12, fontWeight: 600, color: t.colors.textMuted, marginBottom: 8 }}
            >
              By input type
            </div>
            <Table head={["Type", "Runs"]}>
              {market.byInputType.map((row) => (
                <Tr key={row.label}>
                  <Td>{row.label}</Td>
                  <Td>{row.count}</Td>
                </Tr>
              ))}
            </Table>
          </div>
        )}
        {market.runsPerDay.length > 0 && (
          <div style={{ minWidth: 260, flex: 2 }}>
            <div
              style={{ fontSize: 12, fontWeight: 600, color: t.colors.textMuted, marginBottom: 8 }}
            >
              Runs per day (last 14 days)
            </div>
            <Table head={["Date", "Runs"]}>
              {market.runsPerDay.map((row) => (
                <Tr key={row.day}>
                  <Td>{row.day}</Td>
                  <Td>{row.count}</Td>
                </Tr>
              ))}
            </Table>
          </div>
        )}
      </div>

      {/* ── Review queue ── */}
      {reviewQueue.length > 0 && (
        <>
          <SectionHeading>Recent runs (review queue)</SectionHeading>
          <Table
            head={["When", "Run ID", "Outcome", "Type", "Lang", "Geography", "Stars", "Issues"]}
          >
            {reviewQueue.map((row) => (
              <Tr key={row.runId}>
                <Td muted>{formatDate(row.createdAt)}</Td>
                <Td mono>{row.runId.slice(0, 8)}…</Td>
                <Td>
                  <span
                    style={{
                      background: outcomeColor(row.outcome),
                      padding: "1px 8px",
                      borderRadius: 999,
                      fontSize: 12,
                    }}
                  >
                    {row.outcome}
                  </span>
                </Td>
                <Td muted>{row.inputType}</Td>
                <Td muted>{row.language}</Td>
                <Td muted>{row.geography}</Td>
                <Td>{row.stars != null ? row.stars : "—"}</Td>
                <Td muted>
                  {row.degradedReasons.length > 0
                    ? row.degradedReasons.slice(0, 2).join(", ")
                    : "—"}
                </Td>
              </Tr>
            ))}
          </Table>
        </>
      )}

      {/* ── Latest feedback ── */}
      {quality.latestFeedback.length > 0 && (
        <>
          <SectionHeading>Latest feedback</SectionHeading>
          <Table head={["When", "Run ID", "Stage", "Stars", "Comment"]}>
            {quality.latestFeedback.map((row, i) => (
              <Tr key={`${row.runId}-${i}`}>
                <Td muted>{formatDate(row.createdAt)}</Td>
                <Td mono>{row.runId.slice(0, 8)}…</Td>
                <Td>{row.stage}</Td>
                <Td>{row.stars}</Td>
                <Td muted>{row.comment || "—"}</Td>
              </Tr>
            ))}
          </Table>
        </>
      )}

      {/* Empty state */}
      {reviewQueue.length === 0 && quality.latestFeedback.length === 0 && (
        <p style={{ marginTop: 40, color: t.colors.textMuted, fontSize: 14 }}>
          No runs recorded yet. Complete a full tailoring run to see data here.
        </p>
      )}
    </main>
  );
}
