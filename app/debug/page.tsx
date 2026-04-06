"use client";

import { useState } from "react";
import { designTokens } from "@/lib/design/tokens";

const t = designTokens;

// ── JD01: Senior accounting role (HIGH match) ─────────────────────────────────
// Canonical test dataset — JD01 expects recommendation: apply_confidently

const TEST_JD01 = `
Senior Accountant / Head of Accounting (m/w/d)

Unternehmen: Mittelständisches Produktionsunternehmen, ca. 500 Mitarbeiter, internationale Aktivitäten

Aufgaben:
- Eigenverantwortliche Führung der Finanzbuchhaltung (Debitoren, Kreditoren, Hauptbuch)
- Erstellung von Monats-, Quartals- und Jahresabschlüssen nach HGB
- Intercompany-Abstimmungen und Konsolidierungsvorbereitung
- Ansprechpartner für Wirtschaftsprüfer, Steuerberater und interne Stakeholder
- Verantwortung für Umsatzsteuervoranmeldungen und sonstige Steuermeldungen
- Mitarbeit bei der Optimierung von Buchhaltungsprozessen und ERP-Systembetreuung
- Führung und Weiterentwicklung eines kleinen Buchhaltungsteams (2–3 Personen)

Anforderungen:
- Abgeschlossenes betriebswirtschaftliches Studium oder kaufmännische Ausbildung mit Weiterbildung zum Bilanzbuchhalter (IHK)
- Mindestens 5 Jahre Berufserfahrung in der Finanzbuchhaltung, davon 2 Jahre in leitender Funktion
- Fundierte HGB-Kenntnisse; IFRS-Kenntnisse von Vorteil
- Sicherer Umgang mit SAP FI/CO oder vergleichbarem ERP-System
- Sehr gute MS-Excel-Kenntnisse
- Strukturierte, eigenverantwortliche Arbeitsweise und ausgeprägte Kommunikationsstärke
- Sehr gute Deutschkenntnisse, gute Englischkenntnisse
`.trim();

// ── Test candidate profile ────────────────────────────────────────────────────
// Senior finance / accounting professional — HIGH match for JD01

const TEST_CANDIDATE_PROFILE = {
  fullName: "Test Candidate",
  headline: "Senior Accountant with 8+ years in financial reporting, HGB close and intercompany coordination",
  summary:
    "Experienced senior accountant with a strong track record in full-cycle accounting, month-end and year-end close under HGB, intercompany reconciliation, and ERP-based process improvement. Proven ability to lead small accounting teams and manage relationships with auditors and tax advisors.",
  roles: [
    {
      title: "Senior Accountant",
      company: "Mittelstand GmbH",
      startDate: "2019",
      endDate: "present",
      responsibilities: [
        "Managed full-cycle accounts payable, accounts receivable, and general ledger",
        "Prepared monthly and annual financial statements under HGB",
        "Coordinated intercompany reconciliations across 4 entities",
        "Liaised with external auditors and tax advisors during annual audit",
        "Supervised and mentored two junior accounting staff",
      ],
      achievements: [
        "Reduced month-end close cycle from 8 to 5 working days",
        "Led SAP FI migration from legacy system with zero data loss",
      ],
    },
    {
      title: "Accountant",
      company: "Finance & Controlling AG",
      startDate: "2016",
      endDate: "2019",
      responsibilities: [
        "Processed accounts payable and receivable transactions",
        "Assisted with monthly close and balance sheet reconciliations",
        "Prepared VAT returns and tax filings",
        "Maintained fixed asset register",
      ],
      achievements: [
        "Implemented automated bank reconciliation reducing manual effort by 60%",
      ],
    },
    {
      title: "Junior Accountant",
      company: "Steuerberatung Müller",
      startDate: "2014",
      endDate: "2016",
      responsibilities: [
        "Bookkeeping for SME clients under HGB",
        "Preparation of annual financial statements",
        "Assisted with VAT compliance and payroll accounting",
      ],
      achievements: [],
    },
  ],
  coreSkills: [
    "HGB financial statements",
    "Month-end and year-end close",
    "Intercompany reconciliation",
    "Accounts payable and receivable",
    "General ledger management",
    "VAT compliance",
    "SAP FI/CO",
    "MS Excel (advanced)",
    "Balance sheet reconciliation",
    "Audit support",
  ],
  tools: ["SAP FI/CO", "MS Excel", "DATEV", "Navision"],
  standards: ["HGB", "IFRS (basic)"],
  languages: [
    { language: "German", proficiency: "Native" },
    { language: "English", proficiency: "Professional working proficiency" },
  ],
  education: [
    {
      degree: "Bachelor of Arts",
      field: "Business Administration",
      institution: "Hochschule für Wirtschaft",
    },
  ],
  certifications: [
    { name: "Bilanzbuchhalter IHK", issuer: "IHK" },
  ],
  leadershipSignals: [
    "Team lead for 2–3 accounting staff",
    "Mentored junior accountants",
    "Coordinated cross-functional close process",
  ],
};

// ── Types ─────────────────────────────────────────────────────────────────────

type PipelineResult = {
  ok: boolean;
  runId?: string;
  telemetry?: {
    outcome: string;
    pipelineTrace: string[];
    diagnostics: {
      selectedEvidenceCount: number;
      missingSignalsCount: number;
      strongMatchesCount: number;
      riskAreasCount: number;
      review: {
        cvTruthCheck: string | null;
        cvRelevanceScore: number | null;
        cvInflationRisk: string | null;
      };
    };
  };
  insights?: {
    applicationRecommendation?: string;
    advisorMessage?: string;
    reasoningSummary?: string;
    strongMatches?: string[];
    riskAreas?: string[];
    missingSignals?: string[];
    selectedEvidence?: string[];
  };
  message?: string;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function traceStatusColor(entry: string): string {
  if (entry.includes(":done") || entry.includes(":improved") || entry.includes(":report"))
    return t.colors.success;
  if (entry.includes(":fallback")) return t.colors.warning;
  if (entry.includes(":start")) return t.colors.backgroundSoft;
  return t.colors.borderSoft;
}

function recommendationColor(rec: string | undefined): string {
  if (rec === "apply_confidently") return t.colors.success;
  if (rec === "apply_with_care") return t.colors.accentYellow;
  if (rec === "borderline") return t.colors.warning;
  if (rec === "not_recommended") return t.colors.danger;
  return t.colors.backgroundSoft;
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{
        fontSize: 12,
        fontWeight: 700,
        color: t.colors.textMuted,
        textTransform: "uppercase",
        letterSpacing: "0.07em",
        margin: "28px 0 10px",
      }}
    >
      {children}
    </h2>
  );
}

function Chip({ label, accent }: { label: string; accent?: string }) {
  return (
    <span
      style={{
        display: "inline-block",
        background: accent ?? t.colors.backgroundSoft,
        border: `1px solid ${t.colors.border}`,
        borderRadius: 999,
        padding: "2px 10px",
        fontSize: 12,
        color: t.colors.textPrimary,
        marginRight: 6,
        marginBottom: 6,
      }}
    >
      {label}
    </span>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function DebugPage() {
  const [result, setResult] = useState<PipelineResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [showRaw, setShowRaw] = useState(false);

  async function runTest() {
    setLoading(true);
    setResult(null);
    setShowRaw(false);

    try {
      const res = await fetch("/api/tailoring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobDescriptionText: TEST_JD01,
          outputLanguage: "de",
          candidateProfile: TEST_CANDIDATE_PROFILE,
        }),
      });

      const data = await res.json();
      setResult(data as PipelineResult);
    } catch (err: unknown) {
      setResult({
        ok: false,
        message: err instanceof Error ? err.message : "Request failed.",
      });
    }

    setLoading(false);
  }

  const pageStyle: React.CSSProperties = {
    padding: "40px 48px",
    maxWidth: 960,
    background: t.colors.background,
    minHeight: "100vh",
    fontFamily: "inherit",
  };

  return (
    <main style={pageStyle}>
      {/* Header */}
      <h1 style={{ fontSize: 22, fontWeight: 700, color: t.colors.textPrimary, margin: "0 0 4px" }}>
        Pipeline Debug
      </h1>
      <p style={{ fontSize: 13, color: t.colors.textMuted, margin: "0 0 24px" }}>
        Fires the full tailoring pipeline with a hardcoded test payload and inspects layer firing.
      </p>

      {/* Test payload summary */}
      <div
        style={{
          background: t.colors.surface,
          border: `1px solid ${t.colors.border}`,
          borderRadius: t.radius.md,
          padding: "16px 20px",
          marginBottom: 24,
          fontSize: 13,
        }}
      >
        <div style={{ fontWeight: 600, color: t.colors.textPrimary, marginBottom: 8 }}>
          JD01 — Senior Accounting Role (HIGH match · expect: apply_confidently)
        </div>
        <div style={{ color: t.colors.textSecondary, lineHeight: 1.6 }}>
          <strong>Job:</strong> Senior Accountant / Head of Accounting · HGB close · SAP FI/CO ·
          Intercompany · Team lead
          <br />
          <strong>Profile:</strong> {TEST_CANDIDATE_PROFILE.fullName} ·{" "}
          {TEST_CANDIDATE_PROFILE.roles.length} roles · Bilanzbuchhalter IHK · SAP / Excel
          <br />
          <strong>Language:</strong> de · <strong>Input:</strong> pasted text
        </div>
      </div>

      {/* Run button */}
      <button
        onClick={runTest}
        disabled={loading}
        style={{
          padding: "10px 24px",
          background: loading ? t.colors.backgroundSoft : t.colors.primary,
          color: loading ? t.colors.textMuted : t.colors.textOnPrimary,
          border: "none",
          borderRadius: t.radius.sm,
          fontWeight: 600,
          fontSize: 14,
          cursor: loading ? "not-allowed" : "pointer",
        }}
      >
        {loading ? "Running pipeline…" : "Run Pipeline Test"}
      </button>

      {/* Results */}
      {result && (
        <>
          {/* Status banner */}
          <div
            style={{
              marginTop: 24,
              padding: "12px 16px",
              borderRadius: t.radius.sm,
              background: result.ok ? t.colors.accentGreen : t.colors.danger,
              border: `1px solid ${t.colors.border}`,
              fontWeight: 600,
              fontSize: 14,
              color: t.colors.textPrimary,
            }}
          >
            {result.ok
              ? `Pipeline completed · Run ID: ${result.runId ?? "—"} · Outcome: ${result.telemetry?.outcome ?? "—"}`
              : `Pipeline failed: ${result.message ?? "Unknown error"}`}
          </div>

          {result.ok && result.telemetry && result.insights && (
            <>
              {/* Key diagnostics */}
              <SectionHeading>Diagnostics</SectionHeading>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                {[
                  ["Evidence selected", result.telemetry.diagnostics.selectedEvidenceCount],
                  ["Missing signals", result.telemetry.diagnostics.missingSignalsCount],
                  ["Strong matches", result.telemetry.diagnostics.strongMatchesCount],
                  ["Risk areas", result.telemetry.diagnostics.riskAreasCount],
                  ["CV truth check", result.telemetry.diagnostics.review.cvTruthCheck ?? "—"],
                  ["CV relevance", result.telemetry.diagnostics.review.cvRelevanceScore ?? "—"],
                  ["CV inflation risk", result.telemetry.diagnostics.review.cvInflationRisk ?? "—"],
                ].map(([label, value]) => (
                  <div
                    key={String(label)}
                    style={{
                      background: t.colors.surface,
                      border: `1px solid ${t.colors.border}`,
                      borderRadius: t.radius.sm,
                      padding: "10px 16px",
                      minWidth: 130,
                    }}
                  >
                    <div style={{ fontSize: 11, color: t.colors.textMuted, marginBottom: 4 }}>
                      {label}
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: t.colors.textPrimary }}>
                      {String(value)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Recommendation */}
              <SectionHeading>Recommendation</SectionHeading>
              <div
                style={{
                  background: recommendationColor(result.insights.applicationRecommendation),
                  border: `1px solid ${t.colors.border}`,
                  borderRadius: t.radius.sm,
                  padding: "12px 16px",
                  marginBottom: 12,
                }}
              >
                <div style={{ fontWeight: 700, fontSize: 15, color: t.colors.textPrimary }}>
                  {result.insights.applicationRecommendation ?? "—"}
                </div>
                {result.insights.advisorMessage && (
                  <div style={{ fontSize: 13, color: t.colors.textSecondary, marginTop: 6 }}>
                    {result.insights.advisorMessage}
                  </div>
                )}
              </div>
              {result.insights.reasoningSummary && (
                <p style={{ fontSize: 13, color: t.colors.textSecondary, margin: "0 0 8px" }}>
                  {result.insights.reasoningSummary}
                </p>
              )}

              {/* Evidence & signals */}
              {(result.insights.selectedEvidence ?? []).length > 0 && (
                <>
                  <SectionHeading>Selected evidence</SectionHeading>
                  <div>
                    {result.insights.selectedEvidence!.map((e, i) => (
                      <Chip key={i} label={e} accent={t.colors.accentGreen} />
                    ))}
                  </div>
                </>
              )}
              {(result.insights.missingSignals ?? []).length > 0 && (
                <>
                  <SectionHeading>Missing signals</SectionHeading>
                  <div>
                    {result.insights.missingSignals!.map((s, i) => (
                      <Chip key={i} label={s} accent={t.colors.warning} />
                    ))}
                  </div>
                </>
              )}
              {(result.insights.riskAreas ?? []).length > 0 && (
                <>
                  <SectionHeading>Risk areas</SectionHeading>
                  <div>
                    {result.insights.riskAreas!.map((r, i) => (
                      <Chip key={i} label={r} accent={t.colors.danger} />
                    ))}
                  </div>
                </>
              )}

              {/* Pipeline trace */}
              <SectionHeading>Pipeline trace</SectionHeading>
              <div
                style={{
                  background: "#0f1117",
                  borderRadius: t.radius.md,
                  padding: "16px 20px",
                  fontFamily: "monospace",
                  fontSize: 12,
                  lineHeight: 1.7,
                  overflowX: "auto",
                }}
              >
                {result.telemetry.pipelineTrace.map((entry, i) => (
                  <div
                    key={i}
                    style={{
                      color: traceStatusColor(entry) === t.colors.backgroundSoft
                        ? "#6b7a99"
                        : traceStatusColor(entry) === t.colors.success
                          ? "#86efac"
                          : traceStatusColor(entry) === t.colors.warning
                            ? "#fde68a"
                            : "#94a3b8",
                    }}
                  >
                    {entry}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Raw JSON toggle */}
          <div style={{ marginTop: 24 }}>
            <button
              onClick={() => setShowRaw((v) => !v)}
              style={{
                padding: "6px 16px",
                borderRadius: t.radius.sm,
                border: `1px solid ${t.colors.border}`,
                background: t.colors.surface,
                cursor: "pointer",
                fontSize: 12,
                color: t.colors.textSecondary,
              }}
            >
              {showRaw ? "Hide" : "Show"} raw JSON
            </button>
            {showRaw && (
              <pre
                style={{
                  marginTop: 12,
                  padding: 20,
                  background: "#0f1117",
                  color: "#94a3b8",
                  borderRadius: t.radius.md,
                  overflowX: "auto",
                  fontSize: 11,
                  lineHeight: 1.6,
                }}
              >
                {JSON.stringify(result, null, 2)}
              </pre>
            )}
          </div>
        </>
      )}
    </main>
  );
}
