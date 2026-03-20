"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type LetterRecord = {
  id: string;
  content: string;
  created_at: string;
};

const buttonStyle: React.CSSProperties = {
  padding: "0.75rem 1rem",
  cursor: "pointer",
  border: "1px solid #ccc",
  borderRadius: "10px",
  background: "#f8f8f8",
};

const dangerButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  border: "1px solid #d6a5a5",
};

const textareaStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.85rem",
  border: "1px solid #ccc",
  borderRadius: "10px",
  resize: "vertical",
};

export default function CoverLettersPage() {
  const supabase = createSupabaseBrowserClient();

  const [letters, setLetters] = useState<LetterRecord[]>([]);
  const [message, setMessage] = useState("Loading...");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [creatingVersionId, setCreatingVersionId] = useState<string | null>(null);
  const [itemMessage, setItemMessage] = useState<Record<string, string>>({});

  const fetchLetters = async () => {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setMessage("You must be logged in.");
      return;
    }

    const { data, error } = await supabase
      .from("cover_letters")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      setMessage("Failed to load cover letter drafts.");
      return;
    }

    setLetters(data || []);
    setMessage(data && data.length > 0 ? "" : "No saved cover letter drafts yet.");
  };

  useEffect(() => {
    fetchLetters();
  }, []);

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    alert("Copied to clipboard!");
  };

  const handleChange = (id: string, value: string) => {
    setLetters((prev) =>
      prev.map((letter) =>
        letter.id === id ? { ...letter, content: value } : letter
      )
    );
  };

  const handleSave = async (id: string, content: string) => {
    setSavingId(id);
    setItemMessage((prev) => ({ ...prev, [id]: "" }));

    const { error } = await supabase
      .from("cover_letters")
      .update({ content })
      .eq("id", id);

    if (error) {
      setItemMessage((prev) => ({
        ...prev,
        [id]: "Failed to save changes.",
      }));
      setSavingId(null);
      return;
    }

    setItemMessage((prev) => ({
      ...prev,
      [id]: "Changes saved.",
    }));
    setSavingId(null);
  };

  const handleSaveAsNewVersion = async (id: string, content: string) => {
    setCreatingVersionId(id);
    setItemMessage((prev) => ({ ...prev, [id]: "" }));

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setItemMessage((prev) => ({
        ...prev,
        [id]: "You must be logged in.",
      }));
      setCreatingVersionId(null);
      return;
    }

    const { error } = await supabase.from("cover_letters").insert([
      {
        user_id: user.id,
        content,
      },
    ]);

    if (error) {
      setItemMessage((prev) => ({
        ...prev,
        [id]: "Failed to create new version.",
      }));
      setCreatingVersionId(null);
      return;
    }

    setItemMessage((prev) => ({
      ...prev,
      [id]: "New version saved.",
    }));
    setCreatingVersionId(null);
    fetchLetters();
  };

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm("Delete this cover letter draft?");
    if (!confirmed) return;

    setDeletingId(id);
    setItemMessage((prev) => ({ ...prev, [id]: "" }));

    const { error } = await supabase.from("cover_letters").delete().eq("id", id);

    if (error) {
      setItemMessage((prev) => ({
        ...prev,
        [id]: "Failed to delete cover letter draft.",
      }));
      setDeletingId(null);
      return;
    }

    const updated = letters.filter((letter) => letter.id !== id);
    setLetters(updated);
    setDeletingId(null);
    setMessage(updated.length > 0 ? "" : "No saved cover letter drafts yet.");
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
          <h1 style={{ marginBottom: "0.5rem" }}>Cover Letter History</h1>
          <p style={{ color: "#555", margin: 0 }}>
            Review, edit, delete, version, or reuse parts of previously generated cover letter drafts.
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

      {message && <p>{message}</p>}

      {letters.map((letter) => (
        <section
          key={letter.id}
          style={{
            marginTop: "1rem",
            padding: "1.25rem",
            border: "1px solid #ddd",
            borderRadius: "12px",
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
            <p style={{ margin: 0 }}>
              <strong>Created:</strong> {new Date(letter.created_at).toLocaleString()}
            </p>

            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              <button onClick={() => handleCopy(letter.content)} style={buttonStyle}>
                Copy Draft
              </button>

              <button
                onClick={() => handleSave(letter.id, letter.content)}
                style={buttonStyle}
                disabled={savingId === letter.id}
              >
                {savingId === letter.id ? "Saving..." : "Save Changes"}
              </button>

              <button
                onClick={() => handleSaveAsNewVersion(letter.id, letter.content)}
                style={buttonStyle}
                disabled={creatingVersionId === letter.id}
              >
                {creatingVersionId === letter.id
                  ? "Saving New Version..."
                  : "Save as New Version"}
              </button>

              <button
                onClick={() => handleDelete(letter.id)}
                style={dangerButtonStyle}
                disabled={deletingId === letter.id}
              >
                {deletingId === letter.id ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>

          <textarea
            value={letter.content}
            onChange={(e) => handleChange(letter.id, e.target.value)}
            rows={14}
            style={textareaStyle}
          />

          {itemMessage[letter.id] && (
            <p style={{ marginTop: "0.75rem", color: "#555" }}>
              {itemMessage[letter.id]}
            </p>
          )}
        </section>
      ))}
    </main>
  );
}