"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import AppCard from "@/components/ui/AppCard";
import SectionLabel from "@/components/ui/SectionLabel";
import { useWorkspace } from "@/components/workspace/WorkspaceProvider";
import { designTokens } from "@/lib/design/tokens";

const t = designTokens;

type DebugView = "overview" | "state" | "pipeline" | "artifacts" | "raw";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function stringifyUnknown(value: unknown): string {
  if (typeof value === "string") return value;
  if (value == null) return "";
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function pickFirstDefined(...values: unknown[]): unknown {
  for (const value of values) {
    if (value !== undefined && value !== null) return value;
  }
  return null;
}

function getWorkspaceRecord(state: unknown): Record<string, unknown> {
  return asRecord(state) ?? {};
}

function getInsightsBundle(state: unknown): Record<string, unknown> {
  const record = getWorkspaceRecord(state);
  const insights = asRecord(record.insights);
  return asRecord(insights?.bundle) ?? {};
}

function getJobProfile(state: unknown): unknown {
  const record = getWorkspaceRecord(state);
  const bundle = getInsightsBundle(state);

  return pickFirstDefined(
    record.jobProfile,
    bundle.jobProfile,
    bundle.structuredJob,
  );
}

function getInsights(state: unknown): unknown {
  const record = getWorkspaceRecord(state);
  return record.insights;
}

function getFinalDrafts(state: unknown): unknown {
  const record = getWorkspaceRecord(state);
  return record.finalDrafts;
}

function getTelemetry(state: unknown): unknown {
  const record = getWorkspaceRecord(state);
  return record.telemetry;
}

function getPipelineTrace(state: unknown): string[] {
  const telemetry = asRecord(getTelemetry(state));
  return asStringArray(telemetry?.pipelineTrace);
}

function getRunSummary(state: unknown) {
  const record = getWorkspaceRecord(state);
  const telemetry = asRecord(record.telemetry);
  const insights = asRecord(record.insights);
  const finalDrafts = asRecord(record.finalDrafts);

  return {
    candidateProfilePresent: Boolean(record.candidateProfile),
    jobProfilePresent: Boolean(record.jobProfile),
    insightsPresent: Boolean(record.insights),
    finalDraftsPresent: Boolean(record.finalDrafts),
    telemetryPresent: Boolean(record.telemetry),
    runId:
      asString(telemetry?.runId) ||
      asString(finalDrafts?.runId) ||
      "Not available",
    outcome: asString(telemetry?.outcome) || "Not available",
    applicationRecommendation:
      asString(insights?.applicationRecommendation) || "Not available",
  };
}

export default function WorkspaceDebugPage() {
  const router = useRouter();
  const { state, progress } = useWorkspace();
  const [view, setView] = useState<DebugView>("overview");

  const workspaceRecord = getWorkspaceRecord(state);
  const jobProfile = getJobProfile(state);
  const insights = getInsights(state);
  const finalDrafts = getFinalDrafts(state);
  const telemetry = getTelemetry(state);
  const pipelineTrace = getPipelineTrace(state);
  const bundle = getInsightsBundle(state);
  const runSummary = getRunSummary(state);

  const rawSnapshot = useMemo(
    () =>
      stringifyUnknown({
        workspaceState: state,
        jobProfile,
        insights,
        finalDrafts,
        telemetry,
        bundle,
      }),
    [state, jobProfile, insights, finalDrafts, telemetry, bundle],
  );

  const statusCards = [
    {
      label: "Candidate profile",
      value: runSummary.candidateProfilePresent ? "Present" : "Missing",
      active: runSummary.candidateProfilePresent,
    },
    {
      label: "Job profile",
      value: runSummary.jobProfilePresent ? "Present" : "Missing",
      active: runSummary.jobProfilePresent,
    },
    {
      label: "Insights",
      value: runSummary.insightsPresent ? "Present" : "Missing",
      active: runSummary.insightsPresent,
    },
    {
      label: "Final drafts",
      value: runSummary.finalDraftsPresent ? "Present" : "Missing",
      active: runSummary.finalDraftsPresent,
    },
    {
      label: "Telemetry",
      value: runSummary.telemetryPresent ? "Present" : "Missing",
      active: runSummary.telemetryPresent,
    },
  ];

  return (
    <div
      style={{
        display: "grid",
        gap: 20,
      }}
    >
      <AppCard className="p-6">
        <SectionLabel tone="blue">Debug</SectionLabel>

        <h1
          style={{
            margin: "14px 0 0",
            fontSize: 32,
            lineHeight: 1.15,
            letterSpacing: "-0.03em",
            color: t.colors.textPrimary,
          }}
        >
          Workspace debug console
        </h1>

        <p
          style={{
            margin: "12px 0 0",
            maxWidth: 980,
            fontSize: 15,
            lineHeight: 1.7,
            color: t.colors.textSecondary,
          }}
        >
          This page helps identify where the system is failing to store,
          transfer, or expose data between Profile, Job, Insights, and Final.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 10,
            marginTop: 18,
          }}
        >
          {statusCards.map((item) => (
            <div
              key={item.label}
              style={{
                borderRadius: t.radius.md,
                border: `1px solid ${t.colors.border}`,
                background: item.active ? t.colors.surface : t.colors.backgroundSoft,
                padding: 12,
                display: "grid",
                gap: 4,
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  letterSpacing: "0.02em",
                  textTransform: "uppercase",
                  color: t.colors.textMuted,
                }}
              >
                {item.label}
              </div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: t.colors.textPrimary,
                }}
              >
                {item.value}
              </div>
            </div>
          ))}
        </div>
      </AppCard>

      <AppCard className="p-4">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {[
            { key: "overview", label: "Overview" },
            { key: "state", label: "State" },
            { key: "pipeline", label: "Pipeline" },
            { key: "artifacts", label: "Artifacts" },
            { key: "raw", label: "Raw" },
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setView(item.key as DebugView)}
              style={{
                borderRadius: 999,
                padding: "6px 14px",
                border:
                  view === item.key
                    ? `1px solid ${t.colors.primary}`
                    : `1px solid ${t.colors.border}`,
                background:
                  view === item.key ? t.colors.primary : t.colors.surface,
                color:
                  view === item.key
                    ? t.colors.textOnPrimary
                    : t.colors.textPrimary,
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      </AppCard>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.06fr) minmax(320px, 0.94fr)",
          gap: 20,
          alignItems: "start",
        }}
      >
        <div style={{ display: "grid", gap: 20 }}>
          {(view === "overview" || view === "state") && (
            <>
              <AppCard className="p-6">
                <h2 style={titleStyle}>Run summary</h2>
                <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
                  <StatusLine label="Run ID" value={runSummary.runId} />
                  <StatusLine label="Outcome" value={runSummary.outcome} />
                  <StatusLine
                    label="Application recommendation"
                    value={runSummary.applicationRecommendation}
                  />
                  <StatusLine
                    label="Profile status"
                    value={state.profileStatus}
                  />
                  <StatusLine label="Job status" value={state.jobStatus} />
                  <StatusLine
                    label="Insights status"
                    value={state.insightsStatus}
                  />
                  <StatusLine label="Final status" value={state.finalStatus} />
                </div>
              </AppCard>

              <AppCard className="p-6">
                <h2 style={titleStyle}>Workspace progress</h2>
                <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
                  <StatusLine
                    label="Profile ready"
                    value={progress.profileReady ? "Yes" : "No"}
                  />
                  <StatusLine
                    label="Job ready"
                    value={progress.jobReady ? "Yes" : "No"}
                  />
                  <StatusLine
                    label="Insights ready"
                    value={progress.insightsReady ? "Yes" : "No"}
                  />
                  <StatusLine
                    label="Final ready"
                    value={progress.finalReady ? "Yes" : "No"}
                  />
                  <StatusLine label="Next step" value={progress.nextStep} />
                </div>
              </AppCard>
            </>
          )}

          {(view === "overview" || view === "artifacts") && (
            <>
              <ArtifactCard
                title="Job profile"
                copy="This is the stored job object in workspace memory."
                value={jobProfile}
              />
              <ArtifactCard
                title="Insights object"
                copy="This is the stored insights object in workspace memory."
                value={insights}
              />
              <ArtifactCard
                title="Final drafts"
                copy="This is the stored final drafts object in workspace memory."
                value={finalDrafts}
              />
              <ArtifactCard
                title="Reasoning bundle"
                copy="This is the bundle currently exposed through insights."
                value={bundle}
              />
            </>
          )}

          {(view === "overview" || view === "pipeline") && (
            <ArtifactCard
              title="Pipeline trace"
              copy="This shows which pipeline stages ran and whether telemetry captured them."
              value={pipelineTrace}
            />
          )}

          {view === "raw" && (
            <AppCard className="p-6">
              <h2 style={titleStyle}>Raw workspace snapshot</h2>
              <p style={copyStyle}>
                Full workspace state snapshot for failure isolation.
              </p>
              <pre style={{ ...preBlockStyle, marginTop: 14 }}>{rawSnapshot}</pre>
            </AppCard>
          )}
        </div>

        <div style={{ display: "grid", gap: 20 }}>
          {(view === "overview" || view === "state") && (
            <>
              <ArtifactCard
                title="Candidate profile"
                copy="Profile object currently available in workspace memory."
                value={workspaceRecord.candidateProfile}
                soft
              />
              <ArtifactCard
                title="Telemetry"
                copy="Run telemetry currently available in workspace memory."
                value={telemetry}
                soft
              />
            </>
          )}

          {(view === "overview" || view === "pipeline") && (
            <AppCard className="p-6" soft>
              <h2 style={titleStyle}>Pipeline diagnostics</h2>
              <p style={copyStyle}>
                Quick checks to identify where the handoff is breaking.
              </p>

              <div style={{ display: "grid", gap: 12, marginTop: 14 }}>
                <DiagnosticRow
                  label="Was a job analysis saved?"
                  value={runSummary.jobProfilePresent ? "Yes" : "No"}
                  good={runSummary.jobProfilePresent}
                />
                <DiagnosticRow
                  label="Were insights saved?"
                  value={runSummary.insightsPresent ? "Yes" : "No"}
                  good={runSummary.insightsPresent}
                />
                <DiagnosticRow
                  label="Were final drafts saved?"
                  value={runSummary.finalDraftsPresent ? "Yes" : "No"}
                  good={runSummary.finalDraftsPresent}
                />
                <DiagnosticRow
                  label="Was telemetry saved?"
                  value={runSummary.telemetryPresent ? "Yes" : "No"}
                  good={runSummary.telemetryPresent}
                />
                <DiagnosticRow
                  label="Was pipeline trace captured?"
                  value={pipelineTrace.length ? "Yes" : "No"}
                  good={pipelineTrace.length > 0}
                />
              </div>
            </AppCard>
          )}

          {(view === "overview" || view === "state") && (
            <AppCard className="p-6">
              <h2 style={titleStyle}>Navigation</h2>
              <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
                <button
                  type="button"
                  onClick={() => router.push("/workspace/job")}
                  style={secondaryButtonStyle}
                >
                  Back to Job
                </button>
                <button
                  type="button"
                  onClick={() => router.push("/workspace/insights")}
                  style={secondaryButtonStyle}
                >
                  Open Insights
                </button>
                <button
                  type="button"
                  onClick={() => router.push("/workspace/final")}
                  style={secondaryButtonStyle}
                >
                  Open Final
                </button>
              </div>
            </AppCard>
          )}
        </div>
      </div>
    </div>
  );
}

function ArtifactCard({
  title,
  copy,
  value,
  soft = false,
}: {
  title: string;
  copy: string;
  value: unknown;
  soft?: boolean;
}) {
  const text = value ? stringifyUnknown(value) : "";

  return (
    <AppCard className="p-6" soft={soft}>
      <h2 style={titleStyle}>{title}</h2>
      <p style={copyStyle}>{copy}</p>

      {text ? (
        <pre style={{ ...preBlockStyle, marginTop: 14 }}>{text}</pre>
      ) : (
        <EmptyBlock text={`No ${title.toLowerCase()} available yet.`} />
      )}
    </AppCard>
  );
}

function DiagnosticRow({
  label,
  value,
  good,
}: {
  label: string;
  value: string;
  good: boolean;
}) {
  return (
    <div
      style={{
        borderRadius: t.radius.md,
        border: `1px solid ${t.colors.border}`,
        background: t.colors.surface,
        padding: 12,
        display: "grid",
        gap: 6,
      }}
    >
      <div
        style={{
          fontSize: 13,
          fontWeight: 700,
          color: t.colors.textMuted,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 14,
          fontWeight: 800,
          color: good ? t.colors.textPrimary : t.colors.textSecondary,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function EmptyBlock({ text }: { text: string }) {
  return (
    <div
      style={{
        marginTop: 14,
        borderRadius: t.radius.md,
        border: `1px solid ${t.colors.border}`,
        background: t.colors.backgroundSoft,
        padding: 16,
        fontSize: 14,
        lineHeight: 1.6,
        color: t.colors.textSecondary,
      }}
    >
      {text}
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

const preBlockStyle: CSSProperties = {
  borderRadius: t.radius.md,
  border: `1px solid ${t.colors.border}`,
  background: t.colors.surface,
  padding: 16,
  fontSize: 13,
  lineHeight: 1.7,
  color: t.colors.textSecondary,
  whiteSpace: "pre-wrap",
  overflowX: "auto",
};

const secondaryButtonStyle: CSSProperties = {
  height: 42,
  border: `1px solid ${t.colors.border}`,
  borderRadius: t.radius.sm,
  background: t.colors.surface,
  color: t.colors.textPrimary,
  fontSize: 14,
  fontWeight: 700,
  padding: "0 16px",
  cursor: "pointer",
};