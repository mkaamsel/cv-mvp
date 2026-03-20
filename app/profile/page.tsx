"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const inputStyle: React.CSSProperties = {
  padding: "0.85rem",
  border: "1px solid #ccc",
  borderRadius: "10px",
  width: "100%",
};

const buttonStyle: React.CSSProperties = {
  padding: "0.85rem 1rem",
  cursor: "pointer",
  border: "1px solid #ccc",
  borderRadius: "10px",
  background: "#f8f8f8",
};

export default function ProfilePage() {
  const [fullName, setFullName] = useState("");
  const [cvText, setCvText] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const savedName = localStorage.getItem("fullName") || "";
    const savedCV = localStorage.getItem("cvText") || "";

    setFullName(savedName);
    setCvText(savedCV);
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    localStorage.setItem("fullName", fullName);
    localStorage.setItem("cvText", cvText);

    setMessage("Profile saved locally.");
  };

  return (
    <main style={{ padding: "2rem", maxWidth: "900px", margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "1rem",
          flexWrap: "wrap",
          marginBottom: "1.5rem",
        }}
      >
        <div>
          <h1 style={{ marginBottom: "0.5rem" }}>Base Profile</h1>
          <p style={{ color: "#555", margin: 0 }}>
            Save your name and master CV. This will be used when generating tailored applications.
          </p>
        </div>

        <Link
          href="/dashboard"
          style={{
            ...buttonStyle,
            textDecoration: "none",
            color: "inherit",
            display: "inline-block",
          }}
        >
          Back to Dashboard
        </Link>
      </div>

      <form
        onSubmit={handleSave}
        style={{
          display: "grid",
          gap: "1rem",
          border: "1px solid #ddd",
          borderRadius: "12px",
          padding: "1.25rem",
          background: "#fff",
        }}
      >
        <div>
          <label
            htmlFor="fullName"
            style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600 }}
          >
            Full name
          </label>
          <input
            id="fullName"
            type="text"
            placeholder="Enter your full name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            style={inputStyle}
          />
        </div>

        <div>
          <label
            htmlFor="cvText"
            style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600 }}
          >
            Master CV
          </label>
          <textarea
            id="cvText"
            placeholder="Paste your master CV here"
            value={cvText}
            onChange={(e) => setCvText(e.target.value)}
            rows={18}
            style={{ ...inputStyle, resize: "vertical" }}
          />
        </div>

        <div style={{ display: "flex", justifyContent: "flex-start" }}>
          <button type="submit" style={buttonStyle}>
            Save Profile
          </button>
        </div>
      </form>

      {message && (
        <p style={{ marginTop: "1rem", color: "#0a7a2f", fontWeight: 500 }}>
          {message}
        </p>
      )}
    </main>
  );
}