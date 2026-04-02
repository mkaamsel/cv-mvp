"use client";

import { type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import AppCard from "@/components/ui/AppCard";
import SectionLabel from "@/components/ui/SectionLabel";
import FeedbackStars from "@/components/feedback/FeedbackStars";
import { useWorkspace } from "@/components/workspace/WorkspaceProvider";
import type {
  WorkspaceFinalDrafts,
  WorkspaceInsights,
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

async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // ignore clipboard errors
  }
}

function formatOutputLanguage(value: string | undefined): string {
  if (value === "de") return "German";
  if (value === "en") return "English";
  if (!value) return "English";
  return value;
}

function extractFinalCv(finalDrafts: WorkspaceFinalDrafts | null): string {
  return (
    finalDrafts?.finalCv ||
    finalDrafts?.cvDraft ||
    asString(asRecord(finalDrafts?.drafts)?.finalCv) ||
    asString(asRecord(finalDrafts?.drafts)?.cvDraft) ||
    "No final CV available yet. Analyse a role first."
  );
}

function extractFinalCoverLetter(
  finalDrafts: WorkspaceFinalDrafts | null,
): string {
  return (
    finalDrafts?.finalCoverLetter ||
    finalDrafts?.coverLetterDraft ||
    asString(asRecord(finalDrafts?.drafts)?.finalCoverLetter) ||
    asString(asRecord(finalDrafts?.drafts)?.coverLetterDraft) ||
    "No final cover letter available yet. Analyse a role first."
  );
}

function extractPositioningBrief(insights: WorkspaceInsights | null): string {
  if (!insights) return "No positioning brief available yet.";

  const positioningRecord = asRecord(insights.positioningBrief);

  return (
    asString(insights.positioningBrief) ||
    insights.positioningStrategy ||
    asString(positioningRecord?.positioningStrategy) ||
    asString(positioningRecord?.coverLetterAngle) ||
    (() => {
      const whyFit = asStringArray(positioningRecord?.coreWhyFit);
      return whyFit.length
        ? whyFit.map((item) => `• ${item}`).join("\n")
        : null;
    })() ||
    "No positioning brief available yet."
  );
}

function extractEvidenceSummary(insights: WorkspaceInsights | null): string {
  if (!insights) return "No evidence summary available yet.";

  const directEvidence = [
    insights.selectedEvidence,
    asRecord(insights.bundle)?.selectedEvidence,
  ];

  for (const candidate of directEvidence) {
    const arr = asStringArray(candidate);
    if (arr.length > 0) {
      return arr.map((item) => `• ${item}`).join("\n");
    }
  }

  const selectedEvidenceRecord =
    asRecord(insights.selectedEvidence) ??
    asRecord(asRecord(insights.bundle)?.selectedEvidence);

  if (selectedEvidenceRecord) {
    const items = [
      ...asStringArray(selectedEvidenceRecord.items),
      ...asStringArray(selectedEvidenceRecord.evidence),
      ...asStringArray(selectedEvidenceRecord.claims),
    ];

    if (items.length > 0) {
      return items.map((item) => `• ${item}`).join("\n");
    }
  }

  const strongMatches = insights.strongMatches ?? [];
  if (strongMatches.length > 0) {
    return strongMatches.map((item) => `• ${item}`).join("\n");
  }

  return "No evidence summary available yet.";
}

function extractRecommendation(insights: WorkspaceInsights | null): string {
  if (!insights) return "No recommendation available yet.";

  return (
    insights.advisorMessage ||
    insights.reasoningSummary ||
    asString(insights.recommendation) ||
    asString(asRecord(insights.recommendation)?.summary) ||
    asString(asRecord(insights.recommendation)?.decision) ||
    asString(asRecord(insights.recommendation)?.rationale) ||
    "No recommendation available yet."
  );
}

function extractReviewFindings(finalDrafts: WorkspaceFinalDrafts | null): string {
  if (!finalDrafts) return "No review findings available yet.";

  const findings =
    finalDrafts.reviewFindings ??
    asRecord(finalDrafts.rawResponse)?.reviewFindings ??
    asRecord(finalDrafts.rawResponse)?.review ??
    null;

  if (!findings) return "No review findings available yet.";

  if (typeof findings === "string") return findings;

  if (Array.isArray(findings)) {
    return findings.map((item) => `• ${String(item)}`).join("\n");
  }

  return stringifyUnknown(findings);
}

function extractProfileDiscoverySignals(
  insights: WorkspaceInsights | null,
): string {
  if (!insights) return "No profile discovery signals available yet.";

  const candidates: string[][] = [
  insights?.missingSignals,
  insights?.riskAreas,
  insights?.blockers,
  asStringArray(asRecord(insights?.recommendation)?.risks),
  asStringArray(asRecord(insights?.positioningBrief)?.positioningRisks),
].filter((candidate): candidate is string[] => Array.isArray(candidate));

for (const candidate of candidates) {
  if (candidate.length > 0) {
    return candidate.map((item) => `• ${item}`).join("\n");
  }
}

  return "No profile discovery signals available yet.";
}

function extractRefinementNotes(
  insights: WorkspaceInsights | null,
  finalDrafts: WorkspaceFinalDrafts | null,
): string {
  const parts: string[] = [];

  if (insights?.riskAreas?.length) {
    parts.push("Risk areas:");
    parts.push(...insights.riskAreas.map((item) => `• ${item}`));
  }

  if (insights?.blockers?.length) {
    if (parts.length > 0) parts.push("");
    parts.push("Blockers:");
    parts.push(...insights.blockers.map((item) => `• ${item}`));
  }

  if (finalDrafts?.warnings?.length) {
    if (parts.length > 0) parts.push("");
    parts.push("Warnings:");
    parts.push(...finalDrafts.warnings.map((item) => `• ${item}`));
  }

  const rawWarnings = asRecord(finalDrafts?.rawResponse)?.warnings;
  if (
    !finalDrafts?.warnings?.length &&
    Array.isArray(rawWarnings) &&
    rawWarnings.length > 0
  ) {
    if (parts.length > 0) parts.push("");
    parts.push("Warnings:");
    parts.push(...rawWarnings.map((item) => `• ${String(item)}`));
  }

  return parts.length > 0 ? parts.join("\n") : "No refinement notes yet.";
}

function OutputBlock({
  title,
  subtitle,
  children,
  defaultOpen = false,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details
      open={defaultOpen}
      className="rounded-2xl border border-slate-200 bg-white"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4">
        <div>
          <div className="text-base font-semibold text-slate-900">{title}</div>
          {subtitle ? (
            <div className="mt-1 text-sm text-slate-500">{subtitle}</div>
          ) : null}
        </div>
        <div className="text-sm text-slate-400">Open</div>
      </summary>
      <div className="border-t border-slate-100 px-5 py-5">{children}</div>
    </details>
  );
}

function SummaryPill({ label }: { label: string }) {
  return <span style={pillStyle}>{label}</span>;
}

export default function WorkspaceFinalPage() {
  const { state, progress } = useWorkspace();

  const finalDrafts = state.finalDrafts;
  const finalCv = extractFinalCv(finalDrafts);
  const finalCoverLetter = extractFinalCoverLetter(finalDrafts);

  const outputLanguage = formatOutputLanguage(
    finalDrafts?.outputLanguage || state.jobProfile?.outputLanguage,
  );
  const runId = finalDrafts?.runId || state.telemetry?.runId || "";

  const positioningBrief = extractPositioningBrief(state.insights);
  const evidenceSummary = extractEvidenceSummary(state.insights);
  const recommendation = extractRecommendation(state.insights);
  const reviewFindings = extractReviewFindings(finalDrafts);
  const profileDiscoverySignals = extractProfileDiscoverySignals(state.insights);
  const refinementNotes = extractRefinementNotes(state.insights, finalDrafts);

  const hasFinalDrafts = Boolean(finalDrafts);
  const isReadyForGeneration = progress.profileReady && progress.jobReady;

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <AppCard className="p-6">
        <SectionLabel tone="blue">Final</SectionLabel>

        <h1
          style={{
            margin: "14px 0 0",
            fontSize: 32,
            lineHeight: 1.15,
            letterSpacing: "-0.03em",
            color: t.colors.textPrimary,
          }}
        >
          Final application documents
        </h1>

        <p
          style={{
            margin: "12px 0 0",
            maxWidth: 920,
            fontSize: 15,
            lineHeight: 1.7,
            color: t.colors.textSecondary,
          }}
        >
          This page shows the generated CV and cover letter, together with the
          reasoning that shaped them.
        </p>

        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            marginTop: 16,
          }}
        >
          <SummaryPill label={`Output: ${outputLanguage}`} />
          <SummaryPill
            label={`Status: ${
              hasFinalDrafts
                ? "Ready"
                : state.finalStatus === "loading"
                  ? "Generating"
                  : "Pending"
            }`}
          />
          {runId ? <SummaryPill label={`Run ID: ${runId}`} /> : null}
        </div>

        {state.finalError ? (
          <div style={errorBannerStyle}>{state.finalError}</div>
        ) : null}

        {hasFinalDrafts ? (
          <div style={{ marginTop: 16 }}>
            <FeedbackStars
              runId={runId}
              stage="final_documents"
              prompt={
                outputLanguage === "German"
                  ? "Diesen Schritt bewerten"
                  : "Rate this step"
              }
              locale={outputLanguage === "German" ? "de" : "en"}
            />
          </div>
        ) : null}
      </AppCard>

      {!hasFinalDrafts ? (
        <AppCard className="p-6">
          <div style={emptyStateStyle}>
            {!isReadyForGeneration
              ? "No generated documents yet. Complete the Profile and Job steps first so the final output can be created."
              : "No generated documents yet. Return to the Job step and run the pipeline so the final output is generated into workspace state."}
          </div>

          <div
            style={{
              marginTop: 16,
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <Link href="/workspace/profile" style={secondaryLinkStyle}>
              Open Profile
            </Link>
            <Link href="/workspace/job" style={primaryLinkStyle}>
              Return to Job
            </Link>
            <Link href="/workspace/insights" style={secondaryLinkStyle}>
              Open Insights
            </Link>
          </div>
        </AppCard>
      ) : (
        <>
          <OutputBlock
            title="Final CV"
            subtitle="Primary CV output for the analysed role."
            defaultOpen
          >
            <div style={headerRowStyle}>
              <div style={smallMutedStyle}>
                Generated and stored in workspace state.
              </div>
              <button
                type="button"
                onClick={() => void copy(finalCv)}
                style={secondaryButtonStyle}
              >
                Copy CV
              </button>
            </div>
            <pre style={preStyle}>{finalCv}</pre>
          </OutputBlock>

          <OutputBlock
            title="Final Cover Letter"
            subtitle="Primary cover letter output for the analysed role."
            defaultOpen
          >
            <div style={headerRowStyle}>
              <div style={smallMutedStyle}>
                Generated and stored in workspace state.
              </div>
              <button
                type="button"
                onClick={() => void copy(finalCoverLetter)}
                style={secondaryButtonStyle}
              >
                Copy cover letter
              </button>
            </div>
            <pre style={preStyle}>{finalCoverLetter}</pre>
          </OutputBlock>

          <OutputBlock
            title="Refinement Notes"
            subtitle="What could still strengthen the application before sending."
            defaultOpen
          >
            <pre style={preStyle}>{refinementNotes}</pre>

            <div
              style={{
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
                marginTop: 16,
              }}
            >
              <Link href="/workspace/profile" style={secondaryLinkStyle}>
                Update profile
              </Link>
              <Link href="/workspace/job" style={primaryLinkStyle}>
                Regenerate from Job
              </Link>
              <Link href="/workspace/insights" style={secondaryLinkStyle}>
                Open Insights
              </Link>
            </div>
          </OutputBlock>

          <OutputBlock
            title="Positioning Brief"
            subtitle="How the system is positioning the candidate for this role."
          >
            <pre style={preStyle}>{positioningBrief}</pre>
          </OutputBlock>

          <OutputBlock
            title="Evidence Summary"
            subtitle="What the current positioning is based on."
          >
            <pre style={preStyle}>{evidenceSummary}</pre>
          </OutputBlock>

          <OutputBlock
            title="Recommendation"
            subtitle="Current role recommendation from the pipeline."
          >
            <pre style={preStyle}>{recommendation}</pre>
          </OutputBlock>

          <OutputBlock
            title="Review Findings"
            subtitle="System review observations and conservative adjustments."
          >
            <pre style={preStyle}>{reviewFindings}</pre>
          </OutputBlock>

          <OutputBlock
            title="Profile Discovery Signals"
            subtitle="Gaps or missing signals that may improve the next regeneration."
          >
            <pre style={preStyle}>{profileDiscoverySignals}</pre>

            <div
              style={{
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
                marginTop: 16,
              }}
            >
              <Link href="/workspace/profile" style={primaryLinkStyle}>
                Add evidence in Profile
              </Link>
              <Link href="/workspace/job" style={secondaryLinkStyle}>
                Return to Job
              </Link>
            </div>
          </OutputBlock>
        </>
      )}
    </div>
  );
}

const pillStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding: "8px 12px",
  borderRadius: 999,
  border: `1px solid ${t.colors.border}`,
  background: t.colors.surface,
  color: t.colors.textSecondary,
  fontSize: 12,
  fontWeight: 700,
};

const headerRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  flexWrap: "wrap",
};

const smallMutedStyle: CSSProperties = {
  fontSize: 12,
  color: t.colors.textMuted,
};

const secondaryButtonStyle: CSSProperties = {
  border: `1px solid ${t.colors.border}`,
  borderRadius: t.radius.sm,
  background: t.colors.surface,
  color: t.colors.textPrimary,
  fontSize: 13,
  fontWeight: 700,
  padding: "8px 12px",
  cursor: "pointer",
};

const preStyle: CSSProperties = {
  marginTop: 16,
  whiteSpace: "pre-wrap",
  fontSize: 14,
  lineHeight: 1.7,
  color: t.colors.textSecondary,
};

const emptyStateStyle: CSSProperties = {
  borderRadius: t.radius.md,
  border: `1px solid ${t.colors.border}`,
  background: t.colors.backgroundSoft,
  padding: 16,
  fontSize: 14,
  lineHeight: 1.7,
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

const primaryLinkStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: t.radius.sm,
  background: t.colors.primary,
  color: t.colors.textOnPrimary,
  fontSize: 14,
  fontWeight: 700,
  padding: "10px 14px",
  textDecoration: "none",
};

const secondaryLinkStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: t.radius.sm,
  border: `1px solid ${t.colors.border}`,
  background: t.colors.surface,
  color: t.colors.textPrimary,
  fontSize: 14,
  fontWeight: 700,
  padding: "10px 14px",
  textDecoration: "none",
};