"use client";

import { type CSSProperties, useEffect, useRef, useState } from "react";
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

// ── Utility helpers ───────────────────────────────────────────────────────────

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

// ── Extraction helpers ────────────────────────────────────────────────────────

function extractFinalCv(finalDrafts: WorkspaceFinalDrafts | null): string {
  return (
    finalDrafts?.finalCv ||
    finalDrafts?.cvDraft ||
    asString(asRecord(finalDrafts?.drafts)?.finalCv) ||
    asString(asRecord(finalDrafts?.drafts)?.cvDraft) ||
    ""
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
    ""
  );
}

function extractJobTitle(state: {
  insights: WorkspaceInsights | null;
  jobProfile: Record<string, unknown> | null;
}): string {
  return (
    asString(
      asRecord(asRecord(state.insights?.bundle)?.structuredJob)?.jobTitle,
    ) ||
    asString(asRecord(state.jobProfile)?.jobTitle) ||
    asString(asRecord(asRecord(state.insights?.rawResponse)?.structuredJob)?.jobTitle) ||
    "this role"
  );
}

function extractCompanyName(state: {
  insights: WorkspaceInsights | null;
  jobProfile: Record<string, unknown> | null;
}): string {
  return (
    asString(
      asRecord(asRecord(state.insights?.bundle)?.structuredJob)?.companyName,
    ) ||
    asString(asRecord(state.jobProfile)?.companyName) ||
    ""
  );
}

// ── Document block renderer ───────────────────────────────────────────────────

function DocumentText({ text }: { text: string }) {
  return (
    <div style={docTextStyle}>
      {text.split("\n\n").map((block, i) => (
        <p key={i} style={docParaStyle}>
          {block.split("\n").map((line, j, arr) => (
            <span key={j}>
              {line}
              {j < arr.length - 1 && <br />}
            </span>
          ))}
        </p>
      ))}
    </div>
  );
}

// ── Tab type ──────────────────────────────────────────────────────────────────

type DocTab = "cv" | "coverletter";

// ── Main component ────────────────────────────────────────────────────────────

export default function WorkspaceFinalPage() {
  const { state, progress } = useWorkspace();

  const finalDrafts = state.finalDrafts;
  const finalCv = extractFinalCv(finalDrafts);
  const finalCoverLetter = extractFinalCoverLetter(finalDrafts);

  const jobTitle = extractJobTitle({
    insights: state.insights,
    jobProfile: state.jobProfile as Record<string, unknown> | null,
  });
  const companyName = extractCompanyName({
    insights: state.insights,
    jobProfile: state.jobProfile as Record<string, unknown> | null,
  });

  const runId = finalDrafts?.runId || state.telemetry?.runId || "";
  const outputLanguage = finalDrafts?.outputLanguage || state.jobProfile?.outputLanguage || "en";

  const hasFinalDrafts = Boolean(finalDrafts);
  const hasCv = Boolean(finalCv);
  const hasCoverLetter = Boolean(finalCoverLetter);
  const isReadyForGeneration = progress.profileReady && progress.jobReady;

  const [activeTab, setActiveTab] = useState<DocTab>("cv");
  const [hasReviewed, setHasReviewed] = useState(false);
  const [sendClicked, setSendClicked] = useState(false);
  const [copyingCv, setCopyingCv] = useState(false);
  const [copyingCl, setCopyingCl] = useState(false);

  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  // Reset review confirmation if documents change
  useEffect(() => {
    setHasReviewed(false);
    setSendClicked(false);
  }, [finalDrafts]);

  async function handleCopy(text: string, which: "cv" | "cl") {
    try {
      await navigator.clipboard.writeText(text);
      if (which === "cv") {
        setCopyingCv(true);
        copyTimerRef.current = setTimeout(() => setCopyingCv(false), 1800);
      } else {
        setCopyingCl(true);
        copyTimerRef.current = setTimeout(() => setCopyingCl(false), 1800);
      }
    } catch {
      // ignore clipboard errors
    }
  }

  function handlePrint() {
    window.print();
  }

  function handleDownload(text: string, filename: string) {
    const blob = new Blob([text], { type: "text/plain; charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }

  function handleOpenInEmail() {
    const subject = encodeURIComponent(
      companyName
        ? `Application — ${jobTitle} — ${companyName}`
        : `Application — ${jobTitle}`,
    );
    const body = encodeURIComponent(
      [
        "Please find my CV and cover letter attached.",
        "",
        "---",
        "Cover letter:",
        finalCoverLetter,
        "",
        "---",
        "CV:",
        finalCv,
      ].join("\n"),
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  }

  function handleSend() {
    if (!hasReviewed) return;
    setSendClicked(true);
    handleOpenInEmail();
  }

  const roleLabel = companyName
    ? `${jobTitle} — ${companyName}`
    : jobTitle;

  return (
    <div style={{ display: "grid", gap: 20 }}>
      {/* Header */}
      <AppCard className="p-6">
        <SectionLabel tone="blue">Final</SectionLabel>

        <h1 style={headingStyle}>
          {hasFinalDrafts
            ? "Your documents are ready."
            : "Waiting for your documents."}
        </h1>

        {hasFinalDrafts && (
          <p style={subheadStyle}>
            {roleLabel !== "this role"
              ? `Tailored for: ${roleLabel}`
              : "Review your CV and cover letter, then send when you are ready."}
          </p>
        )}

        {!hasFinalDrafts && (
          <p style={subheadStyle}>
            {isReadyForGeneration
              ? "Run the pipeline from the Job step to generate your tailored documents."
              : "Complete your profile and add a job description to generate your documents."}
          </p>
        )}

        {hasFinalDrafts && runId && (
          <div style={{ marginTop: 16 }}>
            <FeedbackStars
              runId={runId}
              stage="final_documents"
              prompt={outputLanguage === "de" ? "Diesen Schritt bewerten" : "Rate this step"}
              locale={outputLanguage === "de" ? "de" : "en"}
            />
          </div>
        )}
      </AppCard>

      {/* Empty state */}
      {!hasFinalDrafts && (
        <AppCard className="p-6">
          <div style={emptyStateStyle}>
            {!isReadyForGeneration
              ? "Complete the Profile and Job steps first."
              : "Return to the Job step and run the pipeline to generate your documents."}
          </div>
          <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
            {!progress.profileReady && (
              <Link href="/workspace/profile" style={primaryLinkStyle}>
                Open Profile
              </Link>
            )}
            <Link href="/workspace/job" style={primaryLinkStyle}>
              {progress.jobReady ? "Return to Job" : "Add a job"}
            </Link>
            {progress.insightsReady && (
              <Link href="/workspace/insights" style={secondaryLinkStyle}>
                Open Insights
              </Link>
            )}
          </div>
        </AppCard>
      )}

      {/* Document tabs + actions */}
      {hasFinalDrafts && (
        <>
          {/* Tab bar */}
          <div style={tabBarStyle}>
            <button
              type="button"
              onClick={() => setActiveTab("cv")}
              style={activeTab === "cv" ? activeTabStyle : inactiveTabStyle}
            >
              CV
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("coverletter")}
              style={
                activeTab === "coverletter" ? activeTabStyle : inactiveTabStyle
              }
            >
              Cover Letter
            </button>
          </div>

          {/* Document display */}
          <AppCard className="p-6">
            {activeTab === "cv" && (
              <>
                <div style={docHeaderStyle}>
                  <span style={docLabelStyle}>CV</span>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => void handleCopy(finalCv, "cv")}
                      style={ghostButtonStyle}
                    >
                      {copyingCv ? "Copied" : "Copy"}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleDownload(
                          finalCv,
                          `CV_${jobTitle.replace(/\s+/g, "_")}.txt`,
                        )
                      }
                      style={ghostButtonStyle}
                    >
                      Download
                    </button>
                  </div>
                </div>
                {hasCv ? (
                  <DocumentText text={finalCv} />
                ) : (
                  <div style={missingDocStyle}>
                    CV not available. Return to the Job step and regenerate.
                  </div>
                )}
              </>
            )}

            {activeTab === "coverletter" && (
              <>
                <div style={docHeaderStyle}>
                  <span style={docLabelStyle}>Cover Letter</span>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => void handleCopy(finalCoverLetter, "cl")}
                      style={ghostButtonStyle}
                    >
                      {copyingCl ? "Copied" : "Copy"}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleDownload(
                          finalCoverLetter,
                          `CoverLetter_${jobTitle.replace(/\s+/g, "_")}.txt`,
                        )
                      }
                      style={ghostButtonStyle}
                    >
                      Download
                    </button>
                  </div>
                </div>
                {hasCoverLetter ? (
                  <DocumentText text={finalCoverLetter} />
                ) : (
                  <div style={missingDocStyle}>
                    Cover letter not available. Return to the Job step and
                    regenerate.
                  </div>
                )}
              </>
            )}
          </AppCard>

          {/* Action bar */}
          <AppCard className="p-6">
            <div style={actionBarStyle}>
              {/* Left: utility actions */}
              <div style={actionGroupStyle}>
                <button
                  type="button"
                  onClick={handlePrint}
                  style={secondaryActionStyle}
                >
                  Print
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleDownload(
                      [finalCv, finalCoverLetter].filter(Boolean).join("\n\n---\n\n"),
                      `Application_${jobTitle.replace(/\s+/g, "_")}.txt`,
                    )
                  }
                  style={secondaryActionStyle}
                >
                  Download all
                </button>
                <button
                  type="button"
                  onClick={handleOpenInEmail}
                  style={secondaryActionStyle}
                >
                  Open in email
                </button>
              </div>

              {/* Right: confirm + send */}
              <div style={actionGroupStyle}>
                <label style={reviewToggleStyle}>
                  <input
                    type="checkbox"
                    checked={hasReviewed}
                    onChange={(e) => {
                      setHasReviewed(e.target.checked);
                      if (!e.target.checked) setSendClicked(false);
                    }}
                    style={{ width: 16, height: 16, cursor: "pointer" }}
                  />
                  <span style={{ color: t.colors.textSecondary, fontSize: 14 }}>
                    I have reviewed my documents
                  </span>
                </label>

                <button
                  type="button"
                  onClick={handleSend}
                  disabled={!hasReviewed}
                  style={hasReviewed ? sendActiveStyle : sendDisabledStyle}
                >
                  {sendClicked ? "Opening email…" : "Send application"}
                </button>
              </div>
            </div>

            {!hasReviewed && (
              <p style={reviewHintStyle}>
                Review your documents above, then check the box to activate
                Send.
              </p>
            )}
          </AppCard>

          {/* Warnings */}
          {(finalDrafts?.warnings ?? []).length > 0 && (
            <AppCard className="p-6">
              <div style={warningsSectionStyle}>
                <div style={warnLabelStyle}>Things to be aware of</div>
                <ul style={{ margin: 0, paddingLeft: 20 }}>
                  {asStringArray(finalDrafts?.warnings).map((w, i) => (
                    <li key={i} style={warnItemStyle}>
                      {w}
                    </li>
                  ))}
                </ul>
              </div>
            </AppCard>
          )}

          {/* Navigation */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link href="/workspace/insights" style={secondaryLinkStyle}>
              Back to Insights
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const headingStyle: CSSProperties = {
  margin: "14px 0 0",
  fontSize: 28,
  lineHeight: 1.2,
  letterSpacing: "-0.025em",
  color: t.colors.textPrimary,
  fontWeight: 700,
};

const subheadStyle: CSSProperties = {
  margin: "10px 0 0",
  fontSize: 15,
  lineHeight: 1.65,
  color: t.colors.textSecondary,
  maxWidth: 680,
};

const emptyStateStyle: CSSProperties = {
  borderRadius: t.radius.md,
  border: `1px solid ${t.colors.border}`,
  background: t.colors.backgroundSoft,
  padding: "14px 16px",
  fontSize: 14,
  lineHeight: 1.7,
  color: t.colors.textSecondary,
};

const tabBarStyle: CSSProperties = {
  display: "flex",
  gap: 4,
};

const baseTabStyle: CSSProperties = {
  border: "none",
  cursor: "pointer",
  fontSize: 14,
  fontWeight: 700,
  padding: "10px 20px",
  borderRadius: t.radius.sm,
  transition: "background 0.12s",
};

const activeTabStyle: CSSProperties = {
  ...baseTabStyle,
  background: t.colors.primary,
  color: t.colors.textOnPrimary,
};

const inactiveTabStyle: CSSProperties = {
  ...baseTabStyle,
  background: t.colors.backgroundSoft,
  color: t.colors.textSecondary,
};

const docHeaderStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: 16,
};

const docLabelStyle: CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  color: t.colors.textMuted,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
};

// Document-style area mimicking a printed page
const docTextStyle: CSSProperties = {
  padding: "28px 32px",
  background: "#FFFFFF",
  border: `1px solid ${t.colors.border}`,
  borderRadius: t.radius.md,
  boxShadow: t.shadow.sm,
  maxWidth: 760,
};

const docParaStyle: CSSProperties = {
  margin: "0 0 14px 0",
  fontSize: 14,
  lineHeight: 1.75,
  color: t.colors.textPrimary,
  textAlign: "justify",
  fontFamily: "Georgia, 'Times New Roman', serif",
};

const missingDocStyle: CSSProperties = {
  padding: "20px 0",
  fontSize: 14,
  color: t.colors.textMuted,
};

const ghostButtonStyle: CSSProperties = {
  border: `1px solid ${t.colors.border}`,
  borderRadius: t.radius.sm,
  background: t.colors.surface,
  color: t.colors.textSecondary,
  fontSize: 13,
  fontWeight: 600,
  padding: "6px 12px",
  cursor: "pointer",
};

// Action bar
const actionBarStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 16,
  flexWrap: "wrap",
};

const actionGroupStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  flexWrap: "wrap",
};

const secondaryActionStyle: CSSProperties = {
  border: `1px solid ${t.colors.border}`,
  borderRadius: t.radius.sm,
  background: t.colors.surface,
  color: t.colors.textPrimary,
  fontSize: 14,
  fontWeight: 600,
  padding: "10px 16px",
  cursor: "pointer",
};

const reviewToggleStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  cursor: "pointer",
  userSelect: "none",
};

const baseSendStyle: CSSProperties = {
  borderRadius: t.radius.sm,
  border: "none",
  fontSize: 14,
  fontWeight: 700,
  padding: "10px 22px",
};

const sendActiveStyle: CSSProperties = {
  ...baseSendStyle,
  background: t.colors.primary,
  color: t.colors.textOnPrimary,
  cursor: "pointer",
};

const sendDisabledStyle: CSSProperties = {
  ...baseSendStyle,
  background: t.colors.backgroundSoft,
  color: t.colors.textMuted,
  cursor: "not-allowed",
};

const reviewHintStyle: CSSProperties = {
  marginTop: 14,
  fontSize: 13,
  color: t.colors.textMuted,
  lineHeight: 1.6,
};

const warningsSectionStyle: CSSProperties = {
  borderRadius: t.radius.md,
  border: `1px solid ${t.colors.border}`,
  background: t.colors.backgroundSoft,
  padding: "14px 16px",
};

const warnLabelStyle: CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  color: t.colors.textSecondary,
  marginBottom: 8,
};

const warnItemStyle: CSSProperties = {
  fontSize: 14,
  lineHeight: 1.65,
  color: t.colors.textSecondary,
  marginBottom: 6,
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
  padding: "10px 16px",
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
  padding: "10px 16px",
  textDecoration: "none",
};
