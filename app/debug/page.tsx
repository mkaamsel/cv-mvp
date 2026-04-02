"use client";

import { useState } from "react";

export default function DebugPage() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function runPipelineTest() {
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/tailoring", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          test: true,
        }),
      });

      const data = await res.json();
      setResult(data);
    } catch (err: any) {
      setResult({
        error: err.message,
      });
    }

    setLoading(false);
  }

  return (
    <main style={{ padding: 40 }}>
      <h1>System Debug</h1>

      <button
        onClick={runPipelineTest}
        style={{
          padding: "10px 20px",
          marginTop: 20,
        }}
      >
        Run Pipeline Test
      </button>

      {loading && <p>Running pipeline...</p>}

      {result && (
        <pre
          style={{
            marginTop: 30,
            padding: 20,
            background: "#111",
            color: "#0f0",
            overflowX: "auto",
          }}
        >
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </main>
  );
}