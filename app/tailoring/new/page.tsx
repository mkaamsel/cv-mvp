"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type OutputLanguage = "English" | "German";

const buttonStyle: React.CSSProperties = {
  padding: "0.85rem 1rem",
  cursor: "pointer",
  border: "1px solid #ccc",
  borderRadius: "10px",
  background: "#f8f8f8",
};

const activeButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  border: "1px solid #999",
  background: "#ececec",
  fontWeight: 600,
};

const textareaStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.85rem",
  border: "1px solid #ccc",
  borderRadius: "10px",
  resize: "vertical",
};

export default function TailoringPage() {
  const supabase = createSupabaseBrowserClient();

  const [jobText, setJobText] = useState("");
  const [cvResult, setCvResult] = useState("");
  const [coverLetterResult, setCoverLetterResult] = useState("");
  const [loadingCV, setLoadingCV] = useState(false);
  const [loadingLetter, setLoadingLetter] = useState(false);
  const [message, setMessage] = useState("");
  const [hasBaseCV, setHasBaseCV] = useState(false);
  const [language, setLanguage] = useState<OutputLanguage>("English");

  useEffect(() => {
    const savedCV = localStorage.getItem("cvText") || "";
    setHasBaseCV(savedCV.trim().length > 0);
  }, []);

  const getUserAndCV = async () => {
    const cvText = (localStorage.getItem("cvText") || "").trim();

    if (!cvText) {
      setMessage("No saved base CV found. Please go to Profile, save your base CV, and try again.");
      setHasBaseCV(false);
      return null;
    }

    if (!jobText.trim()) {
      setMessage("Please paste a job description first.");
      return null;
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setMessage("You must be logged in.");
      return null;
    }

    return { user, cvText };
  };

  const handleGenerateCV = async () => {
    setLoadingCV(true);
    setMessage("");

    try {
      const setup = await getUserAndCV();
      if (!setup) {
        setLoadingCV(false);
        return;
      }

      const { user, cvText } = setup;

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cvText,
          jobText,
          language,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.error || "Failed to generate CV.");
        setLoadingCV(false);
        return;
      }

      const outputText = data.output || "No result";
      setCvResult(outputText);

      const { error: saveError } = await supabase.from("cvs").insert([
        {
          user_id: user.id,
          content: outputText,
        },
      ]);

      if (saveError) {
        setMessage("CV draft generated, but saving failed.");
        setLoadingCV(false);
        return;
      }

      setMessage(`CV draft generated and saved successfully in ${language}.`);
    } catch (error) {
      console.error(error);
      setMessage("Something went wrong while generating the CV.");
    } finally {
      setLoadingCV(false);
    }
  };

  const handleGenerateCoverLetter = async () => {
    setLoadingLetter(true);
    setMessage("");

    try {
      const setup = await getUserAndCV();
      if (!setup) {
        setLoadingLetter(false);
        return;
      }

      const { user, cvText } = setup;

      const res = await fetch("/api/generate-cover-letter", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cvText,
          jobText,
          language,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.error || "Failed to generate cover letter.");
        setLoadingLetter(false);
        return;
      }

      const outputText = data.output || "No result";
      setCoverLetterResult(outputText);

      const { error: saveError } = await supabase.from("cover_letters").insert([
        {
          user_id: user.id,
          content: outputText,
        },
      ]);

      if (saveError) {
        setMessage("Cover letter draft generated, but saving failed.");
        setLoadingLetter(false);
        return;
      }

      setMessage(`Cover letter draft generated and saved successfully in ${language}.`);
    } catch (error) {
      console.error(error);
      setMessage("Something went wrong while generating the cover letter.");
    } finally {
      setLoadingLetter(false);
    }
  };

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    alert("Copied to clipboard.");
  };

  return (
    <main style={{ padding: "2rem", maxWidth: "1000px", margin: "0 auto" }}>
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
          <h1 style={{ marginBottom: "0.5rem" }}>Create Tailored Draft</h1>
          <p style={{ color: "#555", margin: 0 }}>
            Paste a job description and generate a fresh tailored CV and cover letter draft from your base profile.
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

      <section
        style={{
          border: "1px solid #ddd",
          borderRadius: "12px",
          padding: "1.25rem",
          background: "#fff",
          marginBottom: "1rem",
        }}
      >
        <p style={{ margin: 0, color: hasBaseCV ? "#0a7a2f" : "#9a6700", fontWeight: 500 }}>
          {hasBaseCV
            ? "Base CV found and ready to use."
            : "No saved base CV found yet. Save it first in Profile."}
        </p>
      </section>

      <section
        style={{
          border: "1px solid #ddd",
          borderRadius: "12px",
          padding: "1.25rem",
          background: "#fff",
        }}
      >
        <div style={{ marginBottom: "1rem" }}>
          <p style={{ margin: "0 0 0.5rem 0", fontWeight: 600 }}>Output language</p>
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => setLanguage("English")}
              style={language === "English" ? activeButtonStyle : buttonStyle}
            >
              English
            </button>

            <button
              type="button"
              onClick={() => setLanguage("German")}
              style={language === "German" ? activeButtonStyle : buttonStyle}
            >
              German
            </button>
          </div>
        </div>

        <label
          htmlFor="jobText"
          style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600 }}
        >
          Job description
        </label>

        <textarea
          id="jobText"
          placeholder="Paste job description here"
          value={jobText}
          onChange={(e) => setJobText(e.target.value)}
          rows={10}
          style={textareaStyle}
        />

        <div
          style={{
            display: "flex",
            gap: "1rem",
            marginTop: "1rem",
            flexWrap: "wrap",
          }}
        >
          <button onClick={handleGenerateCV} style={buttonStyle}>
            {loadingCV ? "Generating CV..." : `Generate CV Draft (${language})`}
          </button>

          <button onClick={handleGenerateCoverLetter} style={buttonStyle}>
            {loadingLetter
              ? "Generating Cover Letter..."
              : `Generate Cover Letter Draft (${language})`}
          </button>
        </div>

        {message && (
          <p style={{ marginTop: "1rem", color: "#333", fontWeight: 500 }}>{message}</p>
        )}
      </section>

      {cvResult && (
        <section
          style={{
            marginTop: "2rem",
            border: "1px solid #ddd",
            borderRadius: "12px",
            padding: "1.25rem",
            background: "#fff",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "1rem",
              flexWrap: "wrap",
              marginBottom: "1rem",
            }}
          >
            <h2 style={{ margin: 0 }}>Generated CV Draft ({language})</h2>

            <button onClick={() => handleCopy(cvResult)} style={buttonStyle}>
              Copy CV
            </button>
          </div>

          <textarea
            value={cvResult}
            onChange={(e) => setCvResult(e.target.value)}
            rows={24}
            style={textareaStyle}
          />
        </section>
      )}

      {coverLetterResult && (
        <section
          style={{
            marginTop: "2rem",
            border: "1px solid #ddd",
            borderRadius: "12px",
            padding: "1.25rem",
            background: "#fff",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "1rem",
              flexWrap: "wrap",
              marginBottom: "1rem",
            }}
          >
            <h2 style={{ margin: 0 }}>Generated Cover Letter Draft ({language})</h2>

            <button onClick={() => handleCopy(coverLetterResult)} style={buttonStyle}>
              Copy Cover Letter
            </button>
          </div>

          <textarea
            value={coverLetterResult}
            onChange={(e) => setCoverLetterResult(e.target.value)}
            rows={16}
            style={textareaStyle}
          />
        </section>
      )}
    </main>
  );
}