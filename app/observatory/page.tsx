"use client";

import { type CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import { designTokens } from "@/lib/design/tokens";

const t = designTokens;

// ── Types ─────────────────────────────────────────────────────────────────────

type JsonObject = Record<string, unknown>;

type TailoringRun = {
  id: string;
  client_run_id: string | null;
  run_outcome: string | null;
  updated_at: string | null;
  created_at: string | null;
  job_url: string | null;
  normalized_url: string | null;
  input_type: string | null;
  output_language: string | null;
  job_geography: string | null;
  structured_job_json: JsonObject | null;
  extracted_text: string | null;
  extraction_source: string | null;
  warnings_json: string[] | null;
  company_context_json: JsonObject | null;
  market_signals_json: JsonObject | null;
  company_research_json: JsonObject | null;
  application_recommendation_json: JsonObject | null;
  telemetry_json: JsonObject | null;
  stage_statuses_json: JsonObject | null;
  stage_durations_json: JsonObject | null;
  final_cv_text: string | null;
  final_cover_letter_text: string | null;
  degraded_reasons_json: string[] | null;
  required_profile_json: JsonObject | null;
  selected_evidence_json: JsonObject | null;
  positioning_brief_json: JsonObject | null;
};

type RunListResponse = {
  ok: boolean;
  runs?: TailoringRun[];
  error?: string;
};

type DisplayRun = {
  id: string;
  clientRunId: string;
  label: string;
  outcome: "completed" | "limited" | "failed";
  createdAt: string | null;
  updatedAt: string | null;
  warnings: string[];
  degradedReasons: string[];
  source: "live" | "mock";
  raw: TailoringRun | null;
};

type LayerConfig = {
  number: number;
  id:
    | "candidateProfile"
    | "structuredJob"
    | "requiredProfile"
    | "companyContext"
    | "companyResearch"
    | "marketSignals"
    | "selectedEvidence"
    | "positioningBrief"
    | "recommendation"
    | "bundleAssembly"
    | "documentGeneration";
  name: string;
  track: "ai" | "rule" | "ai+rule";
};

type LayerTrace = {
  input: unknown;
  signals: unknown;
  output: unknown;
};

type AuditItem = {
  title: string;
  value: unknown;
};

const LAYERS: LayerConfig[] = [
  { number: 1, id: "candidateProfile", name: "Candidate Profile", track: "ai" },
  { number: 2, id: "structuredJob", name: "Structured Job", track: "ai" },
  { number: 3, id: "requiredProfile", name: "Required Profile", track: "ai+rule" },
  { number: 4, id: "companyContext", name: "Company Context", track: "ai" },
  { number: 5, id: "companyResearch", name: "Company Research", track: "ai" },
  { number: 6, id: "marketSignals", name: "Market Signals", track: "ai" },
  { number: 7, id: "selectedEvidence", name: "Selected Evidence", track: "ai+rule" },
  { number: 8, id: "positioningBrief", name: "Positioning Brief", track: "ai" },
  { number: 9, id: "recommendation", name: "Recommendation", track: "ai" },
  { number: 10, id: "bundleAssembly", name: "Bundle Assembly", track: "rule" },
  { number: 11, id: "documentGeneration", name: "Document Generation", track: "ai" },
];

const MOCK_DISPLAY_RUNS: DisplayRun[] = [
  {
    id: "mock-1",
    clientRunId: "mock-1",
    label: "mock-1 · reference run",
    outcome: "completed",
    createdAt: null,
    updatedAt: null,
    warnings: [],
    degradedReasons: [],
    source: "mock",
    raw: null,
  },
];

const EMPTY_TEXT = "No data available.";
const EMPTY_INPUT = "Input not recorded.";
const EMPTY_SIGNALS = "No telemetry recorded.";
const EMPTY_OUTPUT = "Layer output not recorded.";

// ── Helpers ───────────────────────────────────────────────────────────────────

function asObject(value: unknown): JsonObject | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonObject)
    : null;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
}

function mapOutcome(raw: string | null): DisplayRun["outcome"] {
  if (raw === "completed") return "completed";
  if (raw === "completed_with_limitations") return "limited";
  if (raw === "failed") return "failed";
  return "completed";
}

function formatRunDate(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const day = String(date.getDate()).padStart(2, "0");
  const month = date.toLocaleString("en-GB", { month: "short" });
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${day} ${month} ${year} · ${hours}:${minutes}`;
}

function formatRunLabel(run: TailoringRun): string {
  const shortId = (run.client_run_id || run.id).slice(0, 8);
  return `${shortId} · ${formatRunDate(run.created_at)}`;
}

function liveRunToDisplay(run: TailoringRun): DisplayRun {
  return {
    id: run.id,
    clientRunId: run.client_run_id ?? run.id,
    label: formatRunLabel(run),
    outcome: mapOutcome(run.run_outcome),
    createdAt: run.created_at,
    updatedAt: run.updated_at,
    warnings: asStringArray(run.warnings_json),
    degradedReasons: asStringArray(run.degraded_reasons_json),
    source: "live",
    raw: run,
  };
}

function formatDuration(value: unknown): string {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value >= 1000 ? `${(value / 1000).toFixed(1)}s` : `${value}ms`;
  }
  if (typeof value === "string" && value.trim()) return value;
  return "—";
}

function pretty(value: unknown, fallback: string): string {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "string") {
    return value.trim() ? value : fallback;
  }
  try {
    return JSON.stringify(value, null, 2) ?? fallback;
  } catch {
    return fallback;
  }
}

function getStageStatuses(run: TailoringRun | null): JsonObject | null {
  return asObject(run?.stage_statuses_json);
}

function getStageDurations(run: TailoringRun | null): JsonObject | null {
  return asObject(run?.stage_durations_json);
}

function getTelemetry(run: TailoringRun | null): JsonObject | null {
  return asObject(run?.telemetry_json);
}

function getStageSection(source: JsonObject | null, layerId: string): unknown {
  if (!source) return null;
  return (
    source[layerId] ??
    source[`${layerId}Stage`] ??
    source[`${layerId}Module`] ??
    source[`layer_${layerId}`] ??
    null
  );
}

function buildLayerTrace(run: TailoringRun | null, layerId: LayerConfig["id"]): LayerTrace {
  const telemetry = getTelemetry(run);
  const stageStatuses = getStageStatuses(run);
  const stageDurations = getStageDurations(run);

  const statusSection = getStageSection(stageStatuses, layerId);
  const durationSection = getStageSection(stageDurations, layerId);
  const telemetrySection = getStageSection(telemetry, layerId);

  const signals =
    telemetrySection || statusSection || durationSection
      ? {
          telemetry: telemetrySection ?? undefined,
          status: statusSection ?? undefined,
          duration: durationSection ?? undefined,
        }
      : null;

  switch (layerId) {
    case "candidateProfile":
      return {
        input: {
          extractionSource: run?.extraction_source ?? null,
          inputType: run?.input_type ?? null,
        },
        signals,
        output: null,
      };

    case "structuredJob":
      return {
        input: {
          extractedText: run?.extracted_text ?? null,
          jobUrl: run?.job_url ?? null,
          normalizedUrl: run?.normalized_url ?? null,
        },
        signals,
        output: run?.structured_job_json ?? null,
      };

    case "requiredProfile":
      return {
        input: run?.structured_job_json ?? null,
        signals,
        output: run?.required_profile_json ?? null,
      };

    case "companyContext":
      return {
        input: run?.structured_job_json ?? null,
        signals,
        output: run?.company_context_json ?? null,
      };

    case "companyResearch":
      return {
        input: {
          structuredJob: run?.structured_job_json ?? null,
          companyContext: run?.company_context_json ?? null,
        },
        signals,
        output: run?.company_research_json ?? null,
      };

    case "marketSignals":
      return {
        input: {
          structuredJob: run?.structured_job_json ?? null,
          companyResearch: run?.company_research_json ?? null,
        },
        signals,
        output: run?.market_signals_json ?? null,
      };

    case "selectedEvidence":
      return {
        input: {
          requiredProfile: run?.required_profile_json ?? null,
        },
        signals,
        output: run?.selected_evidence_json ?? null,
      };

    case "positioningBrief":
      return {
        input: {
          selectedEvidence: run?.selected_evidence_json ?? null,
        },
        signals,
        output: run?.positioning_brief_json ?? null,
      };

    case "recommendation":
      return {
        input: {
          companyContext: run?.company_context_json ?? null,
          companyResearch: run?.company_research_json ?? null,
          marketSignals: run?.market_signals_json ?? null,
        },
        signals,
        output: run?.application_recommendation_json ?? null,
      };

    case "bundleAssembly":
      return {
        input: {
          structuredJob: run?.structured_job_json ?? null,
          companyContext: run?.company_context_json ?? null,
          companyResearch: run?.company_research_json ?? null,
          marketSignals: run?.market_signals_json ?? null,
          recommendation: run?.application_recommendation_json ?? null,
        },
        signals,
        output: null,
      };

    case "documentGeneration":
      return {
        input: {
          recommendation: run?.application_recommendation_json ?? null,
        },
        signals,
        output:
          run?.final_cv_text || run?.final_cover_letter_text
            ? {
                finalCvText: run?.final_cv_text ?? null,
                finalCoverLetterText: run?.final_cover_letter_text ?? null,
              }
            : null,
      };

    default:
      return {
        input: null,
        signals: null,
        output: null,
      };
  }
}

function getLayerStatus(run: TailoringRun | null, layerId: string): "success" | "partial" | "error" {
  if (!run) return "success";
  const stageStatuses = getStageStatuses(run);
  const raw = getStageSection(stageStatuses, layerId);

  if (typeof raw === "string") {
    const value = raw.toLowerCase();
    if (value.includes("error") || value.includes("failed")) return "error";
    if (value.includes("partial") || value.includes("warning") || value.includes("degraded")) return "partial";
    return "success";
  }

  if (asObject(raw)) {
    const obj = asObject(raw)!;
    const status = typeof obj.status === "string" ? obj.status.toLowerCase() : "";
    if (status.includes("error") || status.includes("failed")) return "error";
    if (status.includes("partial") || status.includes("warning") || status.includes("degraded")) return "partial";
  }

  if (run.run_outcome === "failed") return "error";
  if (run.run_outcome === "completed_with_limitations") return "partial";
  return "success";
}

function getLayerDuration(run: TailoringRun | null, layerId: string): string {
  if (!run) return "—";
  const stageDurations = getStageDurations(run);
  const raw = getStageSection(stageDurations, layerId);

  if (typeof raw === "number" || typeof raw === "string") {
    return formatDuration(raw);
  }

  if (asObject(raw)) {
    const obj = asObject(raw)!;
    return formatDuration(obj.durationMs ?? obj.duration_ms ?? obj.duration ?? null);
  }

  return "—";
}

function statusDotColor(status: "success" | "partial" | "error"): string {
  if (status === "success") return "#4ade80";
  if (status === "partial") return "#fbbf24";
  return "#f87171";
}

function statusLabel(status: "success" | "partial" | "error"): string {
  if (status === "success") return "OK";
  if (status === "partial") return "Partial";
  return "Error";
}

function trackLabel(track: LayerConfig["track"]): string {
  if (track === "ai") return "AI";
  if (track === "rule") return "Rule";
  return "AI + Rule";
}

function trackColor(track: LayerConfig["track"]): string {
  if (track === "ai") return t.colors.accentPurple;
  if (track === "rule") return t.colors.backgroundSoft;
  return t.colors.accentGreen;
}

function outcomeChipStyle(outcome: DisplayRun["outcome"]): CSSProperties {
  const base: CSSProperties = {
    display: "inline-block",
    padding: "2px 9px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.03em",
  };
  if (outcome === "completed") return { ...base, background: t.colors.success, color: "#166534" };
  if (outcome === "limited") return { ...base, background: t.colors.warning, color: "#854d0e" };
  return { ...base, background: t.colors.danger, color: "#991b1b" };
}

// ── CollapsiblePanel ──────────────────────────────────────────────────────────

function CollapsiblePanel({
  header,
  children,
  defaultOpen = false,
  compact = false,
  forceOpen,
}: {
  header: React.ReactNode;
  children?: React.ReactNode;
  defaultOpen?: boolean;
  compact?: boolean;
  forceOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  // Sync to global expand/collapse. Using a ref to skip the initial render so
  // defaultOpen is not overridden on mount.
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) { mounted.current = true; return; }
    if (forceOpen !== undefined) setOpen(forceOpen);
  }, [forceOpen]);

  return (
    <div style={panelWrapStyle}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        style={{ ...panelHeaderStyle, padding: compact ? "10px 14px" : "12px 16px" }}
        aria-expanded={open}
      >
        <span style={chevronStyle(open)}>›</span>
        {header}
      </button>
      {open && children ? <div style={panelBodyStyle}>{children}</div> : null}
    </div>
  );
}

// ── Run Summary ───────────────────────────────────────────────────────────────

function SummaryField({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div style={summaryFieldStyle}>
      <span style={summaryFieldLabelStyle}>{label}</span>
      <span style={summaryFieldValueStyle}>{value}</span>
    </div>
  );
}

function RunSummaryPanel({ run }: { run: DisplayRun }) {
  const durationValue = useMemo(() => {
    const durations = getStageDurations(run.raw);
    if (!durations) return "—";
    const total =
      durations.total ??
      durations.totalMs ??
      durations.total_ms ??
      durations.pipelineTotal ??
      durations.pipeline_total;
    return formatDuration(total);
  }, [run.raw]);

  return (
    <div style={summaryPanelStyle}>
      <div style={summaryTitleStyle}>Run summary</div>
      <div style={summaryGridStyle}>
        <SummaryField label="Started at" value={formatRunDate(run.createdAt)} />
        <SummaryField label="Finished at" value={formatRunDate(run.updatedAt)} />
        <SummaryField label="Total duration" value={durationValue} />
        <SummaryField
          label="Warnings"
          value={
            run.warnings.length > 0 ? (
              <span style={warnValueStyle}>{run.warnings.length}</span>
            ) : (
              <span style={okValueStyle}>None</span>
            )
          }
        />
        <div style={summaryFieldStyle}>
          <span style={summaryFieldLabelStyle}>Fallback / degraded</span>
          {run.degradedReasons.length > 0 ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 3 }}>
              {run.degradedReasons.map((item) => (
                <span key={item} style={fallbackChipStyle}>
                  {item}
                </span>
              ))}
            </div>
          ) : (
            <span style={okValueStyle}>None</span>
          )}
        </div>
        <SummaryField
          label="Data source"
          value={
            run.source === "live" ? (
              <span style={okValueStyle}>Live</span>
            ) : (
              <span style={{ color: t.colors.textMuted }}>Mock</span>
            )
          }
        />
      </div>
    </div>
  );
}

// ── Trace sections ────────────────────────────────────────────────────────────

function TraceBlock({
  title,
  value,
  fallback,
}: {
  title: string;
  value: unknown;
  fallback: string;
}) {
  return (
    <div style={traceBlockStyle}>
      <div style={traceBlockTitleStyle}>{title}</div>
      <pre style={tracePreStyle}>{pretty(value, fallback)}</pre>
    </div>
  );
}

function LayerPanelBody({
  trace,
}: {
  trace: LayerTrace;
}) {
  return (
    <div style={traceGridStyle}>
      <TraceBlock title="Input" value={trace.input} fallback={EMPTY_INPUT} />
      <TraceBlock title="Signals" value={trace.signals} fallback={EMPTY_SIGNALS} />
      <TraceBlock title="Output" value={trace.output} fallback={EMPTY_OUTPUT} />
    </div>
  );
}

// ── Layer header ──────────────────────────────────────────────────────────────

function LayerHeader({
  layer,
  run,
}: {
  layer: LayerConfig;
  run: TailoringRun | null;
}) {
  const status = getLayerStatus(run, layer.id);
  const duration = getLayerDuration(run, layer.id);

  return (
    <div style={layerHeaderInnerStyle}>
      <span style={layerNumStyle}>L{layer.number}</span>
      <span style={layerNameStyle}>{layer.name}</span>
      <span style={{ flex: 1 }} />
      <span style={{ ...trackBadgeStyle, background: trackColor(layer.track) }}>
        {trackLabel(layer.track)}
      </span>
      <span style={durationStyle}>{duration}</span>
      <span style={statusChipStyle(status)}>
        <span style={{ ...dotStyle, background: statusDotColor(status) }} />
        {statusLabel(status)}
      </span>
    </div>
  );
}

// ── Audit panel ───────────────────────────────────────────────────────────────

function AuditPanel({ run }: { run: TailoringRun | null }) {
  const items: AuditItem[] = [
    { title: "Warnings", value: run?.warnings_json ?? null },
    { title: "Degraded reasons", value: run?.degraded_reasons_json ?? null },
    { title: "Stage statuses", value: run?.stage_statuses_json ?? null },
    { title: "Stage durations", value: run?.stage_durations_json ?? null },
    { title: "Telemetry", value: run?.telemetry_json ?? null },
  ];

  return (
    <div style={traceGridStyle}>
      {items.map((item) => (
        <TraceBlock
          key={item.title}
          title={item.title}
          value={item.value}
          fallback="No audit data recorded."
        />
      ))}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ObservatoryPage() {
  const [runs, setRuns] = useState<DisplayRun[]>(MOCK_DISPLAY_RUNS);
  const [runsLoading, setRunsLoading] = useState(true);
  const [runsError, setRunsError] = useState<string | null>(null);

  const [selectedRunId, setSelectedRunId] = useState<string>(MOCK_DISPLAY_RUNS[0].id);

  const [filterDate, setFilterDate] = useState("");
  const [filterUser, setFilterUser] = useState("");
  const [filterFailed, setFilterFailed] = useState(false);
  const [filterSuccess, setFilterSuccess] = useState(false);

  const [allExpanded, setAllExpanded] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchRuns() {
      setRunsLoading(true);
      setRunsError(null);

      try {
        const res = await fetch("/api/tailoring-runs/list");

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const json = (await res.json()) as RunListResponse;

        if (cancelled) return;

        if (json.ok && Array.isArray(json.runs) && json.runs.length > 0) {
          const liveRuns = json.runs.map(liveRunToDisplay);
          setRuns(liveRuns);
          setSelectedRunId(liveRuns[0].id);
        } else if (!json.ok) {
          setRunsError(json.error ?? "Run list unavailable.");
        }
      } catch (error) {
        if (!cancelled) {
          setRunsError(
            error instanceof Error ? error.message : "Could not reach the run list endpoint.",
          );
        }
      } finally {
        if (!cancelled) {
          setRunsLoading(false);
        }
      }
    }

    void fetchRuns();

    return () => {
      cancelled = true;
    };
  }, []);

  const selectedRun = runs.find((run) => run.id === selectedRunId) ?? runs[0];
  const isLiveData = runs.some((run) => run.source === "live");
  const selectedRawRun = selectedRun?.raw ?? null;

  const leftContextText = selectedRawRun?.extracted_text ?? EMPTY_TEXT;

  return (
    <div style={pageStyle}>
      <div style={pageHeaderStyle}>
        <div>
          <h1 style={pageTitleStyle}>Observatory</h1>
          <p style={pageSubtitleStyle}>Read-only · Product owner</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {isLiveData ? <span style={liveChipStyle}>Live data</span> : null}
          {!isLiveData && !runsLoading ? <span style={mockChipStyle}>Mock data</span> : null}
          <span style={roChipStyle}>Read-only</span>
        </div>
      </div>

      {runsError ? (
        <div style={errorBannerStyle}>Run list: {runsError}. Showing mock data.</div>
      ) : null}

      <div style={topBarStyle}>
        <div style={runSelectorAreaStyle}>
          <label style={filterLabelStyle} htmlFor="run-select">
            Run
          </label>
          <select
            id="run-select"
            value={selectedRunId}
            onChange={(e) => setSelectedRunId(e.target.value)}
            disabled={runsLoading}
            style={{ ...runSelectStyle, opacity: runsLoading ? 0.5 : 1 }}
          >
            {runsLoading ? (
              <option>Loading runs…</option>
            ) : (
              runs.map((run) => (
                <option key={run.id} value={run.id}>
                  {run.label}
                </option>
              ))
            )}
          </select>

          {!runsLoading && selectedRun ? (
            <span style={outcomeChipStyle(selectedRun.outcome)}>
              {selectedRun.outcome === "completed"
                ? "Completed"
                : selectedRun.outcome === "limited"
                  ? "With limitations"
                  : "Failed"}
            </span>
          ) : null}
        </div>

        <div style={filterAreaStyle}>
          <span style={filterLabelStyle}>Filter</span>

          <div style={filterGroupStyle}>
            <label style={filterLabelStyle} htmlFor="filter-date">
              Date
            </label>
            <input
              id="filter-date"
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              style={filterInputStyle}
            />
          </div>

          <div style={filterGroupStyle}>
            <label style={filterLabelStyle} htmlFor="filter-user">
              User
            </label>
            <input
              id="filter-user"
              type="text"
              value={filterUser}
              onChange={(e) => setFilterUser(e.target.value)}
              placeholder="filter not wired yet"
              style={filterInputStyle}
            />
          </div>

          <button
            type="button"
            onClick={() => setFilterFailed((value) => !value)}
            style={filterToggleStyle(filterFailed, "failed")}
          >
            Failed
          </button>

          <button
            type="button"
            onClick={() => setFilterSuccess((value) => !value)}
            style={filterToggleStyle(filterSuccess, "success")}
          >
            Success
          </button>
        </div>
      </div>

      {selectedRun ? <RunSummaryPanel run={selectedRun} /> : null}

      <div style={bodyStyle}>
        <div style={leftColStyle}>
          <div style={colLabelStyle}>Context</div>

          <CollapsiblePanel
            header={<span style={sidebarPanelTitleStyle}>Job Description Source</span>}
            compact
          >
            <pre style={sidebarTextStyle}>{leftContextText}</pre>
          </CollapsiblePanel>

          <CollapsiblePanel
            header={<span style={sidebarPanelTitleStyle}>Candidate Source</span>}
            compact
          >
            <pre style={sidebarTextStyle}>{EMPTY_TEXT}</pre>
          </CollapsiblePanel>
        </div>

        <div style={mainColStyle}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
            <div style={colLabelStyle}>Pipeline layers</div>
            <button
              type="button"
              onClick={() => setAllExpanded((prev) => (prev === true ? false : true))}
              style={expandCollapseButtonStyle}
            >
              {allExpanded === true ? "Collapse all" : "Expand all"}
            </button>
          </div>

          <div style={{ display: "grid", gap: 6 }}>
            {LAYERS.map((layer) => {
              const trace = buildLayerTrace(selectedRawRun, layer.id);

              return (
                <CollapsiblePanel
                  key={layer.id}
                  header={<LayerHeader layer={layer} run={selectedRawRun} />}
                  forceOpen={allExpanded ?? undefined}
                >
                  <LayerPanelBody trace={trace} />
                </CollapsiblePanel>
              );
            })}

            <CollapsiblePanel
              header={
                <div style={layerHeaderInnerStyle}>
                  <span style={{ ...layerNumStyle, background: t.colors.accentYellow }}>⚠</span>
                  <span style={layerNameStyle}>Warnings / Audit</span>
                  <span style={{ flex: 1 }} />
                  <span style={{ fontSize: 12, color: t.colors.textMuted }}>
                    Fallback events · Pipeline warnings · Observation log
                  </span>
                </div>
              }
              forceOpen={allExpanded ?? undefined}
            >
              <AuditPanel run={selectedRawRun} />
            </CollapsiblePanel>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const pageStyle: CSSProperties = {
  padding: "32px 40px 60px",
  maxWidth: 1380,
  minHeight: "100vh",
  background: t.colors.background,
  fontFamily: "inherit",
};

const pageHeaderStyle: CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  marginBottom: 24,
};

const pageTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: 22,
  fontWeight: 700,
  color: t.colors.textPrimary,
  letterSpacing: "-0.02em",
};

const pageSubtitleStyle: CSSProperties = {
  margin: "4px 0 0",
  fontSize: 12,
  color: t.colors.textMuted,
};

const roChipStyle: CSSProperties = {
  display: "inline-block",
  padding: "4px 10px",
  borderRadius: 999,
  border: `1px solid ${t.colors.border}`,
  background: t.colors.backgroundSoft,
  fontSize: 11,
  fontWeight: 700,
  color: t.colors.textMuted,
  letterSpacing: "0.04em",
};

const liveChipStyle: CSSProperties = {
  display: "inline-block",
  padding: "4px 10px",
  borderRadius: 999,
  background: t.colors.success,
  fontSize: 11,
  fontWeight: 700,
  color: "#166534",
  letterSpacing: "0.04em",
};

const mockChipStyle: CSSProperties = {
  display: "inline-block",
  padding: "4px 10px",
  borderRadius: 999,
  background: t.colors.accentYellow,
  fontSize: 11,
  fontWeight: 700,
  color: "#854d0e",
  letterSpacing: "0.04em",
};

const expandCollapseButtonStyle: CSSProperties = {
  padding: "4px 11px",
  borderRadius: t.radius.sm,
  border: `1px solid ${t.colors.border}`,
  background: t.colors.surface,
  fontSize: 12,
  fontWeight: 600,
  color: t.colors.textMuted,
  cursor: "pointer",
  letterSpacing: "0.01em",
};

const errorBannerStyle: CSSProperties = {
  marginBottom: 14,
  padding: "10px 16px",
  borderRadius: t.radius.md,
  border: `1px solid ${t.colors.border}`,
  background: t.colors.accentYellow,
  fontSize: 13,
  color: "#854d0e",
};

const topBarStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 24,
  flexWrap: "wrap",
  padding: "14px 18px",
  background: t.colors.surface,
  border: `1px solid ${t.colors.border}`,
  borderRadius: t.radius.md,
  boxShadow: t.shadow.sm,
  marginBottom: 16,
};

const runSelectorAreaStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  flex: "0 0 auto",
};

const filterAreaStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  flexWrap: "wrap",
  marginLeft: "auto",
};

const filterGroupStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
};

const filterLabelStyle: CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: t.colors.textMuted,
  whiteSpace: "nowrap",
};

const runSelectStyle: CSSProperties = {
  height: 34,
  padding: "0 10px",
  borderRadius: t.radius.sm,
  border: `1px solid ${t.colors.border}`,
  background: t.colors.surface,
  color: t.colors.textPrimary,
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  minWidth: 280,
};

const filterInputStyle: CSSProperties = {
  height: 32,
  padding: "0 10px",
  borderRadius: t.radius.sm,
  border: `1px solid ${t.colors.border}`,
  background: t.colors.surface,
  color: t.colors.textPrimary,
  fontSize: 13,
  outline: "none",
};

function filterToggleStyle(active: boolean, variant: "failed" | "success"): CSSProperties {
  const activeBg = variant === "failed" ? t.colors.danger : t.colors.success;
  const activeColor = variant === "failed" ? "#991b1b" : "#166534";
  return {
    height: 32,
    padding: "0 14px",
    borderRadius: t.radius.sm,
    border: active ? "none" : `1px solid ${t.colors.border}`,
    background: active ? activeBg : t.colors.surface,
    color: active ? activeColor : t.colors.textSecondary,
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
    transition: "background 0.12s, color 0.12s",
  };
}

const summaryPanelStyle: CSSProperties = {
  background: t.colors.surface,
  border: `1px solid ${t.colors.border}`,
  borderRadius: t.radius.md,
  boxShadow: t.shadow.sm,
  padding: "16px 20px",
  marginBottom: 20,
};

const summaryTitleStyle: CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: t.colors.textMuted,
  textTransform: "uppercase",
  letterSpacing: "0.07em",
  marginBottom: 12,
};

const summaryGridStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "10px 32px",
};

const summaryFieldStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 2,
  minWidth: 140,
};

const summaryFieldLabelStyle: CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: t.colors.textMuted,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

const summaryFieldValueStyle: CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: t.colors.textPrimary,
};

const warnValueStyle: CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  color: "#854d0e",
  background: t.colors.warning,
  padding: "1px 8px",
  borderRadius: 999,
};

const okValueStyle: CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: "#166534",
};

const fallbackChipStyle: CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: "#854d0e",
  background: t.colors.warning,
  padding: "2px 8px",
  borderRadius: 999,
};

const bodyStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "260px 1fr",
  gap: 16,
  alignItems: "start",
};

const leftColStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
};

const mainColStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
};

const colLabelStyle: CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  color: t.colors.textMuted,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  padding: "0 2px",
  marginBottom: 8,
};

const panelWrapStyle: CSSProperties = {
  background: t.colors.surface,
  border: `1px solid ${t.colors.border}`,
  borderRadius: t.radius.md,
  overflow: "hidden",
  boxShadow: t.shadow.sm,
};

const panelHeaderStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  width: "100%",
  background: "transparent",
  border: "none",
  cursor: "pointer",
  textAlign: "left",
};

function chevronStyle(open: boolean): CSSProperties {
  return {
    fontSize: 16,
    color: t.colors.textMuted,
    transition: "transform 0.15s",
    transform: open ? "rotate(90deg)" : "rotate(0deg)",
    flexShrink: 0,
    lineHeight: 1,
    userSelect: "none",
  };
}

const panelBodyStyle: CSSProperties = {
  borderTop: `1px solid ${t.colors.borderSoft}`,
  padding: "14px 16px",
  background: t.colors.background,
};

const sidebarPanelTitleStyle: CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: t.colors.textPrimary,
};

const sidebarTextStyle: CSSProperties = {
  margin: 0,
  fontSize: 12,
  lineHeight: 1.7,
  color: t.colors.textSecondary,
  whiteSpace: "pre-wrap",
  fontFamily: "inherit",
};

const layerHeaderInnerStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  width: "100%",
  minWidth: 0,
};

const layerNumStyle: CSSProperties = {
  flexShrink: 0,
  width: 32,
  height: 24,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 6,
  background: t.colors.backgroundSoft,
  fontSize: 11,
  fontWeight: 700,
  color: t.colors.textSecondary,
  letterSpacing: "0.02em",
};

const layerNameStyle: CSSProperties = {
  fontSize: 14,
  fontWeight: 600,
  color: t.colors.textPrimary,
  whiteSpace: "nowrap",
};

const trackBadgeStyle: CSSProperties = {
  flexShrink: 0,
  padding: "2px 9px",
  borderRadius: 999,
  fontSize: 11,
  fontWeight: 700,
  color: t.colors.textSecondary,
};

const durationStyle: CSSProperties = {
  fontSize: 12,
  color: t.colors.textMuted,
  fontVariantNumeric: "tabular-nums",
  flexShrink: 0,
  minWidth: 40,
  textAlign: "right",
};

function statusChipStyle(status: "success" | "partial" | "error"): CSSProperties {
  const bgMap = {
    success: t.colors.success,
    partial: t.colors.warning,
    error: t.colors.danger,
  };
  const colorMap = {
    success: "#166534",
    partial: "#854d0e",
    error: "#991b1b",
  };
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    padding: "3px 9px",
    borderRadius: 999,
    background: bgMap[status],
    fontSize: 11,
    fontWeight: 700,
    color: colorMap[status],
    flexShrink: 0,
  };
}

const dotStyle: CSSProperties = {
  width: 6,
  height: 6,
  borderRadius: "50%",
  flexShrink: 0,
};

const traceGridStyle: CSSProperties = {
  display: "grid",
  gap: 12,
};

const traceBlockStyle: CSSProperties = {
  display: "grid",
  gap: 6,
};

const traceBlockTitleStyle: CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  color: t.colors.textMuted,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
};

const tracePreStyle: CSSProperties = {
  margin: 0,
  padding: "12px 14px",
  borderRadius: t.radius.sm,
  border: `1px solid ${t.colors.border}`,
  background: t.colors.surface,
  color: t.colors.textSecondary,
  fontSize: 12,
  lineHeight: 1.6,
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
  overflowX: "auto",
  fontFamily:
    'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
};