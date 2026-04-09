"use client";

import { type CSSProperties, useEffect, useState } from "react";
import { designTokens } from "@/lib/design/tokens";

const t = designTokens;

// ── Types ─────────────────────────────────────────────────────────────────────

// Shape returned by GET /api/tailoring-runs/list
type LiveRun = {
  id: string;
  client_run_id: string | null;
  run_outcome: string | null;
  created_at: string | null;
  updated_at: string | null;
  job_url: string | null;
  input_type: string | null;
  output_language: string | null;
  warnings_json: string[] | null;
  degraded_reasons_json: string[] | null;
};

type RunListResponse = {
  ok: boolean;
  runs?: LiveRun[];
  error?: string;
};

// Internal run shape used by the UI
type DisplayRun = {
  id: string;            // the Supabase row id (uuid)
  clientRunId: string;   // client_run_id or derived short id
  label: string;         // dropdown label
  outcome: "completed" | "limited" | "failed";
  warnings: string[];
  fallbackLayers: string[];
  createdAt: string | null;
  source: "live" | "mock";
};

// ── Mock fallback data ────────────────────────────────────────────────────────

type MockLayer = {
  number: number;
  id: string;
  name: string;
  track: "ai" | "rule" | "ai+rule";
  status: "success" | "partial" | "error";
  durationMs: number;
  confidence: number;
  placeholder: string;
};

const MOCK_DISPLAY_RUNS: DisplayRun[] = [
  {
    id: "mock_a1b2c3d4", clientRunId: "a1b2c3d4",
    label: "a1b2c3d4 · 06 Apr 2026 · 14:23",
    outcome: "completed", warnings: [], fallbackLayers: [],
    createdAt: "2026-04-06T14:23:00Z", source: "mock",
  },
  {
    id: "mock_e5f6g7h8", clientRunId: "e5f6g7h8",
    label: "e5f6g7h8 · 06 Apr 2026 · 11:07",
    outcome: "limited",
    warnings: ["Company research could not be completed.", "Market signal analysis encountered a problem."],
    fallbackLayers: ["L5 — Company Research", "L6 — Market Signals"],
    createdAt: "2026-04-06T11:07:00Z", source: "mock",
  },
  {
    id: "mock_m3n4o5p6", clientRunId: "m3n4o5p6",
    label: "m3n4o5p6 · 05 Apr 2026 · 09:31",
    outcome: "failed",
    warnings: ["Part of the role analysis didn't complete.", "Evidence selection ran into a problem.", "Positioning analysis encountered a problem."],
    fallbackLayers: ["L3 — Required Profile", "L7 — Selected Evidence", "L8 — Positioning Brief"],
    createdAt: "2026-04-05T09:31:00Z", source: "mock",
  },
];

const MOCK_LAYERS: MockLayer[] = [
  {
    number: 1, id: "candidateProfile", name: "Candidate Profile",
    track: "ai", status: "success", durationMs: 342, confidence: 0.91,
    placeholder: "Structured candidate profile output — roles, skills, qualifications, evidence claims.",
  },
  {
    number: 2, id: "structuredJob", name: "Structured Job",
    track: "ai", status: "success", durationMs: 218, confidence: 0.87,
    placeholder: "Extracted job responsibilities (aufgaben) and requirements (anforderungsprofil) in structured form.",
  },
  {
    number: 3, id: "requiredProfile", name: "Required Profile",
    track: "ai+rule", status: "success", durationMs: 441, confidence: 0.84,
    placeholder: "Competency signals derived from the job description — muss / soll / kann classification and knockout criteria.",
  },
  {
    number: 4, id: "companyContext", name: "Company Context",
    track: "ai", status: "success", durationMs: 189, confidence: 0.78,
    placeholder: "Tone, culture, and contextual signals extracted from the job posting and company identity.",
  },
  {
    number: 5, id: "companyResearch", name: "Company Research",
    track: "ai", status: "success", durationMs: 623, confidence: 0.72,
    placeholder: "Background research on the company — industry position, size signals, recent signals.",
  },
  {
    number: 6, id: "marketSignals", name: "Market Signals",
    track: "ai", status: "success", durationMs: 287, confidence: 0.80,
    placeholder: "Hiring signals, seniority signal, compensation range signals, market context.",
  },
  {
    number: 7, id: "selectedEvidence", name: "Selected Evidence",
    track: "ai+rule", status: "success", durationMs: 512, confidence: 0.85,
    placeholder: "Evidence ranked and classified — strongEvidence, supportEvidence, transferableEvidence, weakEvidence, combinedTopEvidence.",
  },
  {
    number: 8, id: "positioningBrief", name: "Positioning Brief",
    track: "ai", status: "success", durationMs: 398, confidence: 0.83,
    placeholder: "Positioning strategy for this candidate against this role — coreWhyFit, coverLetterAngle, compensationBridges.",
  },
  {
    number: 9, id: "recommendation", name: "Recommendation",
    track: "ai", status: "success", durationMs: 176, confidence: 0.88,
    placeholder: "Application recommendation — verdict, seniority fit, advisor message, blockers, risk areas.",
  },
  {
    number: 10, id: "bundleAssembly", name: "Bundle Assembly",
    track: "rule", status: "success", durationMs: 12, confidence: 1.0,
    placeholder: "All layer outputs assembled into the ApplicationIntelligenceBundle for handoff to generators.",
  },
  {
    number: 11, id: "documentGeneration", name: "Document Generation",
    track: "ai", status: "success", durationMs: 2341, confidence: 0.90,
    placeholder: "CV draft and cover letter generated from the assembled bundle. Outputs stored as finalCv and finalCoverLetter.",
  },
];

const MOCK_JD = `Position: Senior Finance Manager

Ihre Aufgaben:
• Verantwortung für monatliche Abschlusserstellung nach HGB
• Betreuung der DATEV-Buchhaltung und Intercompany-Abstimmung
• Umsatzsteuervoranmeldungen und Jahresabschluss
• Koordination mit Wirtschaftsprüfern und Steuerberatern
• SAP S/4HANA-Migration betreuen

Ihr Profil:
• Bilanzbuchhalter IHK oder vergleichbare Qualifikation
• Mindestens 5 Jahre Berufserfahrung im Finanzbereich
• SAP-Kenntnisse und DATEV zwingend erforderlich
• Erfahrung in der Konzernkonsolidierung von Vorteil`;

const MOCK_PROFILE = `Candidate Summary:
Finance professional with 9 years of experience across management accounting,
month-end close, and statutory reporting in German SME and international group contexts.

Experience:
• Finance Manager — Acme GmbH, Frankfurt (2019–present)
• Senior Accountant — Beta AG, Munich (2015–2019)

Qualifications:
• CGMA — Chartered Global Management Accountant (CIMA)
• B.Sc. Business Administration, Goethe University Frankfurt

Skills:
SAP S/4HANA, DATEV, HGB, IFRS, VAT filing, month-end close,
intercompany reconciliation, Arbeitnehmerüberlassung compliance

Languages:
• German — native
• English — C1`;

// ── Run list helpers ──────────────────────────────────────────────────────────

function mapOutcome(raw: string | null): DisplayRun["outcome"] {
  if (raw === "completed")                  return "completed";
  if (raw === "completed_with_limitations") return "limited";
  if (raw === "failed")                     return "failed";
  return "completed";
}

function formatRunDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    const day  = String(d.getDate()).padStart(2, "0");
    const mon  = d.toLocaleString("en-GB", { month: "short" });
    const yr   = d.getFullYear();
    const hh   = String(d.getHours()).padStart(2, "0");
    const mm   = String(d.getMinutes()).padStart(2, "0");
    return `${day} ${mon} ${yr} · ${hh}:${mm}`;
  } catch {
    return iso;
  }
}

function liveRunToDisplay(run: LiveRun): DisplayRun {
  const shortId = (run.client_run_id || run.id).slice(0, 8);
  const dateStr = formatRunDate(run.created_at);
  return {
    id:            run.id,
    clientRunId:   run.client_run_id ?? run.id,
    label:         `${shortId} · ${dateStr}`,
    outcome:       mapOutcome(run.run_outcome),
    warnings:      Array.isArray(run.warnings_json)        ? run.warnings_json        : [],
    fallbackLayers: Array.isArray(run.degraded_reasons_json) ? run.degraded_reasons_json : [],
    createdAt:     run.created_at,
    source:        "live",
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function statusDotColor(status: MockLayer["status"]): string {
  if (status === "success") return "#4ade80";
  if (status === "partial") return "#fbbf24";
  return "#f87171";
}

function statusLabel(status: MockLayer["status"]): string {
  if (status === "success") return "OK";
  if (status === "partial") return "Partial";
  return "Error";
}

function trackLabel(track: MockLayer["track"]): string {
  if (track === "ai")   return "AI";
  if (track === "rule") return "Rule";
  return "AI + Rule";
}

function trackColor(track: MockLayer["track"]): string {
  if (track === "ai")   return t.colors.accentPurple;
  if (track === "rule") return t.colors.backgroundSoft;
  return t.colors.accentGreen;
}

function confidenceDotColor(value: number): string {
  const pct = Math.round(value * 100);
  if (pct >= 85) return "#4ade80";
  if (pct >= 70) return "#fbbf24";
  return "#f87171";
}

function formatMs(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
  return `${ms}ms`;
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
  if (outcome === "limited")   return { ...base, background: t.colors.warning, color: "#854d0e" };
  return                              { ...base, background: t.colors.danger,  color: "#991b1b" };
}

// ── CollapsiblePanel ──────────────────────────────────────────────────────────

function CollapsiblePanel({
  header,
  children,
  defaultOpen = false,
  compact = false,
}: {
  header: React.ReactNode;
  children?: React.ReactNode;
  defaultOpen?: boolean;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div style={panelWrapStyle}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{ ...panelHeaderStyle, padding: compact ? "10px 14px" : "12px 16px" }}
        aria-expanded={open}
      >
        <span style={chevronStyle(open)}>›</span>
        {header}
      </button>
      {open && children && (
        <div style={panelBodyStyle}>{children}</div>
      )}
    </div>
  );
}

// ── Run summary panel (mock for now) ─────────────────────────────────────────

function RunSummaryPanel({ run }: { run: DisplayRun }) {
  const hasWarnings  = run.warnings.length > 0;
  const hasFallbacks = run.fallbackLayers.length > 0;

  return (
    <div style={summaryPanelStyle}>
      <div style={summaryTitleStyle}>Run summary</div>
      <div style={summaryGridStyle}>

        <SummaryField label="Started at"     value={run.createdAt ? formatRunDate(run.createdAt) : "—"} />
        <SummaryField label="Finished at"    value="— (mock)" />
        <SummaryField label="Total duration" value="— (mock)" />

        <SummaryField
          label="Warnings"
          value={
            hasWarnings
              ? <span style={warnValueStyle}>{run.warnings.length}</span>
              : <span style={okValueStyle}>None</span>
          }
        />

        <div style={summaryFieldStyle}>
          <span style={summaryFieldLabelStyle}>Fallback / degraded</span>
          {hasFallbacks ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 3 }}>
              {run.fallbackLayers.map((l) => (
                <span key={l} style={fallbackChipStyle}>{l}</span>
              ))}
            </div>
          ) : (
            <span style={okValueStyle}>None</span>
          )}
        </div>

        {run.source === "mock" && (
          <div style={summaryFieldStyle}>
            <span style={{ ...summaryFieldLabelStyle, color: t.colors.textMuted }}>Data source</span>
            <span style={{ fontSize: 12, color: t.colors.textMuted, fontStyle: "italic" }}>
              Mock — no real runs loaded
            </span>
          </div>
        )}

      </div>
    </div>
  );
}

function SummaryField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={summaryFieldStyle}>
      <span style={summaryFieldLabelStyle}>{label}</span>
      <span style={summaryFieldValueStyle}>{value}</span>
    </div>
  );
}

// ── Layer panel header ────────────────────────────────────────────────────────

function LayerHeader({ layer }: { layer: MockLayer }) {
  const confPct = Math.round(layer.confidence * 100);

  return (
    <div style={layerHeaderInnerStyle}>
      <span style={layerNumStyle}>L{layer.number}</span>
      <span style={layerNameStyle}>{layer.name}</span>
      <span style={{ flex: 1 }} />
      <span style={{ ...trackBadgeStyle, background: trackColor(layer.track) }}>
        {trackLabel(layer.track)}
      </span>
      <span style={metricStyle}>
        <span style={{ ...confDotStyle, background: confidenceDotColor(layer.confidence) }} />
        {confPct}%
      </span>
      <span style={durationStyle}>{formatMs(layer.durationMs)}</span>
      <span style={statusChipStyle(layer.status)}>
        <span style={{ ...dotStyle, background: statusDotColor(layer.status) }} />
        {statusLabel(layer.status)}
      </span>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ObservatoryPage() {
  const [runs,          setRuns]          = useState<DisplayRun[]>(MOCK_DISPLAY_RUNS);
  const [runsLoading,   setRunsLoading]   = useState(true);
  const [runsError,     setRunsError]     = useState<string | null>(null);
  const [selectedRunId, setSelectedRunId] = useState<string>(MOCK_DISPLAY_RUNS[0].id);

  const [filterDate,    setFilterDate]    = useState("");
  const [filterUser,    setFilterUser]    = useState("");
  const [filterFailed,  setFilterFailed]  = useState(false);
  const [filterSuccess, setFilterSuccess] = useState(false);

  // ── Fetch real run list on mount ──────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;

    async function fetchRuns() {
      setRunsLoading(true);
      setRunsError(null);
      try {
        const res  = await fetch("/api/tailoring-runs/list");
        const json = (await res.json()) as RunListResponse;

        if (cancelled) return;

        if (json.ok && Array.isArray(json.runs) && json.runs.length > 0) {
          const live = json.runs.map(liveRunToDisplay);
          setRuns(live);
          setSelectedRunId(live[0].id);
        } else if (!json.ok) {
          // Auth failure or server error — stay on mock, surface the reason
          setRunsError(json.error ?? "Run list unavailable.");
          // Keep mock data in place — do not clear runs
        }
        // If json.ok but runs is empty: keep mock data, no error banner
      } catch {
        if (!cancelled) {
          setRunsError("Could not reach the run list endpoint.");
          // Keep mock data in place
        }
      } finally {
        if (!cancelled) setRunsLoading(false);
      }
    }

    void fetchRuns();
    return () => { cancelled = true; };
  }, []);

  const selectedRun = runs.find((r) => r.id === selectedRunId) ?? runs[0];
  const isLiveData  = runs.some((r) => r.source === "live");

  return (
    <div style={pageStyle}>

      {/* ── Page header ── */}
      <div style={pageHeaderStyle}>
        <div>
          <h1 style={pageTitleStyle}>Observatory</h1>
          <p style={pageSubtitleStyle}>Read-only · Product owner</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {isLiveData && (
            <span style={liveChipStyle}>Live data</span>
          )}
          {!isLiveData && !runsLoading && (
            <span style={mockChipStyle}>Mock data</span>
          )}
          <span style={roChipStyle}>Read-only</span>
        </div>
      </div>

      {/* ── Run list error banner ── */}
      {runsError && (
        <div style={errorBannerStyle}>
          Run list: {runsError} Showing mock data.
        </div>
      )}

      {/* ── Top bar: run selector + filters ── */}
      <div style={topBarStyle}>

        <div style={runSelectorAreaStyle}>
          <label style={filterLabelStyle} htmlFor="run-select">Run</label>
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
          {!runsLoading && selectedRun && (
            <span style={outcomeChipStyle(selectedRun.outcome)}>
              {selectedRun.outcome === "completed"
                ? "Completed"
                : selectedRun.outcome === "limited"
                ? "With limitations"
                : "Failed"}
            </span>
          )}
        </div>

        <div style={filterAreaStyle}>
          <span style={filterLabelStyle}>Filter</span>

          <div style={filterGroupStyle}>
            <label style={filterLabelStyle} htmlFor="filter-date">Date</label>
            <input
              id="filter-date"
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              style={filterInputStyle}
            />
          </div>

          <div style={filterGroupStyle}>
            <label style={filterLabelStyle} htmlFor="filter-user">User</label>
            <input
              id="filter-user"
              type="text"
              value={filterUser}
              onChange={(e) => setFilterUser(e.target.value)}
              placeholder="user ID"
              style={filterInputStyle}
            />
          </div>

          <button
            type="button"
            onClick={() => setFilterFailed((v) => !v)}
            style={filterToggleStyle(filterFailed, "failed")}
          >
            Failed
          </button>
          <button
            type="button"
            onClick={() => setFilterSuccess((v) => !v)}
            style={filterToggleStyle(filterSuccess, "success")}
          >
            Success
          </button>
        </div>
      </div>

      {/* ── Run summary ── */}
      {selectedRun && <RunSummaryPanel run={selectedRun} />}

      {/* ── Main body ── */}
      <div style={bodyStyle}>

        {/* Left column */}
        <div style={leftColStyle}>
          <div style={colLabelStyle}>Context — mock</div>

          <CollapsiblePanel
            header={<span style={sidebarPanelTitleStyle}>Job Description</span>}
            compact
          >
            <pre style={sidebarTextStyle}>{MOCK_JD}</pre>
          </CollapsiblePanel>

          <CollapsiblePanel
            header={<span style={sidebarPanelTitleStyle}>Candidate Profile</span>}
            compact
          >
            <pre style={sidebarTextStyle}>{MOCK_PROFILE}</pre>
          </CollapsiblePanel>
        </div>

        {/* Main column */}
        <div style={mainColStyle}>
          <div style={colLabelStyle}>Pipeline layers — mock</div>

          <div style={{ display: "grid", gap: 6 }}>
            {MOCK_LAYERS.map((layer) => (
              <CollapsiblePanel
                key={layer.id}
                header={<LayerHeader layer={layer} />}
              >
                <p style={layerPlaceholderStyle}>{layer.placeholder}</p>
              </CollapsiblePanel>
            ))}

            {/* Warnings / Audit */}
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
            >
              <p style={layerPlaceholderStyle}>
                Pipeline warnings, fallback layer events, and raw observation points will appear
                here when connected to real run data.
              </p>
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

const errorBannerStyle: CSSProperties = {
  marginBottom: 14,
  padding: "10px 16px",
  borderRadius: t.radius.md,
  border: `1px solid ${t.colors.border}`,
  background: t.colors.accentYellow,
  fontSize: 13,
  color: "#854d0e",
};

// Top bar
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
  const activeBg    = variant === "failed" ? t.colors.danger   : t.colors.success;
  const activeColor = variant === "failed" ? "#991b1b"         : "#166534";
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

// Run summary panel
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

// Body layout
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

// Collapsible panel
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

// Layer header
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

const metricStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  fontSize: 12,
  color: t.colors.textMuted,
  flexShrink: 0,
};

const confDotStyle: CSSProperties = {
  width: 8,
  height: 8,
  borderRadius: "50%",
  flexShrink: 0,
};

const durationStyle: CSSProperties = {
  fontSize: 12,
  color: t.colors.textMuted,
  fontVariantNumeric: "tabular-nums",
  flexShrink: 0,
  minWidth: 40,
  textAlign: "right",
};

function statusChipStyle(status: MockLayer["status"]): CSSProperties {
  const bgMap    = { success: t.colors.success, partial: t.colors.warning, error: t.colors.danger };
  const colorMap = { success: "#166534",        partial: "#854d0e",        error: "#991b1b"       };
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

const layerPlaceholderStyle: CSSProperties = {
  margin: 0,
  padding: "6px 4px",
  fontSize: 13,
  lineHeight: 1.6,
  color: t.colors.textMuted,
  fontStyle: "italic",
};
