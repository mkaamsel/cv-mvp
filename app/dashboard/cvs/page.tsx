"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type CVRecord = {
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

export default function CVListPage() {
  const supabase = createSupabaseBrowserClient();

  const [cvs, setCvs] = useState<CVRecord[]>([]);
  const [message, setMessage] = useState("Loading...");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [creatingVersionId, setCreatingVersionId] = useState<string | null>(null);
  const [itemMessage, setItemMessage] = useState<Record<string, string>>({});

  const fetchCVs = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setMessage("You must be logged in.");
      return;
    }

    const { data, error } = await supabase
      .from("cvs")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      setMessage("Failed to load CVs.");
      return;
    }

    setCvs(data || []);
    setMessage(data && data.length > 0 ? "" : "No saved CVs yet.");
  };

  useEffect(() => {
    fetchCVs();
  }, []);

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    alert("Copied to clipboard!");
  };

  const handleChange = (id: string, value: string) => {
    setCvs((prev) =>
      prev.map((cv) => (cv.id === id ? { ...cv, content: value } : cv))
    );
  };

  const handleSave = async (id: string, content: string) => {
    setSavingId(id);
    setItemMessage((prev) => ({ ...prev, [id]: "" }));

    const { error } = await supabase.from("cvs").update({ content }).eq("id", id);

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
    } = await supabase.auth.getUser();

    if (!user) {
      setItemMessage((prev) => ({
        ...prev,
        [id]: "You must be logged in.",
      }));
      setCreatingVersionId(null);
      return;
    }

    const { error } = await supabase.from("cvs").insert([
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
    fetchCVs();
  };

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm("Delete this CV?");
    if (!confirmed) return;

    setDeletingId(id);
    setItemMessage((prev) => ({ ...prev, [id]: "" }));

    const { error } = await supabase.from("cvs").delete().eq("id", id);

    if (error) {
      setItemMessage((prev) => ({
        ...prev,
        [id]: "Failed to delete CV.",
      }));
      setDeletingId(null);
      return;
    }

    const updated = cvs.filter((cv) => cv.id !== id);
    setCvs(updated);
    setDeletingId(null);
    setMessage(updated.length > 0 ? "" : "No saved CVs yet.");
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
          <h1 style={{ marginBottom: "0.5rem" }}>My Saved CVs</h1>
          <p style={{ color: "#555", margin: 0 }}>
            Review, edit, copy, delete, and create new versions of your generated CVs.
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

      {cvs.map((cv) => (
        <section
          key={cv.id}
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
              <strong>Created:</strong> {new Date(cv.created_at).toLocaleString()}
            </p>

            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              <button onClick={() => handleCopy(cv.content)} style={buttonStyle}>
                Copy CV
              </button>

              <button
                onClick={() => handleSave(cv.id, cv.content)}
                style={buttonStyle}
                disabled={savingId === cv.id}
              >
                {savingId === cv.id ? "Saving..." : "Save Changes"}
              </button>

              <button
                onClick={() => handleSaveAsNewVersion(cv.id, cv.content)}
                style={buttonStyle}
                disabled={creatingVersionId === cv.id}
              >
                {creatingVersionId === cv.id ? "Saving New Version..." : "Save as New Version"}
              </button>

              <button
                onClick={() => handleDelete(cv.id)}
                style={dangerButtonStyle}
                disabled={deletingId === cv.id}
              >
                {deletingId === cv.id ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>

          <textarea
            value={cv.content}
            onChange={(e) => handleChange(cv.id, e.target.value)}
            rows={18}
            style={textareaStyle}
          />

          {itemMessage[cv.id] && (
            <p style={{ marginTop: "0.75rem", color: "#555" }}>
              {itemMessage[cv.id]}
            </p>
          )}
        </section>
      ))}
    </main>
  );
}