"use client";

import { type CSSProperties } from "react";
import Link from "next/link";
import AppCard from "@/components/ui/AppCard";
import SectionLabel from "@/components/ui/SectionLabel";
import FeedbackStars from "@/components/feedback/FeedbackStars";
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

function copy(text: string) {
  navigator.clipboard.writeText(text);
}

function extractPositioningBrief(insights: unknown): string {
  const record = asRecord(insights);
  if (!record) return "No positioning brief available yet.";

  return (
    asString(record.positioningBrief) ||
    asString(record.positioningStrategy) ||
    asString(record.summary) ||
    "No positioning brief available yet."
  );
}

function extractEvidenceSummary(insights: unknown): string {
  const record = asRecord(insights);
  if (!record) return "No evidence summary available yet.";

  const selectedEvidence = asStringArray(record.selectedEvidence);
  if (selectedEvidence.length > 0) {
    return selectedEvidence.map((item) => `• ${item}`).join("\n");
  }

  return asString(record.evidenceSummary) || "No evidence summary available yet.";
}

function extractCompetencyProfile(finalDrafts: unknown): string {
  const record = asRecord(finalDrafts?.rawResponse);
  if (!record) return "No competency profile available yet.";

  return (
    asString(record.competencyProfile) ||
    asString(record.competencySummary) ||
    "No competency profile available yet."
  );
}

function extractReviewFindings(finalDrafts: unknown): string {
  const record = asRecord(finalDrafts?.rawResponse);
  if (!record) return "No review findings available yet.";

  const findings = record.reviewFindings ?? record.review;
  if (!findings) return "No review findings available yet.";

  if (typeof findings === "string") return findings;
  if (Array.isArray(findings)) {
    return findings.map((item) => `• ${String(item)}`).join("\n");
  }

  return stringifyUnknown(findings);
}

function extractProfileDiscoverySignals(insights: unknown): string {
  const record = asRecord(insights);
  if (!record) return "No profile discovery signals available yet.";

  const missingSignals = asStringArray(record.missingSignals);
  if (missingSignals.length > 0) {
    return missingSignals.map((item) => `• ${item}`).join("\n");
  }

  return asString(record.profileDiscoverySignals) || "No profile discovery signals available yet.";
}

function extractWarnings(insights: unknown, finalDrafts: unknown): string {
  const parts: string[] = [];

  const insightsRecord = asRecord(insights);
  if (insightsRecord) {
    const risks = asStringArray(insightsRecord.riskAreas);
    const blockers = asStringArray(insightsRecord.blockers);

    if (risks.length > 0) {
      parts.push("Risk areas:");
      parts.push(...risks.map((item) => `• ${item}`));
    }

    if (blockers.length > 0) {
      if (parts.length > 0) parts.push("");
      parts.push("Blockers:");
      parts.push(...blockers.map((item) => `• ${item}`));
    }
  }

  const rawResponse = asRecord(finalDrafts?.rawResponse);
  if (rawResponse) {
    const warnings = rawResponse.warnings;
    if (Array.isArray(warnings) && warnings.length > 0) {
      if (parts.length > 0) parts.push("");
      parts.push("Warnings:");
      parts.push(...warnings.map((item) => `• ${String(item)}`));
    }
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
  children: React.ReactNode;
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
  const { state } = useWorkspace();

  const finalDrafts = state.finalDrafts;

  const finalCv =
    finalDrafts?.finalCv ||
    finalDrafts?.cvDraft ||
    "No final CV available yet. Analyse a role first.";

  const finalCoverLetter =
    finalDrafts?.finalCoverLetter ||
    finalDrafts?.coverLetterDraft ||
    "No final cover letter available yet. Analyse a role first.";

  const outputLanguage =
    finalDrafts?.outputLanguage ||
    (state.jobProfile?.outputLanguage === "de" ? "German" : "English");

  const runId = finalDrafts?.runId || "";

  const positioningBrief = extractPositioningBrief(state.insights);
  const evidenceSummary = extractEvidenceSummary(state.insights);
  const competencyProfile = extractCompetencyProfile(finalDrafts);
  const reviewFindings = extractReviewFindings(finalDrafts);
  const profileDiscoverySignals = extractProfileDiscoverySignals(state.insights);
  const refinementNotes = extractWarnings(state.insights, finalDrafts);

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
          This page displays the generated documents and the supporting intelligence
          already prepared in the previous steps.
        </p>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16 }}>
          <SummaryPill label={`Output: ${outputLanguage}`} />
          <SummaryPill label={`Status: ${finalDrafts ? "Ready" : "Pending"}`} />
          {runId ? <SummaryPill label={`Run ID: ${runId}`} /> : null}
        </div>

        {finalDrafts ? (
          <FeedbackStars
  runId={runId}
  stage="final_documents"
  prompt={outputLanguage === "German" ? "Diesen Schritt bewerten" : "Rate this step"}
  locale={outputLanguage === "German" ? "de" : "en"}
/>
        ) : null}
      </AppCard>

      {!finalDrafts ? (
        <AppCard className="p-6">
          <div style={emptyStateStyle}>
            No generated documents yet. Go back to the Job step, analyse the role,
            and the system will generate the final output automatically.
          </div>

          <div style={{ marginTop: 16 }}>
            <Link href="/workspace/job" style={primaryLinkStyle}>
              Return to Job
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
              <div style={smallMutedStyle}>Generated and stored in workspace state.</div>
              <button
                type="button"
                onClick={() => copy(finalCv)}
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
              <div style={smallMutedStyle}>Generated and stored in workspace state.</div>
              <button
                type="button"
                onClick={() => copy(finalCoverLetter)}
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

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16 }}>
              <Link href="/profile" style={secondaryLinkStyle}>
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
            title="Competency Profile"
            subtitle="Structured capability view supporting the final output."
          >
            <pre style={preStyle}>{competencyProfile}</pre>
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

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16 }}>
              <Link href="/profile" style={primaryLinkStyle}>
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