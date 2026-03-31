"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

function Section({
  title,
  data,
}: {
  title: string;
  data: unknown;
}) {
  return (
    <div
      style={{
        background: "#ffffff",
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
        border: "1px solid #d1d5db",
        boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)",
      }}
    >
      <h2
        style={{
          fontSize: 18,
          fontWeight: 600,
          marginBottom: 12,
          color: "#0f172a",
        }}
      >
        {title}
      </h2>

      <pre
        style={{
          background: "#0f172a",
          color: "#e2e8f0",
          padding: 16,
          borderRadius: 10,
          overflowX: "auto",
          fontSize: 13,
          lineHeight: 1.5,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          margin: 0,
        }}
      >
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}

type DebugRunResponse = {
  runId: string;
  createdAt: string;
  status: "ok" | "partial" | "error";
  warnings?: string[];
  errors?: string[];
  steps?: Array<{
    key: string;
    status: string;
    durationMs: number | null;
  }>;
  outputs?: {
    candidateProfile: unknown | null;
    structuredJob: unknown | null;
    recommendation: unknown | null;
    cv: unknown | null;
    coverLetter: unknown | null;
    insights: unknown | null;
  };
};

export default function PipelineDebugPage(): React.JSX.Element {
  const router = useRouter();

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<DebugRunResponse | null>(null);

  async function runPipeline() {
    setSubmitting(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch("/api/debug", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
  candidateDocuments: [
    {
      kind: "primary_cv",
      fileName: "test-cv.txt",
      text: "Finance professional experienced in IFRS reporting, SAP ECC, revenue accounting, reconciliations and monthly close processes.",
    },
  ],
  jobUrl: "https://example.com/real-job-url",
  targetLanguage: "English",
}),
      });

      const data = (await response.json()) as DebugRunResponse;

      if (!response.ok) {
        throw new Error(
          data?.errors?.[0] ||
            data?.warnings?.[0] ||
            "Debug pipeline request failed."
        );
      }

      setResult(data);

      if (data.runId) {
        router.push(`/debug/runs/${data.runId}`);
        return;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f8fafc",
        padding: "40px 20px",
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
        }}
      >
        <div
          style={{
            background: "#ffffff",
            borderRadius: 20,
            padding: 24,
            border: "1px solid #e2e8f0",
            boxShadow: "0 10px 30px rgba(15, 23, 42, 0.06)",
            marginBottom: 24,
          }}
        >
          <h1
            style={{
              fontSize: 28,
              fontWeight: 700,
              margin: 0,
              color: "#0f172a",
            }}
          >
            Engine Pipeline Debug
          </h1>

          <p
            style={{
              marginTop: 10,
              marginBottom: 0,
              fontSize: 15,
              lineHeight: 1.6,
              color: "#475569",
            }}
          >
            Run the internal pipeline and inspect one specific execution through
            the run detail page.
          </p>

          <div
            style={{
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
              marginTop: 20,
            }}
          >
            <button
              type="button"
              onClick={runPipeline}
              disabled={submitting}
              style={{
                padding: "10px 18px",
                background: submitting ? "#94a3b8" : "#2563eb",
                color: "#ffffff",
                borderRadius: 10,
                border: "none",
                cursor: submitting ? "not-allowed" : "pointer",
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              {submitting ? "Running..." : "Run Pipeline"}
            </button>

            <button
              type="button"
              onClick={() => router.push("/debug")}
              style={{
                padding: "10px 18px",
                background: "#ffffff",
                color: "#0f172a",
                borderRadius: 10,
                border: "1px solid #cbd5e1",
                cursor: "pointer",
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              Refresh Debug
            </button>
          </div>

          {error ? (
            <div
              style={{
                marginTop: 16,
                borderRadius: 12,
                border: "1px solid #fecaca",
                background: "#fef2f2",
                color: "#991b1b",
                padding: 14,
                fontSize: 14,
              }}
            >
              {error}
            </div>
          ) : null}
        </div>

        {result ? (
          <>
            <Section
              title="Run Summary"
              data={{
                runId: result.runId,
                createdAt: result.createdAt,
                status: result.status,
                warnings: result.warnings ?? [],
                errors: result.errors ?? [],
                steps: result.steps ?? [],
              }}
            />

            {result.outputs?.candidateProfile ? (
              <Section
                title="Candidate Profile"
                data={result.outputs.candidateProfile}
              />
            ) : null}

            {result.outputs?.structuredJob ? (
              <Section
                title="Structured Job"
                data={result.outputs.structuredJob}
              />
            ) : null}

            {result.outputs?.recommendation ? (
              <Section
                title="Application Recommendation"
                data={result.outputs.recommendation}
              />
            ) : null}

            {result.outputs?.cv ? (
              <Section title="Generated CV" data={result.outputs.cv} />
            ) : null}

            {result.outputs?.coverLetter ? (
              <Section
                title="Generated Cover Letter"
                data={result.outputs.coverLetter}
              />
            ) : null}

            {result.outputs?.insights ? (
              <Section title="Insights" data={result.outputs.insights} />
            ) : null}
          </>
        ) : null}
      </div>
    </main>
  );
}