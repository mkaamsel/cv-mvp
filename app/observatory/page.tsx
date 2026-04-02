"use client";

import { useEffect, useState } from "react";

export default function ObservatoryPage() {
  const [runs, setRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadRuns() {
    try {
      const res = await fetch("/api/tailoring-runs");
      const data = await res.json();
      setRuns(data.runs || []);
    } catch (err) {
      console.error(err);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadRuns();
  }, []);

  return (
    <main style={{ padding: 40 }}>
      <h1>Observatory</h1>

      {loading && <p>Loading runs...</p>}

      {!loading && runs.length === 0 && (
        <p>No runs recorded yet.</p>
      )}

      {runs.map((run) => (
        <div
          key={run.id}
          style={{
            border: "1px solid #ddd",
            padding: 16,
            marginTop: 16,
          }}
        >
          <div><strong>Run ID:</strong> {run.id}</div>
          <div><strong>Status:</strong> {run.status}</div>
          <div><strong>Duration:</strong> {run.duration_ms} ms</div>
        </div>
      ))}
    </main>
  );
}