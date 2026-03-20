"use client";

import Link from "next/link";

const cardStyle: React.CSSProperties = {
  border: "1px solid #ddd",
  borderRadius: "12px",
  padding: "1.25rem",
  backgroundColor: "#fff",
};

const buttonStyle: React.CSSProperties = {
  display: "inline-block",
  padding: "0.9rem 1rem",
  cursor: "pointer",
  width: "100%",
  textAlign: "center",
  border: "1px solid #ccc",
  borderRadius: "10px",
  background: "#f8f8f8",
  textDecoration: "none",
  color: "inherit",
  fontWeight: 500,
};

export default function Dashboard() {
  return (
    <main style={{ padding: "2rem", maxWidth: "960px", margin: "0 auto" }}>
      <section style={{ marginBottom: "2rem" }}>
        <h1 style={{ marginBottom: "0.5rem" }}>Dashboard</h1>
        <p style={{ color: "#555", margin: 0 }}>
          Manage your base profile, create tailored application drafts, and review saved versions.
        </p>
      </section>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "1rem",
        }}
      >
        <div style={cardStyle}>
          <h2 style={{ marginTop: 0, fontSize: "1.1rem" }}>Profile</h2>
          <p style={{ color: "#666", minHeight: "3rem" }}>
            Save your full name and master CV used for tailoring.
          </p>
          <Link href="/profile" style={buttonStyle}>
            Edit Profile
          </Link>
        </div>

        <div style={cardStyle}>
          <h2 style={{ marginTop: 0, fontSize: "1.1rem" }}>Tailoring</h2>
          <p style={{ color: "#666", minHeight: "3rem" }}>
            Paste a job description and generate a fresh tailored CV and cover letter draft.
          </p>
          <Link href="/tailoring/new" style={buttonStyle}>
            Create New Tailored Draft
          </Link>
        </div>

        <div style={cardStyle}>
          <h2 style={{ marginTop: 0, fontSize: "1.1rem" }}>Saved CVs</h2>
          <p style={{ color: "#666", minHeight: "3rem" }}>
            Review the CV drafts you have already generated and saved.
          </p>
          <Link href="/dashboard/cvs" style={buttonStyle}>
            View Saved CVs
          </Link>
        </div>

        <div style={cardStyle}>
          <h2 style={{ marginTop: 0, fontSize: "1.1rem" }}>Cover Letter History</h2>
          <p style={{ color: "#666", minHeight: "3rem" }}>
            Review, edit, and reuse parts of previously generated cover letter drafts.
          </p>
          <Link href="/dashboard/cover-letters" style={buttonStyle}>
            View Cover Letter History
          </Link>
        </div>
      </section>
    </main>
  );
}