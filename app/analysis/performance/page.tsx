"use client";

import { useEffect, useMemo, useState } from "react";

type EvaluationScope = "individual" | "collective" | "mixed";
type OutcomeFilter = "all" | "completed" | "failed";

type RunListItem = {
  id: string;
  client_run_id: string | null;
  run_outcome: string | null;
  updated_at: string;
  created_at: string;
  job_url?: string | null;
  normalized_url?: string | null;
  input_type?: string | null;
  output_language?: string | null;
  job_geography?: string | null;
  structured_job_json: Record<string, unknown> | null;
  extracted_text?: string | null;
  extraction_source?: string | null;
  warnings_json?: string[] | null;
  company_context_json?: Record<string, unknown> | null;
  market_signals_json?: Record<string, unknown> | null;
  company_research_json?: Record<string, unknown> | null;
  application_recommendation_json?: Record<string, unknown> | null;
  telemetry_json?: Record<string, unknown> | null;
  stage_statuses_json?: Record<string, unknown> | null;
  stage_durations_json?: Record<string, unknown> | null;
  final_cv_text?: string | null;
  final_cover_letter_text?: string | null;
  degraded_reasons_json?: string[] | null;
};

type EvaluationResponse = {
  ok: boolean;
  error?: string;
  evaluation?: {
    summary?: {
      scope?: string;
      domain?: string | null;
      overallAssessment?: string;
    };
    scores?: {
      overall?: number;
      extraction?: number;
      evidence?: number;
      generation?: number;
    };
    sourceCoverage?: {
      capturedWell?: string[];
      missedOrWeak?: string[];
    };
    stageAssessment?: Array<{
      runId?: string;
      domain?: string;
      strengths?: string[];
      weaknesses?: string[];
      lostSignals?: string[];
    }>;
    feedbackComparison?: {
      feedbackAvailable?: boolean;
      averageUserStars?: number | null;
      alignment?: string;
      alignmentNotes?: string[];
    };
    priorityFixes?: string[];
  };
  record?: {
    id: string;
    created_at: string;
  };
  meta?: {
    evaluatedRunCount?: number;
    feedbackEntries?: number;
  };
};

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: "#f6f7fb",
  padding: "32px 24px 48px",
  color: "#18212f",
};

const shellStyle: React.CSSProperties = {
  maxWidth: 1440,
  margin: "0 auto",
};

const cardStyle: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e7eaf0",
  borderRadius: 18,
  padding: 18,
  boxShadow: "0 1px 2px rgba(16,24,40,0.04)",
};

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(12, minmax(0, 1fr))",
  gap: 16,
};

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  color: "#667085",
  marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  border: "1px solid #d7dce5",
  borderRadius: 12,
  padding: "10px 12px",
  fontSize: 14,
  background: "#fff",
  color: "#18212f",
};

const buttonStyle: React.CSSProperties = {
  border: "none",
  borderRadius: 12,
  padding: "10px 14px",
  fontSize: 14,
  fontWeight: 700,
  cursor: "pointer",
  background: "#18212f",
  color: "#fff",
};

const secondaryButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  background: "#eef2f7",
  color: "#243041",
};

const badgeStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 999,
  padding: "6px 10px",
  fontSize: 12,
  fontWeight: 700,
  background: "#eef2f7",
  color: "#344054",
};

const mutedStyle: React.CSSProperties = {
  color: "#667085",
  fontSize: 13,
};

const listStyle: React.CSSProperties = {
  margin: 0,
  paddingLeft: 18,
  display: "grid",
  gap: 8,
};

const preStyle: React.CSSProperties = {
  margin: 0,
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
  fontSize: 13,
  lineHeight: 1.55,
  color: "#1f2937",
  background: "#f8fafc",
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  padding: 14,
  maxHeight: 360,
  overflow: "auto",
};

function scoreBar(score: number | undefined) {
  const value = Math.max(0, Math.min(100, Math.round(score ?? 0)));
  let background = "#dc2626";
  if (value >= 75) background = "#16a34a";
  else if (value >= 50) background = "#f59e0b";

  return (
    <div style={{ marginTop: 8 }}>
      <div
        style={{
          width: "100%",
          height: 10,
          background: "#edf1f5",
          borderRadius: 999,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${value}%`,
            height: "100%",
            background,
            borderRadius: 999,
          }}
        />
      </div>
    </div>
  );
}

function extractJobTitle(run: RunListItem): string {
  const job = run.structured_job_json ?? {};
  const record = typeof job === "object" && job ? (job as Record<string, unknown>) : {};
  const title =
    record.jobTitle ??
    record.title ??
    record.roleTitle ??
    record.positionTitle ??
    "Untitled role";
  return typeof title === "string" && title.trim() ? title.trim() : "Untitled role";
}

function extractCompanyName(run: RunListItem): string {
  const job = run.structured_job_json ?? {};
  const record = typeof job === "object" && job ? (job as Record<string, unknown>) : {};
  const company = record.companyName ?? record.company ?? record.employer ?? "Unknown company";
  return typeof company === "string" && company.trim() ? company.trim() : "Unknown company";
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function prettyJson(value: unknown): string {
  if (!value) return "—";
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function normalizeOutcome(value: string | null | undefined): "completed" | "failed" | "other" {
  const outcome = (value ?? "").toLowerCase();
  if (outcome === "completed" || outcome === "success" || outcome === "ok") return "completed";
  if (outcome === "failed" || outcome === "error") return "failed";
  return "other";
}

function matchesOutcomeFilter(run: RunListItem, filter: OutcomeFilter): boolean {
  if (filter === "all") return true;
  return normalizeOutcome(run.run_outcome) === filter;
}

function sortRunsCompletedFirst(items: RunListItem[]): RunListItem[] {
  return [...items].sort((a, b) => {
    const rank = (run: RunListItem) => {
      const outcome = normalizeOutcome(run.run_outcome);
      if (outcome === "completed") return 0;
      if (outcome === "failed") return 1;
      return 2;
    };

    const rankDiff = rank(a) - rank(b);
    if (rankDiff !== 0) return rankDiff;

    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  });
}

export default function AnalysisPerformancePage() {
  const [runs, setRuns] = useState<RunListItem[]>([]);
  const [selectedRunId, setSelectedRunId] = useState("");
  const [scope, setScope] = useState<EvaluationScope>("individual");
  const [outcomeFilter, setOutcomeFilter] = useState<OutcomeFilter>("completed");
  const [lastN, setLastN] = useState("10");
  const [domain, setDomain] = useState("finance");
  const [loadingRuns, setLoadingRuns] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<EvaluationResponse | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadRuns() {
      try {
        setLoadingRuns(true);
        setError("");

        const runsResponse = await fetch("/api/tailoring-runs/list", {
          method: "GET",
          cache: "no-store",
        });

        const listData = await runsResponse.json();

        if (!runsResponse.ok) {
          throw new Error(listData?.error || "Failed to load runs.");
        }

        const items = Array.isArray(listData?.runs) ? listData.runs : [];
        const sortedItems = sortRunsCompletedFirst(items);

        if (!cancelled) {
          setRuns(sortedItems);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load runs.");
          setRuns([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingRuns(false);
        }
      }
    }

    loadRuns();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredRuns = useMemo(
    () => runs.filter((run) => matchesOutcomeFilter(run, outcomeFilter)),
    [runs, outcomeFilter]
  );

  useEffect(() => {
    if (!filteredRuns.length) {
      setSelectedRunId("");
      return;
    }

    const stillExists = filteredRuns.some((run) => run.id === selectedRunId);
    if (!stillExists) {
      setSelectedRunId(filteredRuns[0].id);
    }
  }, [filteredRuns, selectedRunId]);

  const selectedRun = useMemo(
    () => filteredRuns.find((run) => run.id === selectedRunId) ?? null,
    [filteredRuns, selectedRunId]
  );

  async function runEvaluation(nextScope: EvaluationScope) {
    try {
      setEvaluating(true);
      setError("");
      setResult(null);

      const payload: Record<string, unknown> = { scope: nextScope };

      if (nextScope === "individual") {
        if (!selectedRunId) {
          throw new Error("Select one run first.");
        }
        payload.runId = selectedRunId;
      }

      if (nextScope === "collective") {
        payload.lastN = Number(lastN) || 10;
      }

      if (nextScope === "mixed") {
        payload.lastN = Number(lastN) || 10;
        payload.domain = domain;
      }

      const response = await fetch("/api/performance/evaluate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as EvaluationResponse;

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Evaluation failed.");
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Evaluation failed.");
    } finally {
      setEvaluating(false);
    }
  }

  return (
    <main style={pageStyle}>
      <div style={shellStyle}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 16,
            flexWrap: "wrap",
            marginBottom: 20,
          }}
        >
          <div>
            <h1 style={{ margin: 0, fontSize: 32, fontWeight: 800 }}>Performance</h1>
            <p style={{ ...mutedStyle, margin: "8px 0 0" }}>
              Evaluate source docs, run stages, final drafts, and user feedback.
            </p>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span style={badgeStyle}>{runs.length} runs loaded</span>
            <span style={badgeStyle}>{filteredRuns.length} shown</span>
            {result?.meta?.feedbackEntries ? (
              <span style={badgeStyle}>{result.meta.feedbackEntries} feedback entries</span>
            ) : null}
          </div>
        </div>

        <section style={gridStyle}>
          <div style={{ ...cardStyle, gridColumn: "span 4" }}>
            <div style={labelStyle}>Scope</div>
            <select
              value={scope}
              onChange={(event) => setScope(event.target.value as EvaluationScope)}
              style={inputStyle}
            >
              <option value="individual">Individual</option>
              <option value="collective">Collective</option>
              <option value="mixed">Mixed by domain</option>
            </select>

            <div style={{ marginTop: 14 }}>
              <div style={labelStyle}>Outcome filter</div>
              <select
                value={outcomeFilter}
                onChange={(event) => setOutcomeFilter(event.target.value as OutcomeFilter)}
                style={inputStyle}
              >
                <option value="completed">Completed first</option>
                <option value="failed">Failed only</option>
                <option value="all">All runs</option>
              </select>
            </div>

            {scope === "individual" ? (
              <div style={{ marginTop: 14 }}>
                <div style={labelStyle}>Run</div>
                <select
                  value={selectedRunId}
                  onChange={(event) => setSelectedRunId(event.target.value)}
                  style={inputStyle}
                  disabled={loadingRuns || filteredRuns.length === 0}
                >
                  <option value="">Select a run</option>
                  {filteredRuns.map((run) => (
                    <option key={run.id} value={run.id}>
                      {extractJobTitle(run)} · {run.id.slice(0, 8)} · {run.run_outcome || "unknown"} ·{" "}
                      {formatDate(run.updated_at)}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            {scope !== "individual" ? (
              <div style={{ marginTop: 14 }}>
                <div style={labelStyle}>Batch size</div>
                <select
                  value={lastN}
                  onChange={(event) => setLastN(event.target.value)}
                  style={inputStyle}
                >
                  <option value="2">Last 2</option>
                  <option value="3">Last 3</option>
                  <option value="5">Last 5</option>
                  <option value="10">Last 10</option>
                  <option value="25">Last 25</option>
                  <option value="50">Last 50</option>
                </select>
              </div>
            ) : null}

            {scope === "mixed" ? (
              <div style={{ marginTop: 14 }}>
                <div style={labelStyle}>Domain</div>
                <select
                  value={domain}
                  onChange={(event) => setDomain(event.target.value)}
                  style={inputStyle}
                >
                  <option value="finance">Finance</option>
                  <option value="healthcare">Healthcare</option>
                  <option value="engineering">Engineering</option>
                  <option value="it">IT</option>
                </select>
              </div>
            ) : null}

            <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => runEvaluation(scope)}
                style={buttonStyle}
                disabled={evaluating || loadingRuns}
              >
                {evaluating ? "Evaluating..." : "Run evaluation"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setResult(null);
                  setError("");
                }}
                style={secondaryButtonStyle}
              >
                Clear
              </button>
            </div>

            {selectedRun ? (
              <div style={{ marginTop: 16, display: "grid", gap: 8 }}>
                <span style={badgeStyle}>run id: {selectedRun.id}</span>
                {selectedRun.client_run_id ? (
                  <span style={badgeStyle}>client: {selectedRun.client_run_id}</span>
                ) : null}
                <span style={badgeStyle}>outcome: {selectedRun.run_outcome || "unknown"}</span>
              </div>
            ) : null}

            {error ? (
              <p style={{ color: "#b42318", fontSize: 13, marginTop: 14 }}>{error}</p>
            ) : null}
          </div>

          <div style={{ ...cardStyle, gridColumn: "span 8" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
              <div>
                <div style={labelStyle}>Overall</div>
                <div style={{ fontSize: 30, fontWeight: 800 }}>
                  {result?.evaluation?.scores?.overall ?? "—"}
                </div>
                {scoreBar(result?.evaluation?.scores?.overall)}
              </div>
              <div>
                <div style={labelStyle}>Extraction</div>
                <div style={{ fontSize: 30, fontWeight: 800 }}>
                  {result?.evaluation?.scores?.extraction ?? "—"}
                </div>
                {scoreBar(result?.evaluation?.scores?.extraction)}
              </div>
              <div>
                <div style={labelStyle}>Evidence</div>
                <div style={{ fontSize: 30, fontWeight: 800 }}>
                  {result?.evaluation?.scores?.evidence ?? "—"}
                </div>
                {scoreBar(result?.evaluation?.scores?.evidence)}
              </div>
              <div>
                <div style={labelStyle}>Generation</div>
                <div style={{ fontSize: 30, fontWeight: 800 }}>
                  {result?.evaluation?.scores?.generation ?? "—"}
                </div>
                {scoreBar(result?.evaluation?.scores?.generation)}
              </div>
            </div>

            <div style={{ marginTop: 18 }}>
              <div style={labelStyle}>Assessment</div>
              <div style={{ fontSize: 15, lineHeight: 1.6 }}>
                {result?.evaluation?.summary?.overallAssessment || "No evaluation yet."}
              </div>
            </div>

            <div style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span style={badgeStyle}>
                scope: {result?.evaluation?.summary?.scope || "—"}
              </span>
              <span style={badgeStyle}>
                domain: {result?.evaluation?.summary?.domain || "—"}
              </span>
              <span style={badgeStyle}>
                runs: {result?.meta?.evaluatedRunCount ?? 0}
              </span>
              {result?.record?.id ? (
                <span style={badgeStyle}>evaluation id: {result.record.id.slice(0, 8)}</span>
              ) : null}
            </div>
          </div>
        </section>

        <section style={{ ...gridStyle, marginTop: 16 }}>
          <div style={{ ...cardStyle, gridColumn: "span 4" }}>
            <h2 style={{ marginTop: 0, marginBottom: 12, fontSize: 18 }}>Captured well</h2>
            {result?.evaluation?.sourceCoverage?.capturedWell?.length ? (
              <ul style={listStyle}>
                {result.evaluation.sourceCoverage.capturedWell.map((item, index) => (
                  <li key={`${item}-${index}`}>{item}</li>
                ))}
              </ul>
            ) : (
              <p style={mutedStyle}>No data yet.</p>
            )}
          </div>

          <div style={{ ...cardStyle, gridColumn: "span 4" }}>
            <h2 style={{ marginTop: 0, marginBottom: 12, fontSize: 18 }}>Missed or weak</h2>
            {result?.evaluation?.sourceCoverage?.missedOrWeak?.length ? (
              <ul style={listStyle}>
                {result.evaluation.sourceCoverage.missedOrWeak.map((item, index) => (
                  <li key={`${item}-${index}`}>{item}</li>
                ))}
              </ul>
            ) : (
              <p style={mutedStyle}>No data yet.</p>
            )}
          </div>

          <div style={{ ...cardStyle, gridColumn: "span 4" }}>
            <h2 style={{ marginTop: 0, marginBottom: 12, fontSize: 18 }}>Priority fixes</h2>
            {result?.evaluation?.priorityFixes?.length ? (
              <ul style={listStyle}>
                {result.evaluation.priorityFixes.map((item, index) => (
                  <li key={`${item}-${index}`}>{item}</li>
                ))}
              </ul>
            ) : (
              <p style={mutedStyle}>No data yet.</p>
            )}
          </div>
        </section>

        <section style={{ ...gridStyle, marginTop: 16 }}>
          <div style={{ ...cardStyle, gridColumn: "span 7" }}>
            <h2 style={{ marginTop: 0, marginBottom: 12, fontSize: 18 }}>Stage assessment</h2>
            {result?.evaluation?.stageAssessment?.length ? (
              <div style={{ display: "grid", gap: 12 }}>
                {result.evaluation.stageAssessment.map((stage, index) => (
                  <div
                    key={`${stage.runId ?? "run"}-${index}`}
                    style={{
                      border: "1px solid #e7eaf0",
                      borderRadius: 14,
                      padding: 14,
                      background: "#fbfcfe",
                    }}
                  >
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                      <span style={badgeStyle}>run: {stage.runId || "—"}</span>
                      <span style={badgeStyle}>domain: {stage.domain || "—"}</span>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                      <div>
                        <div style={labelStyle}>Strengths</div>
                        {stage.strengths?.length ? (
                          <ul style={listStyle}>
                            {stage.strengths.map((item, i) => (
                              <li key={`${item}-${i}`}>{item}</li>
                            ))}
                          </ul>
                        ) : (
                          <p style={mutedStyle}>—</p>
                        )}
                      </div>

                      <div>
                        <div style={labelStyle}>Weaknesses</div>
                        {stage.weaknesses?.length ? (
                          <ul style={listStyle}>
                            {stage.weaknesses.map((item, i) => (
                              <li key={`${item}-${i}`}>{item}</li>
                            ))}
                          </ul>
                        ) : (
                          <p style={mutedStyle}>—</p>
                        )}
                      </div>

                      <div>
                        <div style={labelStyle}>Lost signals</div>
                        {stage.lostSignals?.length ? (
                          <ul style={listStyle}>
                            {stage.lostSignals.map((item, i) => (
                              <li key={`${item}-${i}`}>{item}</li>
                            ))}
                          </ul>
                        ) : (
                          <p style={mutedStyle}>—</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={mutedStyle}>No stage assessment yet.</p>
            )}
          </div>

          <div style={{ ...cardStyle, gridColumn: "span 5" }}>
            <h2 style={{ marginTop: 0, marginBottom: 12, fontSize: 18 }}>Feedback comparison</h2>
            <div style={{ display: "grid", gap: 10 }}>
              <div>
                <div style={labelStyle}>Feedback available</div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>
                  {result?.evaluation?.feedbackComparison?.feedbackAvailable ? "Yes" : "No"}
                </div>
              </div>
              <div>
                <div style={labelStyle}>Average user stars</div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>
                  {result?.evaluation?.feedbackComparison?.averageUserStars ?? "—"}
                </div>
              </div>
              <div>
                <div style={labelStyle}>Alignment</div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>
                  {result?.evaluation?.feedbackComparison?.alignment ?? "—"}
                </div>
              </div>
              <div>
                <div style={labelStyle}>Alignment notes</div>
                {result?.evaluation?.feedbackComparison?.alignmentNotes?.length ? (
                  <ul style={listStyle}>
                    {result.evaluation.feedbackComparison.alignmentNotes.map((item, index) => (
                      <li key={`${item}-${index}`}>{item}</li>
                    ))}
                  </ul>
                ) : (
                  <p style={mutedStyle}>No notes yet.</p>
                )}
              </div>
            </div>
          </div>
        </section>

        <section style={{ ...gridStyle, marginTop: 16 }}>
          <div style={{ ...cardStyle, gridColumn: "span 6" }}>
            <h2 style={{ marginTop: 0, marginBottom: 12, fontSize: 18 }}>Selected run summary</h2>
            {selectedRun ? (
              <div style={{ display: "grid", gap: 10 }}>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <span style={badgeStyle}>id: {selectedRun.id}</span>
                  {selectedRun.client_run_id ? (
                    <span style={badgeStyle}>client: {selectedRun.client_run_id}</span>
                  ) : null}
                  <span style={badgeStyle}>outcome: {selectedRun.run_outcome || "unknown"}</span>
                </div>
                <div style={{ ...mutedStyle, fontSize: 14 }}>
                  <strong style={{ color: "#18212f" }}>{extractJobTitle(selectedRun)}</strong>
                  {" · "}
                  {extractCompanyName(selectedRun)}
                </div>
                <div style={mutedStyle}>Updated: {formatDate(selectedRun.updated_at)}</div>
                <div style={mutedStyle}>Created: {formatDate(selectedRun.created_at)}</div>
                {selectedRun.input_type ? (
                  <div style={mutedStyle}>Input type: {selectedRun.input_type}</div>
                ) : null}
                {selectedRun.output_language ? (
                  <div style={mutedStyle}>Output language: {selectedRun.output_language}</div>
                ) : null}
                {selectedRun.job_geography ? (
                  <div style={mutedStyle}>Geography: {selectedRun.job_geography}</div>
                ) : null}
                {selectedRun.extraction_source ? (
                  <div style={mutedStyle}>Extraction source: {selectedRun.extraction_source}</div>
                ) : null}
                {selectedRun.job_url ? (
                  <div style={mutedStyle}>Job URL: {selectedRun.job_url}</div>
                ) : null}
                {asArray(selectedRun.warnings_json).length ? (
                  <div style={mutedStyle}>
                    Warnings: {prettyJson(selectedRun.warnings_json)}
                  </div>
                ) : null}
                {asArray(selectedRun.degraded_reasons_json).length ? (
                  <div style={mutedStyle}>
                    Degraded reasons: {prettyJson(selectedRun.degraded_reasons_json)}
                  </div>
                ) : null}
              </div>
            ) : (
              <p style={mutedStyle}>No run selected.</p>
            )}
          </div>

          <div style={{ ...cardStyle, gridColumn: "span 6" }}>
            <h2 style={{ marginTop: 0, marginBottom: 12, fontSize: 18 }}>Evaluation raw JSON</h2>
            <pre style={preStyle}>{prettyJson(result?.evaluation ?? null)}</pre>
          </div>
        </section>

        <section style={{ ...gridStyle, marginTop: 16 }}>
          <div style={{ ...cardStyle, gridColumn: "span 6" }}>
            <h2 style={{ marginTop: 0, marginBottom: 12, fontSize: 18 }}>Structured job</h2>
            <pre style={preStyle}>{prettyJson(selectedRun?.structured_job_json ?? null)}</pre>
          </div>

          <div style={{ ...cardStyle, gridColumn: "span 6" }}>
            <h2 style={{ marginTop: 0, marginBottom: 12, fontSize: 18 }}>Application recommendation</h2>
            <pre style={preStyle}>
              {prettyJson(selectedRun?.application_recommendation_json ?? null)}
            </pre>
          </div>
        </section>

        <section style={{ ...gridStyle, marginTop: 16 }}>
          <div style={{ ...cardStyle, gridColumn: "span 6" }}>
            <h2 style={{ marginTop: 0, marginBottom: 12, fontSize: 18 }}>Company and market context</h2>
            <div style={{ display: "grid", gap: 12 }}>
              <div>
                <div style={labelStyle}>Company context</div>
                <pre style={preStyle}>{prettyJson(selectedRun?.company_context_json ?? null)}</pre>
              </div>
              <div>
                <div style={labelStyle}>Company research</div>
                <pre style={preStyle}>{prettyJson(selectedRun?.company_research_json ?? null)}</pre>
              </div>
              <div>
                <div style={labelStyle}>Market signals</div>
                <pre style={preStyle}>{prettyJson(selectedRun?.market_signals_json ?? null)}</pre>
              </div>
            </div>
          </div>

          <div style={{ ...cardStyle, gridColumn: "span 6" }}>
            <h2 style={{ marginTop: 0, marginBottom: 12, fontSize: 18 }}>Stage telemetry</h2>
            <div style={{ display: "grid", gap: 12 }}>
              <div>
                <div style={labelStyle}>Stage statuses</div>
                <pre style={preStyle}>{prettyJson(selectedRun?.stage_statuses_json ?? null)}</pre>
              </div>
              <div>
                <div style={labelStyle}>Stage durations</div>
                <pre style={preStyle}>{prettyJson(selectedRun?.stage_durations_json ?? null)}</pre>
              </div>
              <div>
                <div style={labelStyle}>Telemetry</div>
                <pre style={preStyle}>{prettyJson(selectedRun?.telemetry_json ?? null)}</pre>
              </div>
            </div>
          </div>
        </section>

        <section style={{ ...gridStyle, marginTop: 16 }}>
          <div style={{ ...cardStyle, gridColumn: "span 6" }}>
            <h2 style={{ marginTop: 0, marginBottom: 12, fontSize: 18 }}>Extracted job text</h2>
            <pre style={preStyle}>{selectedRun?.extracted_text?.trim() || "—"}</pre>
          </div>

          <div style={{ ...cardStyle, gridColumn: "span 6" }}>
            <h2 style={{ marginTop: 0, marginBottom: 12, fontSize: 18 }}>Final CV</h2>
            <pre style={preStyle}>{selectedRun?.final_cv_text?.trim() || "—"}</pre>
          </div>
        </section>

        <section style={{ ...gridStyle, marginTop: 16 }}>
          <div style={{ ...cardStyle, gridColumn: "span 12" }}>
            <h2 style={{ marginTop: 0, marginBottom: 12, fontSize: 18 }}>Final cover letter</h2>
            <pre style={{ ...preStyle, maxHeight: 520 }}>
              {selectedRun?.final_cover_letter_text?.trim() || "—"}
            </pre>
          </div>
        </section>

        <section style={{ ...gridStyle, marginTop: 16 }}>
          <div style={{ ...cardStyle, gridColumn: "span 12" }}>
            <h2 style={{ marginTop: 0, marginBottom: 12, fontSize: 18 }}>Available runs</h2>
            {loadingRuns ? (
              <p style={mutedStyle}>Loading runs...</p>
            ) : filteredRuns.length ? (
              <div style={{ display: "grid", gap: 10 }}>
                {filteredRuns.slice(0, 20).map((run) => (
                  <button
                    key={run.id}
                    type="button"
                    onClick={() => {
                      setSelectedRunId(run.id);
                      setScope("individual");
                    }}
                    style={{
                      textAlign: "left",
                      border:
                        selectedRunId === run.id ? "2px solid #18212f" : "1px solid #e7eaf0",
                      borderRadius: 14,
                      padding: 14,
                      background: "#fff",
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ fontSize: 15, fontWeight: 700 }}>{extractJobTitle(run)}</div>
                    <div style={{ ...mutedStyle, marginTop: 4 }}>
                      {extractCompanyName(run)} · {run.run_outcome || "unknown"} · {formatDate(run.updated_at)}
                    </div>
                    <div style={{ ...mutedStyle, marginTop: 4 }}>run id: {run.id}</div>
                    {run.client_run_id ? (
                      <div style={{ ...mutedStyle, marginTop: 2 }}>
                        client run: {run.client_run_id}
                      </div>
                    ) : null}
                  </button>
                ))}
              </div>
            ) : (
              <p style={mutedStyle}>No runs found for this filter.</p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}