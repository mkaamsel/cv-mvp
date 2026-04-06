"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AppCard from "@/components/ui/AppCard";
import SectionLabel from "@/components/ui/SectionLabel";
import { useWorkspace } from "@/components/workspace/WorkspaceProvider";
import type {
  WorkspaceCandidateProfile,
  WorkspaceFinalDrafts,
  WorkspaceInsights,
} from "@/lib/workspace/types";
import { designTokens } from "@/lib/design/tokens";

const t = designTokens;

// ── Tab types ─────────────────────────────────────────────────────────────────

type CandidateTab = "recommendation" | "strengthen" | "reasoning" | "docs";
type InternalView = "overview" | "extraction" | "reasoning_internal" | "output" | "audit";
type StrengthPhase = "idle" | "questions" | "submitting" | "running" | "done" | "no-gaps";

// ── Utility helpers ───────────────────────────────────────────────────────────

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

// ── Data extraction helpers ───────────────────────────────────────────────────

function getWorkspaceRecord(state: unknown): Record<string, unknown> {
  return asRecord(state) ?? {};
}

function getInsightsRecord(
  insights: WorkspaceInsights | null,
): Record<string, unknown> {
  return asRecord(insights) ?? {};
}

function getInsightsBundle(
  insights: WorkspaceInsights | null,
): Record<string, unknown> {
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
  return pickFirstDefined(
    record.jobProfile,
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
  return pickFirstDefined(
    insightsRecord.reviewReport,
    bundle.reviewReport,
    finalDrafts?.reviewFindings,
    asRecord(insights?.rawResponse)?.reviewReport,
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
  return [];
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
      return {
        requirement:
          asString(record.requirement) ||
          asString(record.competency) ||
          asString(record.title) ||
          "Untitled requirement",
        importance: asString(record.importance) || "supporting",
        matchStatus: asString(record.matchStatus) || "unknown",
        notes:
          asString(record.notes) ||
          asString(record.rationale) ||
          asString(record.summary) ||
          stringifyUnknown(item),
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
  if (whyFit.length)
    chunks.push(
      ["Core why fit:", ...whyFit.map((i) => `• ${i}`)].join("\n"),
    );
  if (risks.length)
    chunks.push(
      ["Positioning risks:", ...risks.map((i) => `• ${i}`)].join("\n"),
    );
  if (emphasis.length)
    chunks.push(
      ["CV emphasis:", ...emphasis.map((i) => `• ${i}`)].join("\n"),
    );
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
  const riskAreas = asStringArray(record.riskAreas);
  const blockers = asStringArray(record.blockers);
  if (strongMatches.length)
    chunks.push(
      ["Strong matches:", ...strongMatches.map((i) => `• ${i}`)].join("\n"),
    );
  if (riskAreas.length)
    chunks.push(
      ["Risk areas:", ...riskAreas.map((i) => `• ${i}`)].join("\n"),
    );
  if (blockers.length)
    chunks.push(
      ["Blockers:", ...blockers.map((i) => `• ${i}`)].join("\n"),
    );
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
  if (cvReport || coverLetterReport) {
    const sections: string[] = [];
    if (cvReport)
      sections.push(
        ["CV review:", buildReviewSectionText(cvReport)].join("\n"),
      );
    if (coverLetterReport)
      sections.push(
        [
          "Cover letter review:",
          buildReviewSectionText(coverLetterReport),
        ].join("\n"),
      );
    return sections.join("\n\n");
  }
  return buildReviewSectionText(asRecord(record.reviewReport) ?? record);
}

function buildReviewSectionText(
  reviewReport: Record<string, unknown>,
): string {
  const chunks: string[] = [];
  const truthCheck = asString(reviewReport.truthCheck);
  const inflationRisk = asString(reviewReport.inflationRisk);
  if (truthCheck) chunks.push(`Truth check: ${truthCheck}`);
  if (inflationRisk) chunks.push(`Inflation risk: ${inflationRisk}`);
  const unsupportedClaims = asStringArray(reviewReport.unsupportedClaims);
  const weakEvidence = asStringArray(reviewReport.weakEvidence);
  if (unsupportedClaims.length)
    chunks.push(
      [
        "Unsupported claims:",
        ...unsupportedClaims.map((i) => `• ${i}`),
      ].join("\n"),
    );
  if (weakEvidence.length)
    chunks.push(
      ["Weak evidence:", ...weakEvidence.map((i) => `• ${i}`)].join("\n"),
    );
  return chunks.join("\n\n") || stringifyUnknown(reviewReport);
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
      const r = asRecord(item);
      if (!r) return typeof item === "string" ? item : null;
      const language = asString(r.language);
      const proficiency = asString(r.proficiency);
      if (!language) return null;
      return proficiency ? `${language} — ${proficiency}` : language;
    })
    .filter((item): item is string => Boolean(item));
}

function extractCandidateSkills(profile: unknown): string[] {
  const record = asRecord(profile);
  if (!record) return [];
  const raw = [
    ...asStringArray(record.coreSkills),
    ...asStringArray(record.tools),
    ...asStringArray(record.standards),
    ...asStringArray(record.industries),
  ];
  return Array.from(new Set(raw));
}

function extractCandidateExperience(profile: unknown): string[] {
  const record = asRecord(profile);
  if (!record) return [];
  return asArray(record.roles)
    .map((item) => {
      const r = asRecord(item);
      if (!r) return null;
      const title = asString(r.title);
      const company = asString(r.company);
      const startDate = asString(r.startDate);
      const endDate = asString(r.endDate);
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
      const r = asRecord(item);
      if (!r) return null;
      return [
        asString(r.degree),
        asString(r.field),
        asString(r.institution),
      ]
        .filter(Boolean)
        .join(" — ");
    })
    .filter((item): item is string => Boolean(item));
}

function extractCandidateCertifications(profile: unknown): string[] {
  const record = asRecord(profile);
  if (!record) return [];
  return asArray(record.certifications)
    .map((item) => {
      const r = asRecord(item);
      if (!r) return null;
      return [asString(r.name), asString(r.issuer), asString(r.date)]
        .filter(Boolean)
        .join(" — ");
    })
    .filter((item): item is string => Boolean(item));
}

function extractJobLines(job: unknown): string[] {
  const record = asRecord(job);
  if (!record) return [];
  return [
    asString(record.jobTitle) ? `Title: ${asString(record.jobTitle)}` : null,
    asString(record.companyName)
      ? `Company: ${asString(record.companyName)}`
      : null,
    asString(record.location)
      ? `Location: ${asString(record.location)}`
      : null,
    asString(record.summary)
      ? `Summary: ${asString(record.summary)}`
      : null,
  ].filter((item): item is string => Boolean(item));
}

// ── Recommendation display helpers ────────────────────────────────────────────

function getVerdictConfig(rec: string | undefined) {
  switch (rec) {
    case "apply_confidently":
      return {
        label: "Apply Confidently",
        color: "#166534",
        bg: "#dcfce7",
        border: "#86efac",
        description: "Your background aligns well with this role.",
      };
    case "apply_with_care":
      return {
        label: "Apply With Care",
        color: "#92400e",
        bg: "#fef3c7",
        border: "#fcd34d",
        description: "A credible application — some areas to address thoughtfully.",
      };
    case "borderline":
      return {
        label: "Borderline",
        color: "#9a3412",
        bg: "#ffedd5",
        border: "#fdba74",
        description:
          "A stretch, but worth trying with strong, honest positioning.",
      };
    case "not_recommended":
      return {
        label: "Long Shot — we can position you",
        color: "#7f1d1d",
        bg: "#fee2e2",
        border: "#fca5a5",
        description:
          "Significant gaps exist. We will argue your case as credibly as possible.",
      };
    default:
      return {
        label: "Analysis pending",
        color: "#475569",
        bg: "#f1f5f9",
        border: "#cbd5e1",
        description:
          "Run the pipeline from the Job step to see your recommendation.",
      };
  }
}

function getSeniorityFitLabel(
  bundle: Record<string, unknown> | null,
  positioningArtifact: unknown,
): string {
  const bundlePositioning = asRecord(bundle?.positioningBrief);
  const strength =
    asString(bundlePositioning?.positioningStrength) ||
    asString(asRecord(positioningArtifact)?.positioningStrength);
  const marketSignals = asRecord(bundle?.marketSignals);
  const roleLevel = asString(marketSignals?.senioritySignal);

  if (!strength && !roleLevel) return "Not assessed";
  if (strength === "strong") return "Well aligned with your level";
  if (strength === "solid") return "Aligned with your level";
  if (strength === "measured")
    return "Slightly above your current level — strong positioning can bridge this";
  if (roleLevel)
    return `Role targets ${roleLevel}-level experience — assess fit carefully`;
  return "Alignment assessed — see recommendation detail";
}

function extractPositioningHook(
  insights: WorkspaceInsights | null,
): string | null {
  const bundle = asRecord(insights?.bundle);
  const bundlePositioning = asRecord(bundle?.positioningBrief);
  const coreWhyFit = asStringArray(bundlePositioning?.coreWhyFit);
  if (coreWhyFit.length) return coreWhyFit[0];

  const posStr = asString(insights?.positioningBrief);
  if (posStr) {
    const firstLine = posStr.split("\n")[0].trim();
    if (firstLine.length > 10 && firstLine.length < 200) return firstLine;
  }
  return asString(insights?.positioningStrategy) || null;
}

// ── Strengthen helpers ────────────────────────────────────────────────────────

const PROGRESS_MESSAGES = [
  "Reviewing your updated profile...",
  "Matching your experience to this role...",
  "Preparing your positioning strategy...",
  "Almost done...",
];

function generateStrengthQuestions(
  blockers: string[],
  riskAreas: string[],
  missingSignals: string[],
): string[] {
  const seen = new Set<string>();
  const allGaps = [...blockers, ...riskAreas, ...missingSignals];
  const unique: string[] = [];
  for (const gap of allGaps) {
    const key = gap.toLowerCase().trim();
    if (!seen.has(key) && gap.trim()) {
      seen.add(key);
      unique.push(gap.trim());
    }
  }
  return unique
    .slice(0, 6)
    .map(
      (gap) =>
        `Can you tell me about your experience with: "${gap}"?`,
    );
}

// ── Pipeline response type ────────────────────────────────────────────────────

type TailoringResponse = {
  ok?: boolean;
  insights?: WorkspaceInsights;
  finalDrafts?: WorkspaceFinalDrafts;
  jobProfile?: Record<string, unknown>;
  message?: string;
};

// ── Main component ────────────────────────────────────────────────────────────

export default function WorkspaceInsightsPage() {
  const router = useRouter();
  const { state, progress, setInsights, setFinalDrafts, setCandidateProfile } =
    useWorkspace();

  // ── Candidate tab state
  const [activeTab, setActiveTab] = useState<CandidateTab>("recommendation");

  // ── Strengthen state
  const [strengthPhase, setStrengthPhase] = useState<StrengthPhase>("idle");
  const [strengthQuestions, setStrengthQuestions] = useState<string[]>([]);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [submittingAnswer, setSubmittingAnswer] = useState(false);
  const [progressMsgIdx, setProgressMsgIdx] = useState(0);
  const [hasBeenStrengthened, setHasBeenStrengthened] = useState(false);
  const [pipelineProfile, setPipelineProfile] = useState<unknown>(null);
  const [strengthError, setStrengthError] = useState<string | null>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );

  // ── Internal observability tab state (preserved)
  const [internalView, setInternalView] = useState<InternalView>("overview");

  // ── Derived data
  const insights = state.insights;
  const bundle = asRecord(insights?.bundle);
  const candidateProfile = getProfileArtifact(state);
  const structuredJob = getJobArtifact(insights, state);
  const requiredProfile = getRequiredProfileArtifact(insights, state);
  const selectedEvidenceArtifact = getSelectedEvidenceArtifact(insights, state);
  const positioningArtifact = getPositioningArtifact(insights, state);
  const recommendationArtifact = getRecommendationArtifact(insights, state);
  const reviewArtifact = getReviewArtifact(insights, state);
  const finalCv = getFinalCvArtifact(state);
  const finalCoverLetter = getFinalCoverLetterArtifact(state);
  const pipelineTrace = getPipelineTrace(state);

  const selectedEvidence = extractSelectedEvidenceLines(selectedEvidenceArtifact);
  const requirementsAnalysis = extractRequirementAnalysis(insights);
  const strongMatches = extractList(insights?.strongMatches);
  const stretchMatches = extractList(insights?.stretchMatches);
  const blockers = extractList(insights?.blockers);
  const riskAreas = extractList(insights?.riskAreas);
  const missingSignals = extractList(insights?.missingSignals);

  const candidateSummary = extractCandidateSummary(candidateProfile);
  const candidateLanguages = extractCandidateLanguages(candidateProfile);
  const candidateSkills = extractCandidateSkills(candidateProfile);
  const candidateExperience = extractCandidateExperience(candidateProfile);
  const candidateEducation = extractCandidateEducation(candidateProfile);
  const candidateCertifications = extractCandidateCertifications(candidateProfile);
  const jobHeaderLines = extractJobLines(structuredJob);
  const jobResponsibilities = asStringArray(
    asRecord(structuredJob)?.responsibilities,
  );
  const jobRequirements = asStringArray(asRecord(structuredJob)?.requirements);

  const verdict = getVerdictConfig(insights?.applicationRecommendation);
  const seniorityFit = getSeniorityFitLabel(bundle, positioningArtifact);
  const positioningHook = extractPositioningHook(insights);

  const hasInsights = Boolean(insights);
  const jobTitle =
    asString(asRecord(structuredJob)?.jobTitle) ||
    asString(asRecord(state.jobProfile)?.jobTitle) ||
    "this role";
  const companyName =
    asString(asRecord(structuredJob)?.companyName) ||
    asString(asRecord(state.jobProfile)?.companyName) ||
    "";

  // ── Strengthen: initialise when tab first activated
  useEffect(() => {
    if (
      activeTab !== "strengthen" ||
      hasBeenStrengthened ||
      strengthPhase !== "idle"
    )
      return;
    const questions = generateStrengthQuestions(
      blockers,
      riskAreas,
      missingSignals,
    );
    if (questions.length === 0) {
      setStrengthPhase("no-gaps");
    } else {
      setStrengthQuestions(questions);
      setStrengthPhase("questions");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  useEffect(() => {
    return () => {
      if (progressIntervalRef.current)
        clearInterval(progressIntervalRef.current);
    };
  }, []);

  async function handleAnswerSubmit() {
    if (!currentAnswer.trim() || submittingAnswer) return;
    setSubmittingAnswer(true);
    setStrengthError(null);

    let latestProfile: unknown = pipelineProfile ?? state.candidateProfile;

    try {
      const question = strengthQuestions[currentQuestionIdx];
      const response = await fetch("/api/profile/profile-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userMessage: currentAnswer.trim(),
          activePrompt: question,
          currentProfile: latestProfile,
        }),
      });
      const data = (await response.json()) as {
        ok: boolean;
        correctedProfile?: unknown;
      };
      if (data.ok && data.correctedProfile) {
        latestProfile = data.correctedProfile;
        setPipelineProfile(latestProfile);
        setCandidateProfile(latestProfile as WorkspaceCandidateProfile);
      }
    } catch {
      // Non-fatal — continue to next question
    }

    const nextIdx = currentQuestionIdx + 1;
    setCurrentAnswer("");
    setSubmittingAnswer(false);

    if (nextIdx >= strengthQuestions.length) {
      await runStrengthPipeline(latestProfile);
    } else {
      setCurrentQuestionIdx(nextIdx);
    }
  }

  function handleAnswerSkip() {
    const nextIdx = currentQuestionIdx + 1;
    setCurrentAnswer("");
    if (nextIdx >= strengthQuestions.length) {
      void runStrengthPipeline(pipelineProfile ?? state.candidateProfile);
    } else {
      setCurrentQuestionIdx(nextIdx);
    }
  }

  async function runStrengthPipeline(profileOverride: unknown) {
    setStrengthPhase("running");
    setProgressMsgIdx(0);

    progressIntervalRef.current = setInterval(() => {
      setProgressMsgIdx((prev) =>
        Math.min(prev + 1, PROGRESS_MESSAGES.length - 1),
      );
    }, 3500);

    try {
      const profileToSend =
        (profileOverride as Record<string, unknown> | null)?.rawResponse ??
        profileOverride;
      const payload: Record<string, unknown> = {
        outputLanguage: state.jobProfile?.outputLanguage || "en",
        candidateProfile: profileToSend,
      };
      if (state.jobText?.trim())
        payload.jobDescriptionText = state.jobText.trim();
      if (state.jobUrl?.trim()) payload.jobUrl = state.jobUrl.trim();

      const response = await fetch("/api/tailoring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as TailoringResponse;

      if (!response.ok || !data.ok) {
        setStrengthError(
          data.message ||
            "Something went wrong updating your application. Please try again.",
        );
        setStrengthPhase("questions");
      } else {
        if (data.insights) setInsights(data.insights);
        if (data.finalDrafts) setFinalDrafts(data.finalDrafts);
        setHasBeenStrengthened(true);
        setStrengthPhase("done");
      }
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Something went wrong.";
      setStrengthError(msg);
      setStrengthPhase("questions");
    } finally {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    }
  }

  // ── Reasoning tab — AI track detection
  const aiTrackFired = pipelineTrace.some((entry) =>
    entry.includes(":ai:done"),
  );
  const positioningBriefFull = extractPositioningBriefText(positioningArtifact);
  const advisorReasoning = extractRecommendationText(
    insights,
    recommendationArtifact,
  );

  // ── Audit tab data
  const generationInputBundle = {
    candidateProfile: state.candidateProfile ?? null,
    bundle: insights?.bundle ?? null,
  };
  const generationInputJson = stringifyUnknown(generationInputBundle);
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
    insights,
  });

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

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!insights?.bundle) return;
    console.group("[Prompt F — Generation input bundle]");
    console.log(
      "positioningBriefText:",
      insights.positioningBrief ?? "(none)",
    );
    console.log(
      "positioningStrategy:",
      insights.positioningStrategy ?? "(none)",
    );
    console.log("missingSignals:", insights.missingSignals ?? []);
    console.log("strongMatches:", insights.strongMatches ?? []);
    console.log("riskAreas:", insights.riskAreas ?? []);
    console.log("advisorMessage:", insights.advisorMessage ?? "(none)");
    console.log(
      "applicationRecommendation:",
      insights.applicationRecommendation ?? "(none)",
    );
    console.log("Full generation bundle:", generationInputBundle);
    console.groupEnd();
  }, [insights]);

  // ── Helpers for document preview
  function renderDocumentText(text: string | undefined | null) {
    if (!text)
      return (
        <span style={{ color: t.colors.textMuted, fontSize: 14 }}>
          No document available.
        </span>
      );
    return text.split("\n\n").map((block, i) => (
      <p key={i} style={docParaStyle}>
        {block.split("\n").map((line, j, arr) => (
          <span key={j}>
            {line}
            {j < arr.length - 1 && <br />}
          </span>
        ))}
      </p>
    ));
  }

  const currentCvText =
    state.finalDrafts?.finalCv ||
    state.finalDrafts?.cvDraft ||
    null;
  const currentCoverLetterText =
    state.finalDrafts?.finalCoverLetter ||
    state.finalDrafts?.coverLetterDraft ||
    null;

  return (
    <div style={{ display: "grid", gap: 20 }}>
      {/* ── Page header ──────────────────────────────────────────────────────── */}
      <AppCard className="p-6">
        <SectionLabel tone="blue">Insights</SectionLabel>
        <h1
          style={{
            margin: "14px 0 0",
            fontSize: 28,
            lineHeight: 1.2,
            letterSpacing: "-0.03em",
            color: t.colors.textPrimary,
          }}
        >
          {hasInsights
            ? `Your application${jobTitle !== "this role" ? `: ${jobTitle}` : ""}${companyName ? ` at ${companyName}` : ""}`
            : "Your application analysis"}
        </h1>
        {!hasInsights && (
          <p
            style={{
              margin: "12px 0 0",
              fontSize: 14,
              lineHeight: 1.7,
              color: t.colors.textSecondary,
            }}
          >
            Complete the Profile and Job steps, then run the analysis to see
            your personalised insights.
          </p>
        )}
        {state.insightsError ? (
          <div style={errorBannerStyle}>{state.insightsError}</div>
        ) : null}
      </AppCard>

      {/* ── Four candidate tabs ──────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          gap: 6,
          flexWrap: "wrap",
          padding: "0 2px",
        }}
      >
        {(
          [
            { key: "recommendation", label: "Recommendation" },
            { key: "strengthen", label: "Strengthen" },
            { key: "reasoning", label: "How I argued for you" },
            { key: "docs", label: "Docs", larger: true },
          ] as Array<{ key: CandidateTab; label: string; larger?: boolean }>
        ).map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: tab.larger ? "8px 22px" : "7px 16px",
              borderRadius: 999,
              border:
                activeTab === tab.key
                  ? `2px solid ${t.colors.primary}`
                  : `1px solid ${t.colors.border}`,
              background:
                activeTab === tab.key
                  ? t.colors.primary
                  : t.colors.surface,
              color:
                activeTab === tab.key
                  ? t.colors.textOnPrimary
                  : t.colors.textPrimary,
              fontSize: tab.larger ? 14 : 13,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── TAB: Recommendation ─────────────────────────────────────────────── */}
      {activeTab === "recommendation" && (
        <div style={{ display: "grid", gap: 16 }}>
          {!hasInsights ? (
            <AppCard className="p-6">
              <div style={emptyCardStyle}>
                No analysis available yet. Run the pipeline from the Job step
                to see your recommendation.
              </div>
              <div style={{ marginTop: 14, display: "flex", gap: 10 }}>
                <Link href="/workspace/job" style={primaryLinkStyle}>
                  Go to Job step
                </Link>
              </div>
            </AppCard>
          ) : (
            <>
              {/* Verdict card */}
              <AppCard className="p-6">
                <div
                  style={{
                    borderRadius: t.radius.md,
                    border: `2px solid ${verdict.border}`,
                    background: verdict.bg,
                    padding: "20px 24px",
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: verdict.color,
                      marginBottom: 8,
                    }}
                  >
                    Application verdict
                  </div>
                  <div
                    style={{
                      fontSize: 26,
                      fontWeight: 800,
                      color: verdict.color,
                      lineHeight: 1.2,
                      marginBottom: 8,
                    }}
                  >
                    {verdict.label}
                  </div>
                  <div
                    style={{
                      fontSize: 14,
                      color: verdict.color,
                      lineHeight: 1.5,
                      opacity: 0.85,
                    }}
                  >
                    {verdict.description}
                  </div>
                </div>

                {/* Seniority fit */}
                <div
                  style={{
                    marginTop: 16,
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    flexWrap: "wrap",
                  }}
                >
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: t.colors.textMuted,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    Seniority fit
                  </span>
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: t.colors.textPrimary,
                    }}
                  >
                    {seniorityFit}
                  </span>
                </div>

                {/* Positioning hook */}
                {positioningHook && (
                  <div
                    style={{
                      marginTop: 14,
                      padding: "12px 16px",
                      borderRadius: t.radius.md,
                      background: t.colors.backgroundSoft,
                      border: `1px solid ${t.colors.border}`,
                      fontSize: 15,
                      fontWeight: 600,
                      color: t.colors.textPrimary,
                      fontStyle: "italic",
                      lineHeight: 1.5,
                    }}
                  >
                    &ldquo;{positioningHook}&rdquo;
                  </div>
                )}

                {/* Advisor message */}
                {insights?.advisorMessage && (
                  <div
                    style={{
                      marginTop: 14,
                      fontSize: 14,
                      lineHeight: 1.7,
                      color: t.colors.textSecondary,
                    }}
                  >
                    {insights.advisorMessage}
                  </div>
                )}
              </AppCard>

              {/* Strengths */}
              <AppCard className="p-6">
                <h2 style={sectionHeadStyle}>Where you are strong</h2>
                {strongMatches.length > 0 ? (
                  <ul style={qualListStyle}>
                    {strongMatches.map((item, i) => (
                      <li key={i} style={qualItemStyle}>
                        <span
                          style={{ color: "#16a34a", marginRight: 8, flexShrink: 0 }}
                        >
                          ✓
                        </span>
                        {item}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div style={{ ...emptyCardStyle, marginTop: 12 }}>
                    No strong matches recorded yet.
                  </div>
                )}

                {stretchMatches.length > 0 && (
                  <>
                    <h3
                      style={{
                        margin: "20px 0 0",
                        fontSize: 14,
                        fontWeight: 800,
                        color: t.colors.textPrimary,
                      }}
                    >
                      Areas where you can stretch
                    </h3>
                    <ul style={{ ...qualListStyle, marginTop: 10 }}>
                      {stretchMatches.map((item, i) => (
                        <li key={i} style={qualItemStyle}>
                          <span
                            style={{
                              color: "#d97706",
                              marginRight: 8,
                              flexShrink: 0,
                            }}
                          >
                            ~
                          </span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </AppCard>

              {/* Gaps */}
              {(blockers.length > 0 ||
                riskAreas.length > 0 ||
                missingSignals.length > 0) && (
                <AppCard className="p-6">
                  <h2 style={sectionHeadStyle}>Areas to address</h2>

                  {blockers.length > 0 && (
                    <div style={{ marginTop: 16 }}>
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 800,
                          textTransform: "uppercase",
                          letterSpacing: "0.07em",
                          color: "#dc2626",
                          marginBottom: 8,
                        }}
                      >
                        Muss — critical requirements
                      </div>
                      <ul style={qualListStyle}>
                        {blockers.map((item, i) => (
                          <li
                            key={i}
                            style={{ ...qualItemStyle, color: "#7f1d1d" }}
                          >
                            <span
                              style={{
                                color: "#dc2626",
                                marginRight: 8,
                                flexShrink: 0,
                              }}
                            >
                              !
                            </span>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {riskAreas.length > 0 && (
                    <div
                      style={{ marginTop: blockers.length > 0 ? 18 : 16 }}
                    >
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 800,
                          textTransform: "uppercase",
                          letterSpacing: "0.07em",
                          color: "#d97706",
                          marginBottom: 8,
                        }}
                      >
                        Soll — important requirements
                      </div>
                      <ul style={qualListStyle}>
                        {riskAreas.map((item, i) => (
                          <li
                            key={i}
                            style={{ ...qualItemStyle, color: "#78350f" }}
                          >
                            <span
                              style={{
                                color: "#d97706",
                                marginRight: 8,
                                flexShrink: 0,
                              }}
                            >
                              △
                            </span>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {missingSignals.length > 0 && (
                    <div style={{ marginTop: 18 }}>
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 800,
                          textTransform: "uppercase",
                          letterSpacing: "0.07em",
                          color: "#64748b",
                          marginBottom: 8,
                        }}
                      >
                        Kann — preferred requirements
                      </div>
                      <ul style={qualListStyle}>
                        {missingSignals.map((item, i) => (
                          <li key={i} style={qualItemStyle}>
                            <span
                              style={{
                                color: "#94a3b8",
                                marginRight: 8,
                                flexShrink: 0,
                              }}
                            >
                              ○
                            </span>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </AppCard>
              )}

              {/* Continue to Final */}
              <AppCard className="p-5">
                <div
                  style={{
                    display: "flex",
                    gap: 12,
                    alignItems: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <div
                    style={{
                      flex: 1,
                      minWidth: 200,
                      fontSize: 14,
                      color: t.colors.textSecondary,
                      lineHeight: 1.5,
                    }}
                  >
                    {hasBeenStrengthened
                      ? "Your application has been strengthened. Your updated documents are ready."
                      : "Your documents are ready. Continue to review and send your application."}
                  </div>
                  <button
                    type="button"
                    onClick={() => router.push("/workspace/final")}
                    style={primaryButtonStyle}
                  >
                    Continue to Final
                  </button>
                </div>
              </AppCard>
            </>
          )}
        </div>
      )}

      {/* ── TAB: Strengthen ─────────────────────────────────────────────────── */}
      {activeTab === "strengthen" && (
        <AppCard className="p-6">
          {!hasInsights ? (
            <div style={emptyCardStyle}>
              Run the analysis first to see strengthening opportunities.
            </div>
          ) : hasBeenStrengthened || strengthPhase === "done" ? (
            <div
              style={{
                display: "grid",
                gap: 16,
                textAlign: "center",
                padding: "24px 0",
              }}
            >
              <div
                style={{
                  fontSize: 20,
                  fontWeight: 800,
                  color: t.colors.textPrimary,
                  lineHeight: 1.4,
                }}
              >
                I have done my best to position you for this role.
              </div>
              <div
                style={{
                  fontSize: 15,
                  color: t.colors.textSecondary,
                  lineHeight: 1.7,
                  maxWidth: 480,
                  margin: "0 auto",
                }}
              >
                Your updated documents are ready. Head to the Final page to
                review and send your application.
              </div>
              <div>
                <button
                  type="button"
                  onClick={() => router.push("/workspace/final")}
                  style={primaryButtonStyle}
                >
                  Go to Final
                </button>
              </div>
            </div>
          ) : strengthPhase === "no-gaps" ? (
            <div
              style={{
                display: "grid",
                gap: 16,
                textAlign: "center",
                padding: "24px 0",
              }}
            >
              <div
                style={{
                  fontSize: 20,
                  fontWeight: 800,
                  color: t.colors.textPrimary,
                }}
              >
                Your profile is strong for this role.
              </div>
              <div
                style={{
                  fontSize: 15,
                  color: t.colors.textSecondary,
                  lineHeight: 1.7,
                }}
              >
                No further information needed. Your documents are ready.
              </div>
              <div>
                <button
                  type="button"
                  onClick={() => router.push("/workspace/final")}
                  style={primaryButtonStyle}
                >
                  Go to Final
                </button>
              </div>
            </div>
          ) : strengthPhase === "running" ? (
            <div
              style={{
                display: "grid",
                gap: 20,
                textAlign: "center",
                padding: "32px 0",
              }}
            >
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 600,
                  color: t.colors.textSecondary,
                  minHeight: 24,
                }}
              >
                {PROGRESS_MESSAGES[progressMsgIdx]}
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                {PROGRESS_MESSAGES.map((_, i) => (
                  <div
                    key={i}
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 999,
                      background:
                        i <= progressMsgIdx
                          ? t.colors.primary
                          : t.colors.border,
                      transition: "background 0.4s ease",
                    }}
                  />
                ))}
              </div>
            </div>
          ) : strengthPhase === "questions" && strengthQuestions.length > 0 ? (
            <div style={{ display: "grid", gap: 22 }}>
              {/* Progress bar */}
              <div
                style={{ display: "flex", alignItems: "center", gap: 12 }}
              >
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: t.colors.textMuted,
                    whiteSpace: "nowrap",
                  }}
                >
                  {currentQuestionIdx + 1} of {strengthQuestions.length}
                </div>
                <div
                  style={{
                    flex: 1,
                    height: 4,
                    borderRadius: 999,
                    background: t.colors.border,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${((currentQuestionIdx + 1) / strengthQuestions.length) * 100}%`,
                      height: "100%",
                      background: t.colors.primary,
                      borderRadius: 999,
                      transition: "width 0.3s ease",
                    }}
                  />
                </div>
              </div>

              {/* Question */}
              <div
                style={{
                  fontSize: 17,
                  fontWeight: 700,
                  color: t.colors.textPrimary,
                  lineHeight: 1.5,
                }}
              >
                {strengthQuestions[currentQuestionIdx]}
              </div>

              <div
                style={{
                  fontSize: 13,
                  color: t.colors.textMuted,
                  lineHeight: 1.6,
                }}
              >
                Your answer helps me position you more accurately. Any
                detail helps — even partial experience counts.
              </div>

              {/* Answer field */}
              <textarea
                value={currentAnswer}
                onChange={(e) => setCurrentAnswer(e.target.value)}
                placeholder="Type your answer here..."
                rows={4}
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: t.radius.md,
                  border: `1px solid ${t.colors.border}`,
                  background: t.colors.surface,
                  fontSize: 14,
                  lineHeight: 1.6,
                  color: t.colors.textPrimary,
                  resize: "vertical",
                  boxSizing: "border-box",
                  outline: "none",
                }}
              />

              {strengthError && (
                <div
                  style={{
                    fontSize: 13,
                    color: "#dc2626",
                    padding: "10px 14px",
                    background: "#fee2e2",
                    borderRadius: t.radius.sm,
                    lineHeight: 1.5,
                  }}
                >
                  {strengthError}
                </div>
              )}

              <div
                style={{
                  display: "flex",
                  gap: 12,
                  alignItems: "center",
                }}
              >
                <button
                  type="button"
                  onClick={() => void handleAnswerSubmit()}
                  disabled={!currentAnswer.trim() || submittingAnswer}
                  style={{
                    ...primaryButtonStyle,
                    opacity:
                      !currentAnswer.trim() || submittingAnswer ? 0.5 : 1,
                    cursor:
                      !currentAnswer.trim() || submittingAnswer
                        ? "not-allowed"
                        : "pointer",
                  }}
                >
                  {submittingAnswer
                    ? "Saving..."
                    : currentQuestionIdx + 1 === strengthQuestions.length
                      ? "Update my application"
                      : "Next"}
                </button>
                <button
                  type="button"
                  onClick={handleAnswerSkip}
                  disabled={submittingAnswer}
                  style={{
                    background: "none",
                    border: "none",
                    fontSize: 13,
                    color: t.colors.textMuted,
                    cursor: "pointer",
                    padding: "0 4px",
                  }}
                >
                  Skip this question
                </button>
              </div>
            </div>
          ) : (
            <div style={emptyCardStyle}>Preparing your questions...</div>
          )}
        </AppCard>
      )}

      {/* ── TAB: How I argued for you ────────────────────────────────────────── */}
      {activeTab === "reasoning" && (
        <div style={{ display: "grid", gap: 16 }}>
          {!hasInsights ? (
            <AppCard className="p-6">
              <div style={emptyCardStyle}>No analysis available yet.</div>
            </AppCard>
          ) : !aiTrackFired ? (
            <AppCard className="p-6">
              <div
                style={{
                  fontSize: 15,
                  color: t.colors.textSecondary,
                  lineHeight: 1.7,
                  padding: "8px 0",
                }}
              >
                I am still building my understanding of this role. My full
                reasoning will appear here soon.
              </div>
            </AppCard>
          ) : (
            <>
              {selectedEvidence.length > 0 && (
                <AppCard className="p-6">
                  <h2 style={sectionHeadStyle}>Evidence I selected for you</h2>
                  <p style={bodyTextStyle}>
                    These are the strongest points from your background that I
                    matched against what this role needs.
                  </p>
                  <ul style={{ ...qualListStyle, marginTop: 16 }}>
                    {selectedEvidence.map((item, i) => (
                      <li key={i} style={qualItemStyle}>
                        <span
                          style={{
                            color: "#16a34a",
                            marginRight: 8,
                            flexShrink: 0,
                          }}
                        >
                          ✓
                        </span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </AppCard>
              )}

              {positioningBriefFull &&
                positioningBriefFull !== "No positioning brief yet." && (
                  <AppCard className="p-6">
                    <h2 style={sectionHeadStyle}>How I positioned you</h2>
                    <p style={bodyTextStyle}>
                      This is the strategy I used to frame your background for
                      this specific role.
                    </p>
                    <div style={{ ...contentBlockStyle, marginTop: 14 }}>
                      {positioningBriefFull}
                    </div>
                  </AppCard>
                )}

              {(blockers.length > 0 || riskAreas.length > 0) && (
                <AppCard className="p-6">
                  <h2 style={sectionHeadStyle}>How I handled the gaps</h2>
                  <p style={bodyTextStyle}>
                    Where your background did not directly match, I looked for
                    transferable evidence and framed it as credibly as
                    possible.
                  </p>
                  <ul style={{ ...qualListStyle, marginTop: 14 }}>
                    {[...blockers, ...riskAreas].map((item, i) => (
                      <li key={i} style={qualItemStyle}>
                        <span
                          style={{
                            color: "#d97706",
                            marginRight: 8,
                            flexShrink: 0,
                          }}
                        >
                          →
                        </span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </AppCard>
              )}

              {advisorReasoning &&
                advisorReasoning !== "No recommendation yet." && (
                  <AppCard className="p-6">
                    <h2 style={sectionHeadStyle}>My overall assessment</h2>
                    <div style={{ ...contentBlockStyle, marginTop: 14 }}>
                      {advisorReasoning}
                    </div>
                  </AppCard>
                )}
            </>
          )}
        </div>
      )}

      {/* ── TAB: Docs ────────────────────────────────────────────────────────── */}
      {activeTab === "docs" && (
        <div style={{ display: "grid", gap: 16 }}>
          {!state.finalDrafts ? (
            <AppCard className="p-6">
              <div style={emptyCardStyle}>
                No documents yet. Run the pipeline from the Job step to
                generate your CV and cover letter.
              </div>
            </AppCard>
          ) : (
            <>
              {hasBeenStrengthened && (
                <AppCard className="p-5">
                  <div
                    style={{
                      fontSize: 13,
                      color: t.colors.textSecondary,
                      lineHeight: 1.6,
                    }}
                  >
                    <strong>Your documents have been updated</strong> — see the
                    final versions on the{" "}
                    <Link
                      href="/workspace/final"
                      style={{
                        color: t.colors.primary,
                        textDecoration: "none",
                        fontWeight: 700,
                      }}
                    >
                      Final page
                    </Link>
                    . This tab shows the original version.
                  </div>
                </AppCard>
              )}

              <AppCard className="p-6">
                <h2 style={sectionHeadStyle}>
                  CV{hasBeenStrengthened ? " — Original version" : ""}
                </h2>
                <p style={{ ...bodyTextStyle, marginBottom: 0 }}>
                  Read-only preview. Download and send from the Final page.
                </p>
                <div style={docPreviewStyle}>
                  {renderDocumentText(currentCvText)}
                </div>
              </AppCard>

              <AppCard className="p-6">
                <h2 style={sectionHeadStyle}>
                  Cover Letter
                  {hasBeenStrengthened ? " — Original version" : ""}
                </h2>
                <p style={{ ...bodyTextStyle, marginBottom: 0 }}>
                  Read-only preview. Download and send from the Final page.
                </p>
                <div style={docPreviewStyle}>
                  {renderDocumentText(currentCoverLetterText)}
                </div>
              </AppCard>
            </>
          )}
        </div>
      )}

      {/* ── Internal divider ─────────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "8px 0",
          marginTop: 8,
        }}
      >
        <div
          style={{ flex: 1, height: 1, background: t.colors.border }}
        />
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.07em",
            textTransform: "uppercase",
            color: t.colors.textMuted,
            background: t.colors.backgroundSoft,
            border: `1px solid ${t.colors.border}`,
            borderRadius: 999,
            padding: "3px 12px",
            whiteSpace: "nowrap",
          }}
        >
          Internal — remove before release
        </div>
        <div
          style={{ flex: 1, height: 1, background: t.colors.border }}
        />
      </div>

      {/* ── Internal: pipeline status flags ──────────────────────────────────── */}
      <AppCard className="p-4">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: 10,
          }}
        >
          {pipelineFlags.map((item) => (
            <div
              key={item.label}
              style={{
                borderRadius: t.radius.md,
                border: `1px solid ${t.colors.border}`,
                background: item.ready
                  ? t.colors.surface
                  : t.colors.backgroundSoft,
                padding: 12,
                display: "grid",
                gap: 4,
              }}
            >
              <div
                style={{
                  fontSize: 11,
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
                  fontSize: 13,
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

      {/* ── Internal: tab bar ─────────────────────────────────────────────────── */}
      <AppCard className="p-4">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {(
            [
              { key: "overview", label: "Overview" },
              { key: "extraction", label: "Extraction" },
              { key: "reasoning_internal", label: "Reasoning" },
              { key: "output", label: "Output" },
              { key: "audit", label: "Audit" },
            ] as Array<{ key: InternalView; label: string }>
          ).map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setInternalView(item.key)}
              style={{
                borderRadius: 999,
                padding: "5px 12px",
                border:
                  internalView === item.key
                    ? `1px solid ${t.colors.primary}`
                    : `1px solid ${t.colors.border}`,
                background:
                  internalView === item.key
                    ? t.colors.primary
                    : t.colors.surface,
                color:
                  internalView === item.key
                    ? t.colors.textOnPrimary
                    : t.colors.textPrimary,
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      </AppCard>

      {/* ── Internal: Extraction + Overview ──────────────────────────────────── */}
      {(internalView === "overview" || internalView === "extraction") && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.08fr) minmax(300px, 0.92fr)",
            gap: 20,
            alignItems: "start",
          }}
        >
          <div style={{ display: "grid", gap: 20 }}>
            <AppCard className="p-6">
              <h2 style={internalTitleStyle}>Candidate profile</h2>
              <p style={internalCopyStyle}>
                Structured candidate data used by the engine.
              </p>
              {candidateProfile ? (
                <div style={{ display: "grid", gap: 16, marginTop: 14 }}>
                  {candidateSummary ? (
                    <SectionBlock
                      title="Summary"
                      content={candidateSummary}
                    />
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
              <h2 style={internalTitleStyle}>Structured job</h2>
              <p style={internalCopyStyle}>
                Structured job extraction feeding the intelligence layers.
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
          </div>

          <div style={{ display: "grid", gap: 20 }}>
            <AppCard className="p-6">
              <h2 style={internalTitleStyle}>Positioning brief</h2>
              <p style={internalCopyStyle}>
                Strategic framing the engine chose for this application.
              </p>
              <div style={{ ...contentBlockStyle, marginTop: 14 }}>
                {extractPositioningBriefText(positioningArtifact)}
              </div>
            </AppCard>

            <AppCard className="p-6" soft>
              <h2 style={internalTitleStyle}>Recommendation</h2>
              <p style={internalCopyStyle}>
                Current recommendation from the pipeline.
              </p>
              <div style={{ ...contentBlockStyle, marginTop: 14 }}>
                {extractRecommendationText(insights, recommendationArtifact)}
              </div>
              <div style={{ marginTop: 14 }}>
                <StatusLine
                  label="Application posture"
                  value={
                    insights?.applicationRecommendation ?? "not available"
                  }
                />
              </div>
            </AppCard>

            <AppCard className="p-6" soft>
              <h2 style={internalTitleStyle}>Strengths and risks</h2>
              <div style={{ display: "grid", gap: 16, marginTop: 14 }}>
                <MiniListBlock
                  title="Strong matches"
                  items={strongMatches}
                  emptyText="No strong matches yet."
                />
                <MiniListBlock
                  title="Stretch matches"
                  items={stretchMatches}
                  emptyText="No stretch matches yet."
                />
                <MiniListBlock
                  title="Missing signals"
                  items={missingSignals}
                  emptyText="No missing signals."
                />
                <MiniListBlock
                  title="Blockers"
                  items={blockers}
                  emptyText="No blockers."
                />
              </div>
            </AppCard>

            <AppCard className="p-6">
              <h2 style={internalTitleStyle}>Review findings</h2>
              <div style={{ ...contentBlockStyle, marginTop: 14 }}>
                {extractReviewText(reviewArtifact)}
              </div>
            </AppCard>

            {(internalView === "overview" ||
              internalView === "output") && (
              <>
                <ArtifactCard
                  title="Final CV preview"
                  copy="Latest final CV in workspace."
                  value={finalCv}
                  soft
                />
                <ArtifactCard
                  title="Final cover letter preview"
                  copy="Latest cover letter in workspace."
                  value={finalCoverLetter}
                  soft
                />
                <AppCard className="p-6">
                  <h2 style={internalTitleStyle}>Workspace status</h2>
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
                      value={
                        progress.insightsReady ? "Ready" : "Pending"
                      }
                    />
                    <StatusLine
                      label="Final"
                      value={
                        progress.finalReady ? "Ready" : "Not ready"
                      }
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
                    disabled={
                      !progress.profileReady || !progress.jobReady
                    }
                  >
                    Continue to final
                  </button>
                </AppCard>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Internal: Reasoning detail ────────────────────────────────────────── */}
      {internalView === "reasoning_internal" && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.08fr) minmax(300px, 0.92fr)",
            gap: 20,
            alignItems: "start",
          }}
        >
          <div style={{ display: "grid", gap: 20 }}>
            <ArtifactCard
              title="Required profile"
              copy="Job interpretation layer. What the engine believes the role actually needs."
              value={requiredProfile}
            />

            <AppCard className="p-6">
              <h2 style={internalTitleStyle}>Selected evidence</h2>
              <p style={internalCopyStyle}>Evidence ranked for this role.</p>
              {selectedEvidence.length ? (
                <ul style={listStyle}>
                  {selectedEvidence.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              ) : (
                <EmptyBlock text="No evidence selected yet." />
              )}
            </AppCard>

            <AppCard className="p-6">
              <h2 style={internalTitleStyle}>Requirement analysis</h2>
              <p style={internalCopyStyle}>
                Requirement-by-requirement view of fit and risk.
              </p>
              {requirementsAnalysis.length ? (
                <div style={{ display: "grid", gap: 12, marginTop: 14 }}>
                  {requirementsAnalysis.map((item, i) => (
                    <div key={i} style={analysisRowStyle}>
                      <div style={analysisHeaderStyle}>
                        <span style={analysisBadgeStyle}>
                          {item.importance}
                        </span>
                        <span style={analysisBadgeStyle}>
                          {item.matchStatus}
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: 15,
                          fontWeight: 700,
                          color: t.colors.textPrimary,
                          lineHeight: 1.4,
                        }}
                      >
                        {item.requirement}
                      </div>
                      <div
                        style={{
                          fontSize: 14,
                          lineHeight: 1.6,
                          color: t.colors.textSecondary,
                        }}
                      >
                        {item.notes}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyBlock text="No requirement analysis yet." />
              )}
            </AppCard>
          </div>

          <div style={{ display: "grid", gap: 20 }}>
            <AppCard className="p-6">
              <h2 style={internalTitleStyle}>Positioning brief</h2>
              <div style={{ ...contentBlockStyle, marginTop: 14 }}>
                {extractPositioningBriefText(positioningArtifact)}
              </div>
            </AppCard>
            <AppCard className="p-6" soft>
              <h2 style={internalTitleStyle}>Recommendation</h2>
              <div style={{ ...contentBlockStyle, marginTop: 14 }}>
                {extractRecommendationText(insights, recommendationArtifact)}
              </div>
            </AppCard>
          </div>
        </div>
      )}

      {/* ── Internal: Output ──────────────────────────────────────────────────── */}
      {internalView === "output" && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.08fr) minmax(300px, 0.92fr)",
            gap: 20,
            alignItems: "start",
          }}
        >
          <div style={{ display: "grid", gap: 20 }}>
            <ArtifactCard
              title="Final CV preview"
              copy="Latest final CV in workspace state."
              value={finalCv}
              soft
            />
            <ArtifactCard
              title="Final cover letter preview"
              copy="Latest final cover letter in workspace state."
              value={finalCoverLetter}
              soft
            />
          </div>
          <div style={{ display: "grid", gap: 20 }}>
            <AppCard className="p-6">
              <h2 style={internalTitleStyle}>Workspace status</h2>
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
                style={{ ...primaryButtonStyle, width: "100%", marginTop: 16 }}
                disabled={!progress.profileReady || !progress.jobReady}
              >
                Continue to final
              </button>
            </AppCard>
          </div>
        </div>
      )}

      {/* ── Internal: Audit ──────────────────────────────────────────────────── */}
      {internalView === "audit" && (
        <div style={{ display: "grid", gap: 20 }}>
          <ArtifactCard
            title="Pipeline trace"
            copy="Execution trace of the last run. Confirms which layers fired."
            value={pipelineTrace}
          />

          <AppCard className="p-6">
            <h2 style={internalTitleStyle}>Generation input (Prompt F)</h2>
            <p style={internalCopyStyle}>
              The exact data block sent to the CV and cover letter generation
              prompts.
            </p>
            <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
              <div>
                <div style={internalFieldLabelStyle}>
                  Positioning brief text
                </div>
                <pre
                  style={{
                    ...preBlockStyle,
                    background: "#f0fdf4",
                    border: "1px solid #bbf7d0",
                  }}
                >
                  {insights?.positioningBrief
                    ? stringifyUnknown(insights.positioningBrief)
                    : "(not set)"}
                </pre>
              </div>
              <div>
                <div style={internalFieldLabelStyle}>
                  Positioning strategy
                </div>
                <pre
                  style={{
                    ...preBlockStyle,
                    background: "#f0fdf4",
                    border: "1px solid #bbf7d0",
                  }}
                >
                  {insights?.positioningStrategy ?? "(not set)"}
                </pre>
              </div>
              <div>
                <div style={internalFieldLabelStyle}>
                  Application recommendation:{" "}
                  {insights?.applicationRecommendation ?? "(none)"}
                </div>
                <pre
                  style={{
                    ...preBlockStyle,
                    background: "#fef9c3",
                    border: "1px solid #fde68a",
                  }}
                >
                  {insights?.advisorMessage ?? "(no advisor message)"}
                </pre>
              </div>
              <div>
                <div style={internalFieldLabelStyle}>
                  Risk areas / missing signals
                </div>
                <pre
                  style={{
                    ...preBlockStyle,
                    background: "#fff1f2",
                    border: "1px solid #fecdd3",
                  }}
                >
                  {(insights?.riskAreas ?? []).length > 0
                    ? (insights?.riskAreas ?? []).join("\n")
                    : "(none recorded)"}
                </pre>
              </div>
              <div>
                <div style={internalFieldLabelStyle}>
                  Full bundle (candidateProfile + all intelligence layers)
                </div>
                <pre style={preBlockStyle}>{generationInputJson}</pre>
              </div>
            </div>
          </AppCard>

          <AppCard className="p-6">
            <h2 style={internalTitleStyle}>Internal reasoning snapshot</h2>
            <p style={internalCopyStyle}>
              Full raw audit bundle for inspection.
            </p>
            <pre style={{ ...preBlockStyle, marginTop: 14 }}>
              {rawSnapshot}
            </pre>
          </AppCard>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

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
      <h2 style={internalTitleStyle}>{title}</h2>
      <p style={internalCopyStyle}>{copy}</p>
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
          {items.map((item, i) => (
            <li key={i}>{item}</li>
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
          {items.map((item, i) => (
            <li key={i}>{item}</li>
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

// ── Styles ────────────────────────────────────────────────────────────────────

const sectionHeadStyle: CSSProperties = {
  margin: 0,
  fontSize: 18,
  fontWeight: 800,
  color: t.colors.textPrimary,
};

const bodyTextStyle: CSSProperties = {
  margin: "8px 0 0",
  fontSize: 14,
  lineHeight: 1.7,
  color: t.colors.textSecondary,
};

const qualListStyle: CSSProperties = {
  margin: "12px 0 0",
  padding: 0,
  listStyle: "none",
  display: "grid",
  gap: 10,
};

const qualItemStyle: CSSProperties = {
  fontSize: 14,
  lineHeight: 1.6,
  color: t.colors.textSecondary,
  display: "flex",
  alignItems: "flex-start",
};

const internalTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: 18,
  fontWeight: 800,
  color: t.colors.textPrimary,
};

const internalCopyStyle: CSSProperties = {
  margin: "8px 0 0",
  fontSize: 14,
  lineHeight: 1.7,
  color: t.colors.textSecondary,
};

const sectionTitleStyle: CSSProperties = {
  fontSize: 12,
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
  fontSize: 12,
  fontWeight: 800,
  color: t.colors.textPrimary,
  letterSpacing: "0.01em",
  textTransform: "uppercase",
};

const contentBlockStyle: CSSProperties = {
  borderRadius: t.radius.md,
  border: `1px solid ${t.colors.border}`,
  background: t.colors.surface,
  padding: 16,
  fontSize: 14,
  lineHeight: 1.7,
  color: t.colors.textSecondary,
  minHeight: 80,
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

const emptyMiniStyle: CSSProperties = {
  borderRadius: t.radius.sm,
  border: `1px solid ${t.colors.border}`,
  background: t.colors.surface,
  padding: 12,
  fontSize: 13,
  lineHeight: 1.6,
  color: t.colors.textSecondary,
};

const emptyCardStyle: CSSProperties = {
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

const primaryButtonStyle: CSSProperties = {
  height: 42,
  border: "none",
  borderRadius: t.radius.sm,
  background: t.colors.primary,
  color: t.colors.textOnPrimary,
  fontSize: 14,
  fontWeight: 700,
  padding: "0 20px",
  cursor: "pointer",
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
  padding: "10px 18px",
  textDecoration: "none",
};

const docPreviewStyle: CSSProperties = {
  marginTop: 16,
  padding: "24px 28px",
  background: "#FFFFFF",
  border: `1px solid ${t.colors.border}`,
  borderRadius: t.radius.md,
  maxWidth: 720,
};

const docParaStyle: CSSProperties = {
  margin: "0 0 14px 0",
  fontSize: 14,
  lineHeight: 1.75,
  color: t.colors.textPrimary,
  textAlign: "justify",
  fontFamily: "Georgia, 'Times New Roman', serif",
};

const internalFieldLabelStyle: CSSProperties = {
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  color: "#94a3b8",
  marginBottom: 6,
};
