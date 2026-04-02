"use client";

import { type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import AppCard from "@/components/ui/AppCard";
import SectionLabel from "@/components/ui/SectionLabel";
import { useWorkspace } from "@/components/workspace/WorkspaceProvider";
import type {
  WorkspaceInsights,
  WorkspaceRequirementAnalysisItem,
} from "@/lib/workspace/types";
import { designTokens } from "@/lib/design/tokens";

const t = designTokens;

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object"
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

function formatUnknownAsLines(value: unknown): string {
  if (typeof value === "string") return value;

  if (Array.isArray(value)) {
    const lines = value
      .map((item) => {
        if (typeof item === "string") return item;
        if (item == null) return null;
        return stringifyUnknown(item);
      })
      .filter((item): item is string => Boolean(item));

    return lines.join("\n");
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;

    const directText =
      asString(record.summary) ||
      asString(record.rationale) ||
      asString(record.message) ||
      asString(record.decision) ||
      asString(record.positioningStrategy);

    if (directText) return directText;
  }

  return stringifyUnknown(value);
}

function extractSelectedEvidence(insights: WorkspaceInsights | null): string[] {
  const record = asRecord(insights);
  if (!record) return [];

  const candidates = [
    record.selectedEvidence,
    record.evidenceSelection,
    asRecord(record.bundle)?.selectedEvidence,
  ];

  for (const candidate of candidates) {
    const direct = asStringArray(candidate);
    if (direct.length) return direct;

    if (Array.isArray(candidate)) {
      const flattened = candidate
        .map((item) => {
          if (typeof item === "string") return item;
          if (item && typeof item === "object") {
            const obj = item as Record<string, unknown>;
            return (
              asString(obj.claim) ||
              asString(obj.evidence) ||
              asString(obj.summary) ||
              asString(obj.label) ||
              stringifyUnknown(item)
            );
          }
          return null;
        })
        .filter((item): item is string => Boolean(item));

      if (flattened.length) return flattened;
    }

    if (candidate && typeof candidate === "object") {
      const obj = candidate as Record<string, unknown>;
      const items = [
        ...asStringArray(obj.items),
        ...asStringArray(obj.evidence),
        ...asStringArray(obj.claims),
      ];

      if (items.length) return items;
    }
  }

  return [];
}

function extractPositioningBrief(insights: WorkspaceInsights | null): string {
  if (!insights) return "No positioning brief yet.";

  const direct =
    asString(insights.positioningBrief) ||
    asString(insights.positioningStrategy) ||
    asString(asRecord(insights.positioningBrief)?.positioningStrategy) ||
    asString(asRecord(insights.positioningBrief)?.coverLetterAngle);

  if (direct) return direct;

  const whyFit = asStringArray(asRecord(insights.positioningBrief)?.coreWhyFit);
  if (whyFit.length) {
    return whyFit.map((item) => `• ${item}`).join("\n");
  }

  return "No positioning brief yet.";
}

function extractCompanyContext(insights: WorkspaceInsights | null): string {
  if (!insights) return "No company context yet.";

  const companyContext =
    insights.companyContext ??
    asRecord(insights.bundle)?.companyContext ??
    null;

  if (!companyContext) return "No company context yet.";

  return formatUnknownAsLines(companyContext);
}

function extractRecommendation(insights: WorkspaceInsights | null): string {
  if (!insights) return "No recommendation yet.";

  const direct =
    insights.advisorMessage ||
    insights.reasoningSummary ||
    asString(insights.recommendation);

  if (direct) return direct;

  const recommendation =
    insights.recommendation ?? asRecord(insights.bundle)?.recommendation ?? null;

  if (!recommendation) return "No recommendation yet.";

  return formatUnknownAsLines(recommendation);
}

function extractMissingSignals(insights: WorkspaceInsights | null): string[] {
  if (!insights) return [];

  const candidates = [
    insights.missingSignals,
    insights.riskAreas,
    insights.blockers,
    asStringArray(asRecord(insights.recommendation)?.risks),
    asStringArray(asRecord(insights.positioningBrief)?.positioningRisks),
  ];

  for (const candidate of candidates) {
    if (candidate?.length) return candidate;
  }

  return [];
}

function extractDebugSnapshot(insights: WorkspaceInsights | null): string {
  if (!insights) return "No internal reasoning snapshot yet.";
  return stringifyUnknown(insights.rawResponse ?? insights);
}

function getRecommendationLabel(
  value: WorkspaceInsights["applicationRecommendation"],
): string {
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
      return "Not available yet";
  }
}

function getImportanceLabel(
  value: WorkspaceRequirementAnalysisItem["importance"],
): string {
  switch (value) {
    case "blocker":
      return "Blocker";
    case "core":
      return "Core";
    case "supporting":
      return "Supporting";
    case "preferred":
      return "Preferred";
    default:
      return value;
  }
}

function getMatchLabel(
  value: WorkspaceRequirementAnalysisItem["matchStatus"],
): string {
  switch (value) {
    case "matched":
      return "Matched";
    case "adjacent":
      return "Adjacent";
    case "weak":
      return "Weak";
    case "missing":
      return "Missing";
    default:
      return value;
  }
}

export default function WorkspaceInsightsPage() {
  const router = useRouter();
  const { state, progress } = useWorkspace();

  const selectedEvidence = extractSelectedEvidence(state.insights);
  const companyContext = extractCompanyContext(state.insights);
  const positioningBrief = extractPositioningBrief(state.insights);
  const missingSignals = extractMissingSignals(state.insights);
  const recommendation = extractRecommendation(state.insights);
  const debugSnapshot = extractDebugSnapshot(state.insights);
  const requirementsAnalysis = state.insights?.requirementsAnalysis ?? [];
  const strongMatches = state.insights?.strongMatches ?? [];
  const stretchMatches = state.insights?.stretchMatches ?? [];
  const blockers = state.insights?.blockers ?? [];
  const recommendationLabel = getRecommendationLabel(
    state.insights?.applicationRecommendation,
  );

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
          Review the reasoning, evidence, and application posture before moving
          to final document generation.
        </p>

        {state.insightsError ? (
          <div style={errorBannerStyle}>{state.insightsError}</div>
        ) : null}
      </AppCard>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.1fr) minmax(320px, 0.9fr)",
          gap: 20,
          alignItems: "start",
        }}
      >
        <div style={{ display: "grid", gap: 20 }}>
          <AppCard className="p-6">
            <h2 style={titleStyle}>Selected evidence</h2>
            <p style={copyStyle}>
              Evidence currently supporting the candidate&apos;s positioning for
              this role.
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

          <AppCard className="p-6">
            <h2 style={titleStyle}>Requirement analysis</h2>
            <p style={copyStyle}>
              Requirement-by-requirement view of fit, adjacency, and risk.
            </p>

            {requirementsAnalysis.length ? (
              <div style={{ display: "grid", gap: 12, marginTop: 14 }}>
                {requirementsAnalysis.map((item, index) => (
                  <div key={`${item.requirement}-${index}`} style={analysisRowStyle}>
                    <div style={analysisHeaderStyle}>
                      <span style={analysisBadgeStyle}>
                        {getImportanceLabel(item.importance)}
                      </span>
                      <span style={analysisBadgeStyle}>
                        {getMatchLabel(item.matchStatus)}
                      </span>
                    </div>
                    <div style={analysisTitleStyle}>{item.requirement}</div>
                    <div style={analysisNotesStyle}>{item.notes}</div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyBlock text="No requirement analysis available yet." />
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
              Raw workspace intelligence is visible here, not on the Final page.
            </p>

            <pre style={{ ...preBlockStyle, marginTop: 14 }}>
              {debugSnapshot}
            </pre>
          </AppCard>
        </div>

        <div style={{ display: "grid", gap: 20 }}>
          <AppCard className="p-6">
            <h2 style={titleStyle}>Positioning brief</h2>
            <p style={copyStyle}>
              The current narrative direction for how the candidate should be
              positioned.
            </p>

            <div style={{ ...contentBlockStyle, marginTop: 14 }}>
              {positioningBrief}
            </div>
          </AppCard>

          <AppCard className="p-6" soft>
            <h2 style={titleStyle}>Recommendation</h2>
            <p style={copyStyle}>
              Current recommendation generated by the pipeline.
            </p>

            <div style={{ ...contentBlockStyle, marginTop: 14 }}>
              {recommendation}
            </div>

            <div style={{ marginTop: 14 }}>
              <StatusLine label="Application posture" value={recommendationLabel} />
            </div>
          </AppCard>

          <AppCard className="p-6" soft>
            <h2 style={titleStyle}>Strengths and risks</h2>

            <div style={{ display: "grid", gap: 16, marginTop: 14 }}>
              <MiniListBlock
                title="Strong matches"
                items={strongMatches}
                emptyText="No strong matches recorded yet."
              />
              <MiniListBlock
                title="Stretch matches"
                items={stretchMatches}
                emptyText="No stretch matches recorded yet."
              />
              <MiniListBlock
                title="Missing signals"
                items={missingSignals}
                emptyText="No missing signals recorded yet."
              />
              <MiniListBlock
                title="Blockers"
                items={blockers}
                emptyText="No blockers recorded yet."
              />
            </div>
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

            <button
              type="button"
              onClick={() => router.push("/workspace/final")}
              style={{
                ...primaryButtonStyle,
                width: "100%",
                marginTop: 16,
              }}
              disabled={!progress.profileReady || !progress.jobReady}
            >
              Continue to final
            </button>
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

function MiniListBlock({
  title,
  items,
  emptyText,
}: {
  title: string;
  items: string[];
  emptyText: string;
}) {
  return (
    <div>
      <div style={miniTitleStyle}>{title}</div>
      {items.length ? (
        <ul style={{ ...listStyle, marginTop: 8 }}>
          {items.map((item, index) => (
            <li key={`${title}-${item}-${index}`}>{item}</li>
          ))}
        </ul>
      ) : (
        <div style={{ ...emptyMiniStyle, marginTop: 8 }}>{emptyText}</div>
      )}
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

const miniTitleStyle: CSSProperties = {
  fontSize: 13,
  fontWeight: 800,
  color: t.colors.textPrimary,
  letterSpacing: "0.01em",
  textTransform: "uppercase",
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

const analysisRowStyle: CSSProperties = {
  borderRadius: t.radius.md,
  border: `1px solid ${t.colors.border}`,
  background: t.colors.surface,
  padding: 14,
  display: "grid",
  gap: 8,
};

const analysisHeaderStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
};

const analysisBadgeStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  height: 24,
  padding: "0 10px",
  borderRadius: 999,
  border: `1px solid ${t.colors.border}`,
  background: t.colors.backgroundSoft,
  fontSize: 12,
  fontWeight: 700,
  color: t.colors.textSecondary,
};

const analysisTitleStyle: CSSProperties = {
  fontSize: 15,
  fontWeight: 700,
  color: t.colors.textPrimary,
  lineHeight: 1.5,
};

const analysisNotesStyle: CSSProperties = {
  fontSize: 14,
  lineHeight: 1.7,
  color: t.colors.textSecondary,
};

const emptyMiniStyle: CSSProperties = {
  borderRadius: t.radius.sm,
  border: `1px solid ${t.colors.border}`,
  background: t.colors.surface,
  padding: 12,
  fontSize: 13,
  lineHeight: 1.6,
  color: t.colors.textSecondary,
};

const errorBannerStyle: CSSProperties = {
  marginTop: 16,
  borderRadius: t.radius.md,
  border: `1px solid ${t.colors.border}`,
  background: t.colors.backgroundSoft,
  padding: 14,
  fontSize: 14,
  lineHeight: 1.6,
  color: t.colors.textPrimary,
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
  cursor: "pointer",
};