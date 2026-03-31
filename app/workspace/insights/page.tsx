"use client";

import { type CSSProperties } from "react";
import AppCard from "@/components/ui/AppCard";
import SectionLabel from "@/components/ui/SectionLabel";
import { useWorkspace } from "@/components/workspace/WorkspaceProvider";
import { designTokens } from "@/lib/design/tokens";

const t = designTokens;

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
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

function extractSelectedEvidence(insights: unknown): string[] {
  const record = asRecord(insights);
  if (!record) return [];

  return (
    asStringArray(record.selectedEvidence) ||
    asStringArray(record.evidenceSelection) ||
    []
  );
}

function extractMissingSignals(insights: unknown): string[] {
  const record = asRecord(insights);
  if (!record) return [];

  return (
    asStringArray(record.missingSignals) ||
    asStringArray(record.riskAreas) ||
    asStringArray(record.blockers) ||
    []
  );
}

function extractPositioningBrief(insights: unknown): string {
  const record = asRecord(insights);
  if (!record) return "No positioning brief yet.";

  const direct =
    asString(record.positioningBrief) ||
    asString(record.positioningStrategy) ||
    asString(record.summary);

  if (direct) return direct;

  return "No positioning brief yet.";
}

function extractCompanyContext(insights: unknown): string {
  const record = asRecord(insights);
  if (!record) return "No company context yet.";

  const companyContext =
    record.companyContext ??
    record.companyAndRoleContext ??
    record.contextSummary ??
    null;

  if (!companyContext) return "No company context yet.";

  if (typeof companyContext === "string") {
    return companyContext;
  }

  return stringifyUnknown(companyContext);
}

function extractDebugSnapshot(insights: unknown): string {
  const record = asRecord(insights);
  if (!record) return "No internal reasoning snapshot yet.";

  return stringifyUnknown(record);
}

export default function WorkspaceInsightsPage() {
  const { state, progress } = useWorkspace();

  const selectedEvidence = extractSelectedEvidence(state.insights);
  const companyContext = extractCompanyContext(state.insights);
  const positioningBrief = extractPositioningBrief(state.insights);
  const missingSignals = extractMissingSignals(state.insights);
  const debugSnapshot = extractDebugSnapshot(state.insights);

  return (
    <div
      style={{
        display: "grid",
        gap: 20,
      }}
    >
      <AppCard className="p-6">
        <SectionLabel tone="blue">Insights</SectionLabel>

        <h1
          style={{
            margin: "14px 0 0",
            fontSize: 32,
            lineHeight: 1.15,
            letterSpacing: "-0.03em",
            color: t.colors.textPrimary,
          }}
        >
          Positioning and evidence
        </h1>

        <p
          style={{
            margin: "12px 0 0",
            maxWidth: 940,
            fontSize: 15,
            lineHeight: 1.7,
            color: t.colors.textSecondary,
          }}
        >
          This page is the internal reasoning view for the workspace. It helps explain
          fit, evidence, positioning, and missing signals before final document generation.
        </p>
      </AppCard>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.1fr 0.9fr",
          gap: 20,
          alignItems: "start",
        }}
      >
        <div style={{ display: "grid", gap: 20 }}>
          <AppCard className="p-6">
            <h2 style={titleStyle}>Selected evidence</h2>
            <p style={copyStyle}>
              Evidence that currently supports the candidate’s positioning for this role.
            </p>

            {selectedEvidence.length ? (
              <ul style={listStyle}>
                {selectedEvidence.map((item, index) => (
                  <li key={`${item}-${index}`}>{item}</li>
                ))}
              </ul>
            ) : (
              <EmptyBlock text="No evidence selected yet." />
            )}
          </AppCard>

          <AppCard className="p-6" soft>
            <h2 style={titleStyle}>Company context</h2>
            <p style={copyStyle}>
              Signals inferred from the company and role environment.
            </p>

            <div style={{ ...contentBlockStyle, marginTop: 14 }}>
              {companyContext}
            </div>
          </AppCard>

          <AppCard className="p-6">
            <h2 style={titleStyle}>Internal reasoning snapshot</h2>
            <p style={copyStyle}>
              Raw internal workspace intelligence is shown here only, not on the Final page.
            </p>

            <pre style={{ ...preBlockStyle, marginTop: 14 }}>{debugSnapshot}</pre>
          </AppCard>
        </div>

        <div style={{ display: "grid", gap: 20 }}>
          <AppCard className="p-6">
            <h2 style={titleStyle}>Positioning brief</h2>
            <p style={copyStyle}>
              The current narrative direction for how the candidate should be positioned.
            </p>

            <div style={{ ...contentBlockStyle, marginTop: 14 }}>
              {positioningBrief}
            </div>
          </AppCard>

          <AppCard className="p-6" soft>
            <h2 style={titleStyle}>Missing signals</h2>
            <p style={copyStyle}>
              Gaps that may weaken the application or need careful handling.
            </p>

            {missingSignals.length ? (
              <ul style={listStyle}>
                {missingSignals.map((item, index) => (
                  <li key={`${item}-${index}`}>{item}</li>
                ))}
              </ul>
            ) : (
              <EmptyBlock text="No missing signals recorded yet." />
            )}
          </AppCard>

          <AppCard className="p-6">
            <h2 style={titleStyle}>Workspace status</h2>

            <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
              <StatusLine
                label="Profile"
                value={progress.profileReady ? "Ready" : "Missing"}
              />
              <StatusLine
                label="Job"
                value={progress.jobReady ? "Ready" : "Missing"}
              />
              <StatusLine
                label="Insights"
                value={progress.insightsReady ? "Ready" : "Pending"}
              />
              <StatusLine
                label="Final"
                value={progress.finalReady ? "Ready" : "Not ready"}
              />
            </div>
          </AppCard>
        </div>
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

const contentBlockStyle: CSSProperties = {
  borderRadius: t.radius.md,
  border: `1px solid ${t.colors.border}`,
  background: t.colors.surface,
  padding: 16,
  fontSize: 14,
  lineHeight: 1.7,
  color: t.colors.textSecondary,
  minHeight: 120,
  whiteSpace: "pre-wrap",
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

const listStyle: CSSProperties = {
  margin: "14px 0 0",
  paddingLeft: 20,
  color: t.colors.textSecondary,
  fontSize: 14,
  lineHeight: 1.8,
};