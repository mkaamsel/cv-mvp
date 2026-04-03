"use client";

import { useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import AppCard from "@/components/ui/AppCard";
import SectionLabel from "@/components/ui/SectionLabel";
import { useWorkspace } from "@/components/workspace/WorkspaceProvider";
import type { WorkspaceInsights } from "@/lib/workspace/types";
import { designTokens } from "@/lib/design/tokens";

const t = designTokens;

type ObservabilityView =
  | "overview"
  | "extraction"
  | "reasoning"
  | "output"
  | "audit";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
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
    return value
      .map((item) => {
        if (typeof item === "string") return item;
        if (item == null) return null;
        return stringifyUnknown(item);
      })
      .filter((item): item is string => Boolean(item))
      .join("\n");
  }

  return stringifyUnknown(value);
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

function getInsightsRecord(insights: WorkspaceInsights | null): Record<string, unknown> {
  return asRecord(insights) ?? {};
}

function getInsightsBundle(insights: WorkspaceInsights | null): Record<string, unknown> {
  return asRecord(insights?.bundle) ?? {};
}

function getProfileArtifact(state: unknown): unknown {
  const record = getWorkspaceRecord(state);

  return pickFirstDefined(
    record.candidateProfile,
    record.profile,
    record.profileData,
    asRecord(record.bundle)?.candidateProfile,
    asRecord(record.rawResponse)?.candidateProfile,
  );
}

function getJobArtifact(
  insights: WorkspaceInsights | null,
  state: unknown,
): unknown {
  const record = getWorkspaceRecord(state);
  const bundle = getInsightsBundle(insights);
  const jobProfile = record.jobProfile;

  return pickFirstDefined(
    jobProfile,
    bundle.jobProfile,
    bundle.structuredJob,
    record.structuredJob,
    record.job,
    record.jobData,
    asRecord(record.rawResponse)?.structuredJob,
  );
}

function getRequiredProfileArtifact(
  insights: WorkspaceInsights | null,
  state: unknown,
): unknown {
  const stateRecord = getWorkspaceRecord(state);
  const insightsRecord = getInsightsRecord(insights);
  const bundle = getInsightsBundle(insights);

  return pickFirstDefined(
    insightsRecord.requiredProfile,
    bundle.requiredProfile,
    stateRecord.requiredProfile,
    asRecord(insights?.rawResponse)?.requiredProfile,
  );
}

function getSelectedEvidenceArtifact(
  insights: WorkspaceInsights | null,
  state: unknown,
): unknown {
  const stateRecord = getWorkspaceRecord(state);
  const insightsRecord = getInsightsRecord(insights);
  const bundle = getInsightsBundle(insights);

  return pickFirstDefined(
    insights?.selectedEvidence,
    insightsRecord.evidenceSelection,
    bundle.selectedEvidence,
    stateRecord.selectedEvidence,
    asRecord(insights?.rawResponse)?.selectedEvidence,
  );
}

function getPositioningArtifact(
  insights: WorkspaceInsights | null,
  state: unknown,
): unknown {
  const stateRecord = getWorkspaceRecord(state);
  const bundle = getInsightsBundle(insights);

  return pickFirstDefined(
    insights?.positioningBrief,
    insights?.positioningStrategy,
    bundle.positioningBrief,
    stateRecord.positioningBrief,
    asRecord(insights?.rawResponse)?.positioningBrief,
  );
}

function getRecommendationArtifact(
  insights: WorkspaceInsights | null,
  state: unknown,
): unknown {
  const stateRecord = getWorkspaceRecord(state);
  const bundle = getInsightsBundle(insights);

  return pickFirstDefined(
    insights?.recommendation,
    bundle.recommendation,
    stateRecord.recommendation,
    asRecord(insights?.rawResponse)?.recommendation,
  );
}

function getReviewArtifact(
  insights: WorkspaceInsights | null,
  state: unknown,
): unknown {
  const stateRecord = getWorkspaceRecord(state);
  const insightsRecord = getInsightsRecord(insights);
  const bundle = getInsightsBundle(insights);
  const finalDrafts = asRecord(stateRecord.finalDrafts);
  const rawResponse = asRecord(insights?.rawResponse);

  return pickFirstDefined(
    insightsRecord.reviewReport,
    bundle.reviewReport,
    finalDrafts?.reviewFindings,
    rawResponse?.reviewReport,
  );
}

function getTelemetryArtifact(state: unknown): unknown {
  const record = getWorkspaceRecord(state);

  return pickFirstDefined(
    record.telemetry,
    asRecord(record.rawResponse)?.telemetry,
  );
}

function getPipelineTrace(state: unknown): string[] {
  const telemetry = asRecord(getTelemetryArtifact(state));
  return asStringArray(telemetry?.pipelineTrace);
}

function getFinalCvArtifact(state: unknown): unknown {
  const record = getWorkspaceRecord(state);
  const finalDrafts = asRecord(record.finalDrafts);

  return pickFirstDefined(
    finalDrafts?.cvDraft,
    finalDrafts?.finalCv,
    finalDrafts?.cv,
    record.finalCv,
    record.cv,
  );
}

function getFinalCoverLetterArtifact(state: unknown): unknown {
  const record = getWorkspaceRecord(state);
  const finalDrafts = asRecord(record.finalDrafts);

  return pickFirstDefined(
    finalDrafts?.coverLetterDraft,
    finalDrafts?.finalCoverLetter,
    finalDrafts?.coverLetter,
    record.finalCoverLetter,
    record.coverLetter,
  );
}

function extractSelectedEvidenceLines(value: unknown): string[] {
  const direct = asStringArray(value);
  if (direct.length) return direct;

  const record = asRecord(value);
  if (record) {
    const combined = [
      ...asStringArray(record.strongEvidence),
      ...asStringArray(record.supportEvidence),
      ...asStringArray(record.transferableEvidence),
      ...asStringArray(record.combinedTopEvidence),
    ];
    if (combined.length) return combined;
  }

  const items = asArray(value)
    .map((item) => {
      if (typeof item === "string") return item;

      const itemRecord = asRecord(item);
      if (!itemRecord) return stringifyUnknown(item);

      const sourceLabel = asString(itemRecord.sourceLabel);
      const title = asString(itemRecord.title) ?? asString(itemRecord.roleTitle);
      const organization = asString(itemRecord.organization);
      const summary =
        asString(itemRecord.summary) ??
        asString(itemRecord.text) ??
        asString(itemRecord.label) ??
        asString(itemRecord.claim);

      const header = [title, organization].filter(Boolean).join(" — ");
      const primary = sourceLabel || header || summary;

      if (!primary) return stringifyUnknown(item);
      if (!summary || summary === primary) return primary;

      return `${primary} — ${summary}`;
    })
    .filter((item): item is string => Boolean(item));

  return items;
}

function extractRequirementAnalysis(
  insights: WorkspaceInsights | null,
): Array<{
  requirement: string;
  importance: string;
  matchStatus: string;
  notes: string;
}> {
  const direct = asArray(insights?.requirementsAnalysis);

  return direct
    .map((item) => {
      const record = asRecord(item);
      if (!record) return null;

      const requirement =
        asString(record.requirement) ||
        asString(record.competency) ||
        asString(record.title) ||
        "Untitled requirement";

      const importance = asString(record.importance) || "supporting";
      const matchStatus = asString(record.matchStatus) || "unknown";
      const notes =
        asString(record.notes) ||
        asString(record.rationale) ||
        asString(record.summary) ||
        stringifyUnknown(item);

      return {
        requirement,
        importance,
        matchStatus,
        notes,
      };
    })
    .filter(
      (
        item,
      ): item is {
        requirement: string;
        importance: string;
        matchStatus: string;
        notes: string;
      } => Boolean(item),
    );
}

function extractPositioningBriefText(value: unknown): string {
  const direct = asString(value);
  if (direct) return direct;

  const record = asRecord(value);
  if (!record) return "No positioning brief yet.";

  const primary =
    asString(record.positioningStrategy) ||
    asString(record.coverLetterAngle) ||
    asString(record.summary);

  const whyFit = asStringArray(record.coreWhyFit);
  const risks = asStringArray(record.positioningRisks);
  const emphasis = asStringArray(record.cvEmphasis);

  const chunks: string[] = [];

  if (primary) chunks.push(primary);
  if (whyFit.length) {
    chunks.push(
      ["Core why fit:", ...whyFit.map((item) => `• ${item}`)].join("\n"),
    );
  }
  if (risks.length) {
    chunks.push(
      ["Positioning risks:", ...risks.map((item) => `• ${item}`)].join("\n"),
    );
  }
  if (emphasis.length) {
    chunks.push(
      ["CV emphasis:", ...emphasis.map((item) => `• ${item}`)].join("\n"),
    );
  }

  return chunks.join("\n\n") || stringifyUnknown(value);
}

function extractRecommendationText(
  insights: WorkspaceInsights | null,
  value: unknown,
): string {
  const direct =
    insights?.advisorMessage ||
    insights?.reasoningSummary ||
    asString(value);

  if (direct) return direct;

  const record = asRecord(value);
  if (!record) return "No recommendation yet.";

  const chunks: string[] = [];

  const primary =
    asString(record.advisorMessage) ||
    asString(record.reasoningSummary) ||
    asString(record.summary) ||
    asString(record.recommendation);

  if (primary) chunks.push(primary);

  const strongMatches = asStringArray(record.strongMatches);
  const stretchMatches = asStringArray(record.stretchMatches);
  const riskAreas = asStringArray(record.riskAreas);
  const blockers = asStringArray(record.blockers);

  if (strongMatches.length) {
    chunks.push(
      ["Strong matches:", ...strongMatches.map((item) => `• ${item}`)].join(
        "\n",
      ),
    );
  }

  if (stretchMatches.length) {
    chunks.push(
      ["Stretch matches:", ...stretchMatches.map((item) => `• ${item}`)].join(
        "\n",
      ),
    );
  }

  if (riskAreas.length) {
    chunks.push(
      ["Risk areas:", ...riskAreas.map((item) => `• ${item}`)].join("\n"),
    );
  }

  if (blockers.length) {
    chunks.push(
      ["Blockers:", ...blockers.map((item) => `• ${item}`)].join("\n"),
    );
  }

  return chunks.join("\n\n") || stringifyUnknown(value);
}

function extractReviewText(value: unknown): string {
  if (!value) return "No review findings yet.";

  const direct = asString(value);
  if (direct) return direct;

  const record = asRecord(value);
  if (!record) return stringifyUnknown(value);

  const cvReport = asRecord(record.cv);
  const coverLetterReport = asRecord(record.coverLetter);
  const reviewReport = asRecord(record.reviewReport) ?? record;

  if (cvReport || coverLetterReport) {
    const sections: string[] = [];

    if (cvReport) {
      sections.push(
        [
          "CV review:",
          buildReviewSectionText(cvReport),
        ].join("\n"),
      );
    }

    if (coverLetterReport) {
      sections.push(
        [
          "Cover letter review:",
          buildReviewSectionText(coverLetterReport),
        ].join("\n"),
      );
    }

    return sections.join("\n\n");
  }

  return buildReviewSectionText(reviewReport);
}

function buildReviewSectionText(reviewReport: Record<string, unknown>): string {
  const chunks: string[] = [];

  const truthCheck = asString(reviewReport.truthCheck);
  const inflationRisk = asString(reviewReport.inflationRisk);
  const relevanceScore = reviewReport.relevanceScore;
  const clarityFixes = reviewReport.clarityFixes;

  if (truthCheck) chunks.push(`Truth check: ${truthCheck}`);
  if (inflationRisk) chunks.push(`Inflation risk: ${inflationRisk}`);
  if (typeof relevanceScore === "number") {
    chunks.push(`Relevance score: ${String(relevanceScore)}`);
  }
  if (typeof clarityFixes === "number") {
    chunks.push(`Clarity fixes: ${String(clarityFixes)}`);
  }

  const unsupportedClaims = asStringArray(reviewReport.unsupportedClaims);
  const weakEvidence = asStringArray(reviewReport.weakEvidence);
  const genericLanguage = asStringArray(reviewReport.genericLanguage);

  if (unsupportedClaims.length) {
    chunks.push(
      ["Unsupported claims:", ...unsupportedClaims.map((item) => `• ${item}`)].join(
        "\n",
      ),
    );
  }

  if (weakEvidence.length) {
    chunks.push(
      ["Weak evidence:", ...weakEvidence.map((item) => `• ${item}`)].join("\n"),
    );
  }

  if (genericLanguage.length) {
    chunks.push(
      ["Generic language:", ...genericLanguage.map((item) => `• ${item}`)].join(
        "\n",
      ),
    );
  }

  return chunks.join("\n\n") || stringifyUnknown(reviewReport);
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

function extractList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") return item;
        if (item == null) return null;
        return stringifyUnknown(item);
      })
      .filter((item): item is string => Boolean(item));
  }

  return [];
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

function getImportanceLabel(value: string): string {
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

function getMatchLabel(value: string): string {
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

function shouldShow(
  view: ObservabilityView,
  section: "overview" | "extraction" | "reasoning" | "output" | "audit",
) {
  return view === "overview" || view === section;
}

function extractCandidateSummary(profile: unknown): string | null {
  const record = asRecord(profile);
  if (!record) return null;
  return asString(record.summary) || asString(record.headline);
}

function extractCandidateLanguages(profile: unknown): string[] {
  const record = asRecord(profile);
  if (!record) return [];

  return asArray(record.languages)
    .map((item) => {
      const itemRecord = asRecord(item);
      if (!itemRecord) return typeof item === "string" ? item : null;

      const language = asString(itemRecord.language);
      const proficiency = asString(itemRecord.proficiency);
      if (!language) return null;
      return proficiency ? `${language} — ${proficiency}` : language;
    })
    .filter((item): item is string => Boolean(item));
}

function extractCandidateSkills(profile: unknown): string[] {
  const record = asRecord(profile);
  if (!record) return [];

  return [
    ...asStringArray(record.coreSkills),
    ...asStringArray(record.tools),
    ...asStringArray(record.standards),
    ...asStringArray(record.industries),
  ];
}

function extractCandidateExperience(profile: unknown): string[] {
  const record = asRecord(profile);
  if (!record) return [];

  return asArray(record.roles)
    .map((item) => {
      const itemRecord = asRecord(item);
      if (!itemRecord) return null;

      const title = asString(itemRecord.title);
      const company = asString(itemRecord.company);
      const startDate = asString(itemRecord.startDate);
      const endDate = asString(itemRecord.endDate);
      const header = [title, company].filter(Boolean).join(" — ");
      const dates = [startDate, endDate].filter(Boolean).join(" to ");

      if (!header && !dates) return null;
      return dates ? `${header} (${dates})` : header;
    })
    .filter((item): item is string => Boolean(item));
}

function extractCandidateEducation(profile: unknown): string[] {
  const record = asRecord(profile);
  if (!record) return [];

  return asArray(record.education)
    .map((item) => {
      const itemRecord = asRecord(item);
      if (!itemRecord) return null;

      const degree = asString(itemRecord.degree);
      const field = asString(itemRecord.field);
      const institution = asString(itemRecord.institution);
      return [degree, field, institution].filter(Boolean).join(" — ");
    })
    .filter((item): item is string => Boolean(item));
}

function extractCandidateCertifications(profile: unknown): string[] {
  const record = asRecord(profile);
  if (!record) return [];

  return asArray(record.certifications)
    .map((item) => {
      const itemRecord = asRecord(item);
      if (!itemRecord) return null;

      const name = asString(itemRecord.name);
      const issuer = asString(itemRecord.issuer);
      const date = asString(itemRecord.date);
      return [name, issuer, date].filter(Boolean).join(" — ");
    })
    .filter((item): item is string => Boolean(item));
}

function extractJobLines(job: unknown): string[] {
  const record = asRecord(job);
  if (!record) return [];

  const companyName = asString(record.companyName);
  const jobTitle = asString(record.jobTitle);
  const location = asString(record.location);
  const summary = asString(record.summary);

  const lines = [
    jobTitle ? `Title: ${jobTitle}` : null,
    companyName ? `Company: ${companyName}` : null,
    location ? `Location: ${location}` : null,
    summary ? `Summary: ${summary}` : null,
  ].filter((item): item is string => Boolean(item));

  return lines;
}

export default function WorkspaceInsightsPage() {
  const router = useRouter();
  const { state, progress } = useWorkspace();
  const [view, setView] = useState<ObservabilityView>("overview");

  const candidateProfile = getProfileArtifact(state);
  const structuredJob = getJobArtifact(state.insights, state);

  const requiredProfile = getRequiredProfileArtifact(state.insights, state);
  const selectedEvidenceArtifact = getSelectedEvidenceArtifact(state.insights, state);
  const positioningArtifact = getPositioningArtifact(state.insights, state);
  const recommendationArtifact = getRecommendationArtifact(state.insights, state);
  const reviewArtifact = getReviewArtifact(state.insights, state);
  const finalCv = getFinalCvArtifact(state);
  const finalCoverLetter = getFinalCoverLetterArtifact(state);
  const pipelineTrace = getPipelineTrace(state);

  const selectedEvidence = extractSelectedEvidenceLines(selectedEvidenceArtifact);
  const requirementsAnalysis = extractRequirementAnalysis(state.insights);
  const missingSignals = extractMissingSignals(state.insights);
  const strongMatches = extractList(state.insights?.strongMatches);
  const stretchMatches = extractList(state.insights?.stretchMatches);
  const blockers = extractList(state.insights?.blockers);

  const candidateSummary = extractCandidateSummary(candidateProfile);
  const candidateLanguages = extractCandidateLanguages(candidateProfile);
  const candidateSkills = extractCandidateSkills(candidateProfile);
  const candidateExperience = extractCandidateExperience(candidateProfile);
  const candidateEducation = extractCandidateEducation(candidateProfile);
  const candidateCertifications = extractCandidateCertifications(candidateProfile);
  const jobHeaderLines = extractJobLines(structuredJob);
  const jobResponsibilities = asStringArray(asRecord(structuredJob)?.responsibilities);
  const jobRequirements = asStringArray(asRecord(structuredJob)?.requirements);

  const recommendationLabel = getRecommendationLabel(
    state.insights?.applicationRecommendation,
  );

  const pipelineFlags = [
    {
      label: "Candidate profile",
      value: candidateProfile ? "Captured" : "Missing",
      ready: Boolean(candidateProfile),
    },
    {
      label: "Structured job",
      value: structuredJob ? "Captured" : "Missing",
      ready: Boolean(structuredJob),
    },
    {
      label: "Required profile",
      value: requiredProfile ? "Available" : "Missing",
      ready: Boolean(requiredProfile),
    },
    {
      label: "Selected evidence",
      value: selectedEvidence.length ? "Available" : "Missing",
      ready: selectedEvidence.length > 0,
    },
    {
      label: "Positioning brief",
      value: positioningArtifact ? "Available" : "Missing",
      ready: Boolean(positioningArtifact),
    },
    {
      label: "Recommendation",
      value: recommendationArtifact ? "Available" : "Missing",
      ready: Boolean(recommendationArtifact),
    },
    {
      label: "Review findings",
      value: reviewArtifact ? "Available" : "Missing",
      ready: Boolean(reviewArtifact),
    },
  ];

  const rawSnapshot = stringifyUnknown({
    candidateProfile,
    structuredJob,
    requiredProfile,
    selectedEvidence: selectedEvidenceArtifact,
    positioningBrief: positioningArtifact,
    recommendation: recommendationArtifact,
    reviewFindings: reviewArtifact,
    finalCv,
    finalCoverLetter,
    pipelineTrace,
    insights: state.insights,
  });

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
          Observation and reasoning audit
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
          Inspect what the profile captured, what the job extraction inferred,
          how the system selected evidence, and how the final application
          posture was formed before moving to the final output.
        </p>

        {state.insightsError ? (
          <div style={errorBannerStyle}>{state.insightsError}</div>
        ) : null}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 10,
            marginTop: 18,
          }}
        >
          {pipelineFlags.map((item) => (
            <div
              key={item.label}
              style={{
                borderRadius: t.radius.md,
                border: `1px solid ${t.colors.border}`,
                background: item.ready ? t.colors.surface : t.colors.backgroundSoft,
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
            { key: "extraction", label: "Extraction" },
            { key: "reasoning", label: "Reasoning" },
            { key: "output", label: "Output" },
            { key: "audit", label: "Audit" },
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setView(item.key as ObservabilityView)}
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
          gridTemplateColumns: "minmax(0, 1.08fr) minmax(320px, 0.92fr)",
          gap: 20,
          alignItems: "start",
        }}
      >
        <div style={{ display: "grid", gap: 20 }}>
          {shouldShow(view, "extraction") && (
            <>
              <AppCard className="p-6">
                <h2 style={titleStyle}>Candidate profile</h2>
                <p style={copyStyle}>
                  Structured candidate data used by the engine. This is the first
                  place to inspect what was captured or missed.
                </p>

                {candidateProfile ? (
                  <div style={{ display: "grid", gap: 16, marginTop: 14 }}>
                    {candidateSummary ? (
                      <SectionBlock title="Summary" content={candidateSummary} />
                    ) : null}

                    <SectionListBlock
                      title="Languages"
                      items={candidateLanguages}
                      emptyText="No languages captured."
                    />

                    <SectionListBlock
                      title="Core profile signals"
                      items={candidateSkills}
                      emptyText="No skills or systems captured."
                    />

                    <SectionListBlock
                      title="Experience"
                      items={candidateExperience}
                      emptyText="No experience roles captured."
                    />

                    <SectionListBlock
                      title="Education"
                      items={candidateEducation}
                      emptyText="No education captured."
                    />

                    <SectionListBlock
                      title="Certifications"
                      items={candidateCertifications}
                      emptyText="No certifications captured."
                    />
                  </div>
                ) : (
                  <EmptyBlock text="No candidate profile available yet." />
                )}
              </AppCard>

              <AppCard className="p-6">
                <h2 style={titleStyle}>Structured job</h2>
                <p style={copyStyle}>
                  Structured job extraction feeding the intelligence layers. Use
                  this to verify title, company, responsibilities, and
                  requirements.
                </p>

                {structuredJob ? (
                  <div style={{ display: "grid", gap: 16, marginTop: 14 }}>
                    <SectionListBlock
                      title="Job header"
                      items={jobHeaderLines}
                      emptyText="No header fields captured."
                    />
                    <SectionListBlock
                      title="Responsibilities"
                      items={jobResponsibilities}
                      emptyText="No responsibilities captured."
                    />
                    <SectionListBlock
                      title="Requirements"
                      items={jobRequirements}
                      emptyText="No requirements captured."
                    />
                  </div>
                ) : (
                  <EmptyBlock text="No structured job available yet." />
                )}
              </AppCard>
            </>
          )}

          {shouldShow(view, "reasoning") && (
            <>
              <ArtifactCard
                title="Required profile"
                copy="Job interpretation layer. This is what the engine believes the role actually needs."
                value={requiredProfile}
              />

              <AppCard className="p-6">
                <h2 style={titleStyle}>Selected evidence</h2>
                <p style={copyStyle}>
                  Evidence the engine elevated for this role after ranking and
                  prioritization.
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
            </>
          )}

          {view === "audit" && (
            <>
              <ArtifactCard
                title="Pipeline trace"
                copy="Execution trace of the last run. Useful to confirm which layers actually fired."
                value={pipelineTrace}
              />

              <AppCard className="p-6">
                <h2 style={titleStyle}>Internal reasoning snapshot</h2>
                <p style={copyStyle}>
                  Full raw audit bundle for inspection. This stays in Insights,
                  not in the final user-facing output.
                </p>

                <pre style={{ ...preBlockStyle, marginTop: 14 }}>{rawSnapshot}</pre>
              </AppCard>
            </>
          )}
        </div>

        <div style={{ display: "grid", gap: 20 }}>
          {shouldShow(view, "reasoning") && (
            <>
              <AppCard className="p-6">
                <h2 style={titleStyle}>Positioning brief</h2>
                <p style={copyStyle}>
                  Strategic framing the engine chose for this application.
                </p>

                <div style={{ ...contentBlockStyle, marginTop: 14 }}>
                  {extractPositioningBriefText(positioningArtifact)}
                </div>
              </AppCard>

              <AppCard className="p-6" soft>
                <h2 style={titleStyle}>Recommendation</h2>
                <p style={copyStyle}>
                  Current recommendation generated by the pipeline.
                </p>

                <div style={{ ...contentBlockStyle, marginTop: 14 }}>
                  {extractRecommendationText(state.insights, recommendationArtifact)}
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
                <h2 style={titleStyle}>Review findings</h2>
                <p style={copyStyle}>
                  Final quality-control findings from the review layer.
                </p>

                <div style={{ ...contentBlockStyle, marginTop: 14 }}>
                  {extractReviewText(reviewArtifact)}
                </div>
              </AppCard>
            </>
          )}

          {shouldShow(view, "output") && (
            <>
              <ArtifactCard
                title="Final CV preview"
                copy="Latest final CV draft stored in workspace state."
                value={finalCv}
                soft
              />

              <ArtifactCard
                title="Final cover letter preview"
                copy="Latest final cover letter draft stored in workspace state."
                value={finalCoverLetter}
                soft
              />
            </>
          )}

          {shouldShow(view, "output") && (
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
  const text = value ? formatUnknownAsLines(value) : "";

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

function SectionBlock({
  title,
  content,
}: {
  title: string;
  content: string;
}) {
  return (
    <div>
      <div style={sectionTitleStyle}>{title}</div>
      <div style={sectionContentStyle}>{content}</div>
    </div>
  );
}

function SectionListBlock({
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
      <div style={sectionTitleStyle}>{title}</div>
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

const sectionTitleStyle: CSSProperties = {
  fontSize: 13,
  fontWeight: 800,
  color: t.colors.textPrimary,
  letterSpacing: "0.01em",
  textTransform: "uppercase",
};

const sectionContentStyle: CSSProperties = {
  marginTop: 8,
  borderRadius: t.radius.md,
  border: `1px solid ${t.colors.border}`,
  background: t.colors.surface,
  padding: 14,
  fontSize: 14,
  lineHeight: 1.7,
  color: t.colors.textSecondary,
  whiteSpace: "pre-wrap",
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