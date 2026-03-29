"use client";

import Link from "next/link";
import { useState } from "react";

type ReviewFinding = {
  severity: "high" | "medium" | "low";
  area: "cv" | "cover_letter" | "both";
  issue: string;
  recommendation: string;
};

type ReviewOutput = {
  reviewFindings: ReviewFinding[];
  finalCv: string;
  finalCoverLetter: string;
  profileDiscoverySignals: string[];
};

type CompetencyItem = {
  name: string;
  category:
    | "accounting_standard"
    | "closing"
    | "reporting"
    | "controls"
    | "systems"
    | "tax"
    | "treasury_interface"
    | "audit"
    | "process_improvement"
    | "transformation"
    | "stakeholder_management"
    | "leadership"
    | "industry_domain"
    | "language"
    | "qualification"
    | "analytics"
    | "customer_facing"
    | "operations"
    | "sales"
    | "other";
  weight: number;
  evidenceStrength: "high" | "medium" | "light";
  reasoning: string;
  sourceSupport: string;
};

type CompetencyProfileOutput = {
  competencies: CompetencyItem[];
  competencySummary: string;
  underEvidencedButRelevant: string[];
};

type SelectedEvidenceItem = {
  headline: string;
  evidenceType:
    | "core_experience"
    | "domain_experience"
    | "technical_accounting"
    | "systems"
    | "reporting"
    | "controls"
    | "leadership_signal"
    | "project_experience"
    | "stakeholder_exposure"
    | "language"
    | "qualification"
    | "other";
  strength: "high" | "medium" | "light";
  relevanceReason: string;
  sourceSupport: string;
};

type SelectedEvidenceOutput = {
  selectedEvidence: SelectedEvidenceItem[];
  evidenceGaps: string[];
  evidenceSummary: string;
};

type PositioningBriefOutput = {
  positioningStrength: "measured" | "solid" | "strong";
  positioningTone: "specialist" | "senior_specialist" | "leadership_adjacent";
  coreWhyFit: string[];
  positioningRisks: string[];
  positioningStrategy: string;
  coverLetterAngle: string;
  cvEmphasis: string[];
};

type GenerateResponse = {
  ok: boolean;
  status?: "success" | "partial" | "failed";
  warnings?: string[];
  runId?: string;
  mode: "fast" | "reviewed";
  outputLanguage: "English" | "German";
  intelligence?: {
    competencyProfile?: CompetencyProfileOutput;
    selectedEvidence?: SelectedEvidenceOutput;
    positioningBrief?: PositioningBriefOutput;
  };
  draft?: {
    cvDraft?: string;
    coverLetterDraft?: string;
    generationNotes?: string[];
  };
  review: ReviewOutput | null;
  error?: string;
};

function renderList(items?: string[]) {
  if (!items || items.length === 0) {
    return <p className="text-sm text-neutral-500">None.</p>;
  }

  return (
    <ul className="list-disc space-y-1 pl-5 text-sm text-neutral-800">
      {items.map((item, index) => (
        <li key={`${item}-${index}`}>{item}</li>
      ))}
    </ul>
  );
}

function competencyBand(weight: number) {
  if (weight >= 9) return "Core strength";
  if (weight >= 6) return "Established";
  if (weight >= 3) return "Supporting";
  return "Light signal";
}

function statusClass(status?: "success" | "partial" | "failed") {
  if (status === "success") {
    return "bg-green-100 text-green-800";
  }

  if (status === "partial") {
    return "bg-yellow-100 text-yellow-800";
  }

  if (status === "failed") {
    return "bg-red-100 text-red-800";
  }

  return "bg-neutral-200 text-neutral-700";
}

export default function TestGeneratePage() {
  const [candidateText, setCandidateText] = useState("");
  const [jobText, setJobText] = useState("");
  const [language, setLanguage] = useState<"EN" | "DE">("EN");
  const [loadingMode, setLoadingMode] = useState<"fast" | "reviewed" | null>(
    null
  );
  const [result, setResult] = useState<GenerateResponse | null>(null);
  const [error, setError] = useState("");

  async function runGeneration(mode: "fast" | "reviewed") {
    setLoadingMode(mode);
    setError("");
    setResult(null);

    try {
      const response = await fetch("/api/test-generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          candidateText,
          jobDescriptionText: jobText,
          outputLanguage: language === "DE" ? "German" : "English",
          mode,
        }),
      });

      const data: GenerateResponse | { error: string } = await response.json();

      if (!response.ok) {
        const message =
          typeof data === "object" &&
          data !== null &&
          "error" in data &&
          typeof data.error === "string"
            ? data.error
            : "Something went wrong.";

        setError(message);
        return;
      }

      setResult(data as GenerateResponse);
    } catch (err) {
      console.error(err);
      setError("Request failed.");
    } finally {
      setLoadingMode(null);
    }
  }

  const isLoading = loadingMode !== null;
  const competencyProfile = result?.intelligence?.competencyProfile;
  const selectedEvidence = result?.intelligence?.selectedEvidence;
  const positioningBrief = result?.intelligence?.positioningBrief;

  return (
    <main className="min-h-screen bg-white px-6 py-10 text-neutral-900">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight">
              BMS Internal Test UI
            </h1>
            <p className="mt-3 text-lg text-neutral-600">
              Paste CV text and Job Description text, then inspect competency
              mapping, evidence selection, positioning logic, draft quality, and
              optional review output.
            </p>
          </div>

          <Link
            href="/debug"
            className="rounded-2xl border border-neutral-300 px-5 py-3 text-sm font-medium text-neutral-800 transition hover:bg-neutral-50"
          >
            Open Debug Runs
          </Link>
        </div>

        <div className="mt-8 flex gap-3">
          <button
            type="button"
            onClick={() => setLanguage("EN")}
            className={`rounded-full border px-6 py-3 text-lg transition ${
              language === "EN"
                ? "border-black bg-black text-white"
                : "border-neutral-300 bg-white text-black"
            }`}
          >
            English
          </button>
          <button
            type="button"
            onClick={() => setLanguage("DE")}
            className={`rounded-full border px-6 py-3 text-lg transition ${
              language === "DE"
                ? "border-black bg-black text-white"
                : "border-neutral-300 bg-white text-black"
            }`}
          >
            German
          </button>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <section className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-2xl font-semibold">CV Text</h2>
            <textarea
              value={candidateText}
              onChange={(e) => setCandidateText(e.target.value)}
              placeholder="Paste candidate CV text here..."
              className="min-h-[420px] w-full resize-y rounded-2xl border border-neutral-300 p-4 text-lg outline-none focus:border-neutral-500"
            />
          </section>

          <section className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-2xl font-semibold">
              Job Description Text
            </h2>
            <textarea
              value={jobText}
              onChange={(e) => setJobText(e.target.value)}
              placeholder="Paste job description text here..."
              className="min-h-[420px] w-full resize-y rounded-2xl border border-neutral-300 p-4 text-lg outline-none focus:border-neutral-500"
            />
          </section>
        </div>

        <div className="mt-8 flex flex-wrap gap-4">
          <button
            type="button"
            onClick={() => runGeneration("fast")}
            disabled={isLoading}
            className="rounded-2xl bg-neutral-200 px-6 py-4 text-lg font-medium text-neutral-900 transition hover:bg-neutral-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loadingMode === "fast" ? "Generating Fast Draft..." : "Fast Draft"}
          </button>

          <button
            type="button"
            onClick={() => runGeneration("reviewed")}
            disabled={isLoading}
            className="rounded-2xl bg-black px-6 py-4 text-lg font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loadingMode === "reviewed"
              ? "Generating + Reviewing..."
              : "Generate + Review"}
          </button>
        </div>

        {error ? (
          <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-lg text-red-700">
            {error}
          </div>
        ) : null}

        {result ? (
          <div className="mt-10 space-y-8">
            <section className="rounded-3xl border border-neutral-200 bg-neutral-50 p-6">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-2xl font-semibold">Run Summary</h2>

                <span
                  className={`rounded-full px-3 py-1 text-sm font-medium ${statusClass(
                    result.status
                  )}`}
                >
                  Status: {result.status ?? "unknown"}
                </span>

                <span className="rounded-full bg-neutral-200 px-3 py-1 text-sm font-medium text-neutral-700">
                  Mode:{" "}
                  {result.mode === "fast" ? "Fast Draft" : "Generate + Review"}
                </span>

                <span className="rounded-full bg-neutral-200 px-3 py-1 text-sm font-medium text-neutral-700">
                  Output: {result.outputLanguage}
                </span>

                <span className="rounded-full bg-neutral-200 px-3 py-1 text-sm font-medium text-neutral-700">
                  Competencies: {competencyProfile?.competencies?.length ?? 0}
                </span>

                <span className="rounded-full bg-neutral-200 px-3 py-1 text-sm font-medium text-neutral-700">
                  Evidence Items:{" "}
                  {selectedEvidence?.selectedEvidence?.length ?? 0}
                </span>
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl bg-white p-4">
                  <h3 className="text-lg font-semibold">Run ID</h3>
                  <p className="mt-2 break-all font-mono text-sm text-neutral-700">
                    {result.runId ?? "Not returned"}
                  </p>
                </div>

                <div className="rounded-2xl bg-white p-4">
                  <h3 className="text-lg font-semibold">Debug Link</h3>
                  {result.runId ? (
                    <div className="mt-2">
                      <Link
                        href={`/debug/runs/${result.runId}`}
                        className="inline-flex rounded-xl border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-800 transition hover:bg-neutral-50"
                      >
                        Open This Run
                      </Link>
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-neutral-500">
                      No run ID available.
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-6">
                <h3 className="text-lg font-semibold">Warnings</h3>
                <div className="mt-2">{renderList(result.warnings)}</div>
              </div>

              <div className="mt-6">
                <h3 className="text-lg font-semibold">Generation Notes</h3>
                <div className="mt-2">
                  {renderList(result.draft?.generationNotes)}
                </div>
              </div>
            </section>

            {competencyProfile ? (
              <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
                <h2 className="text-2xl font-semibold">Competency Profile</h2>
                <p className="mt-4 text-sm leading-6 text-neutral-800">
                  {competencyProfile.competencySummary}
                </p>

                <h3 className="mt-6 text-lg font-semibold">
                  Under-evidenced but relevant
                </h3>
                <div className="mt-2">
                  {renderList(competencyProfile.underEvidencedButRelevant)}
                </div>

                <h3 className="mt-6 text-lg font-semibold">
                  Weighted Competencies
                </h3>
                <div className="mt-4 space-y-4">
                  {competencyProfile.competencies.map((item, index) => (
                    <div
                      key={`${item.name}-${index}`}
                      className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4"
                    >
                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full bg-neutral-200 px-3 py-1 text-xs font-medium uppercase tracking-wide text-neutral-700">
                          {item.category}
                        </span>
                        <span className="rounded-full bg-neutral-200 px-3 py-1 text-xs font-medium uppercase tracking-wide text-neutral-700">
                          Weight: {item.weight}
                        </span>
                        <span className="rounded-full bg-neutral-200 px-3 py-1 text-xs font-medium uppercase tracking-wide text-neutral-700">
                          {competencyBand(item.weight)}
                        </span>
                        <span className="rounded-full bg-neutral-200 px-3 py-1 text-xs font-medium uppercase tracking-wide text-neutral-700">
                          {item.evidenceStrength}
                        </span>
                      </div>
                      <p className="mt-3 text-sm font-semibold text-neutral-900">
                        {item.name}
                      </p>
                      <p className="mt-2 text-sm text-neutral-700">
                        <span className="font-medium">Reasoning:</span>{" "}
                        {item.reasoning}
                      </p>
                      <p className="mt-2 text-sm text-neutral-700">
                        <span className="font-medium">Source support:</span>{" "}
                        {item.sourceSupport}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {selectedEvidence ? (
              <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
                <h2 className="text-2xl font-semibold">
                  Selected Evidence Summary
                </h2>
                <p className="mt-4 text-sm leading-6 text-neutral-800">
                  {selectedEvidence.evidenceSummary}
                </p>

                <h3 className="mt-6 text-lg font-semibold">Evidence Gaps</h3>
                <div className="mt-2">
                  {renderList(selectedEvidence.evidenceGaps)}
                </div>

                <h3 className="mt-6 text-lg font-semibold">
                  Selected Evidence Items
                </h3>
                <div className="mt-4 space-y-4">
                  {selectedEvidence.selectedEvidence.map((item, index) => (
                    <div
                      key={`${item.headline}-${index}`}
                      className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4"
                    >
                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full bg-neutral-200 px-3 py-1 text-xs font-medium uppercase tracking-wide text-neutral-700">
                          {item.evidenceType}
                        </span>
                        <span className="rounded-full bg-neutral-200 px-3 py-1 text-xs font-medium uppercase tracking-wide text-neutral-700">
                          {item.strength}
                        </span>
                      </div>
                      <p className="mt-3 text-sm font-semibold text-neutral-900">
                        {item.headline}
                      </p>
                      <p className="mt-2 text-sm text-neutral-700">
                        <span className="font-medium">Why relevant:</span>{" "}
                        {item.relevanceReason}
                      </p>
                      <p className="mt-2 text-sm text-neutral-700">
                        <span className="font-medium">Source support:</span>{" "}
                        {item.sourceSupport}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {positioningBrief ? (
              <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
                <h2 className="text-2xl font-semibold">Positioning Brief</h2>

                <div className="mt-4 flex flex-wrap gap-3">
                  <span className="rounded-full bg-neutral-200 px-3 py-1 text-sm font-medium text-neutral-700">
                    Strength: {positioningBrief.positioningStrength}
                  </span>
                  <span className="rounded-full bg-neutral-200 px-3 py-1 text-sm font-medium text-neutral-700">
                    Tone: {positioningBrief.positioningTone}
                  </span>
                </div>

                <div className="mt-6">
                  <h3 className="text-lg font-semibold">Core Why Fit</h3>
                  <div className="mt-2">
                    {renderList(positioningBrief.coreWhyFit)}
                  </div>
                </div>

                <div className="mt-6">
                  <h3 className="text-lg font-semibold">Positioning Risks</h3>
                  <div className="mt-2">
                    {renderList(positioningBrief.positioningRisks)}
                  </div>
                </div>

                <div className="mt-6">
                  <h3 className="text-lg font-semibold">Positioning Strategy</h3>
                  <p className="mt-2 text-sm leading-6 text-neutral-800">
                    {positioningBrief.positioningStrategy}
                  </p>
                </div>

                <div className="mt-6">
                  <h3 className="text-lg font-semibold">Cover Letter Angle</h3>
                  <p className="mt-2 text-sm leading-6 text-neutral-800">
                    {positioningBrief.coverLetterAngle}
                  </p>
                </div>

                <div className="mt-6">
                  <h3 className="text-lg font-semibold">CV Emphasis</h3>
                  <div className="mt-2">
                    {renderList(positioningBrief.cvEmphasis)}
                  </div>
                </div>
              </section>
            ) : null}

            <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-semibold">Draft CV</h2>
              <pre className="mt-4 whitespace-pre-wrap rounded-2xl bg-neutral-50 p-4 text-sm leading-6 text-neutral-800">
                {result.draft?.cvDraft ?? ""}
              </pre>
            </section>

            <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-semibold">Draft Cover Letter</h2>
              <pre className="mt-4 whitespace-pre-wrap rounded-2xl bg-neutral-50 p-4 text-sm leading-6 text-neutral-800">
                {result.draft?.coverLetterDraft ?? ""}
              </pre>
            </section>

            {result.review ? (
              <>
                <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
                  <h2 className="text-2xl font-semibold">Review Findings</h2>

                  {result.review.reviewFindings.length === 0 ? (
                    <p className="mt-4 text-sm text-neutral-500">
                      No review findings returned.
                    </p>
                  ) : (
                    <div className="mt-4 space-y-4">
                      {result.review.reviewFindings.map((finding, index) => (
                        <div
                          key={`${finding.issue}-${index}`}
                          className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4"
                        >
                          <div className="flex flex-wrap gap-2">
                            <span className="rounded-full bg-neutral-200 px-3 py-1 text-xs font-medium uppercase tracking-wide text-neutral-700">
                              {finding.severity}
                            </span>
                            <span className="rounded-full bg-neutral-200 px-3 py-1 text-xs font-medium uppercase tracking-wide text-neutral-700">
                              {finding.area}
                            </span>
                          </div>
                          <p className="mt-3 text-sm font-semibold text-neutral-900">
                            {finding.issue}
                          </p>
                          <p className="mt-2 text-sm text-neutral-700">
                            {finding.recommendation}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
                  <h2 className="text-2xl font-semibold">Final CV</h2>
                  <pre className="mt-4 whitespace-pre-wrap rounded-2xl bg-neutral-50 p-4 text-sm leading-6 text-neutral-800">
                    {result.review.finalCv}
                  </pre>
                </section>

                <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
                  <h2 className="text-2xl font-semibold">
                    Final Cover Letter
                  </h2>
                  <pre className="mt-4 whitespace-pre-wrap rounded-2xl bg-neutral-50 p-4 text-sm leading-6 text-neutral-800">
                    {result.review.finalCoverLetter}
                  </pre>
                </section>

                <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
                  <h2 className="text-2xl font-semibold">
                    Profile Discovery Signals
                  </h2>
                  <div className="mt-4">
                    {renderList(result.review.profileDiscoverySignals)}
                  </div>
                </section>
              </>
            ) : null}
          </div>
        ) : null}
      </div>
    </main>
  );
}