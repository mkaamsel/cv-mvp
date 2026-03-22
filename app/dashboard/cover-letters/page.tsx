"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type CoverLetterRecord = {
  id: string;
  content: string;
  created_at: string;
};

export default function CoverLetterListPage() {
  const supabase = createSupabaseBrowserClient();

  const [letters, setLetters] = useState<CoverLetterRecord[]>([]);
  const [message, setMessage] = useState("Loading...");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [creatingVersionId, setCreatingVersionId] = useState<string | null>(null);
  const [itemMessage, setItemMessage] = useState<Record<string, string>>({});

  const fetchLetters = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setMessage("You must be logged in.");
      return;
    }

    const { data, error } = await supabase
      .from("cover_letters")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      setMessage("Failed to load cover letters.");
      return;
    }

    setLetters(data || []);
    setMessage(data && data.length > 0 ? "" : "No saved cover letters yet.");
  };

  useEffect(() => {
    fetchLetters();
  }, []);

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    alert("Copied to clipboard.");
  };

  const handleChange = (id: string, value: string) => {
    setLetters((prev) =>
      prev.map((letter) => (letter.id === id ? { ...letter, content: value } : letter)),
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
    } = await supabase.auth.getUser();

    if (!user) {
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
    const confirmed = window.confirm("Delete this cover letter?");
    if (!confirmed) return;

    setDeletingId(id);
    setItemMessage((prev) => ({ ...prev, [id]: "" }));

    const { error } = await supabase.from("cover_letters").delete().eq("id", id);

    if (error) {
      setItemMessage((prev) => ({
        ...prev,
        [id]: "Failed to delete cover letter.",
      }));
      setDeletingId(null);
      return;
    }

    const updated = letters.filter((letter) => letter.id !== id);
    setLetters(updated);
    setDeletingId(null);
    setMessage(updated.length > 0 ? "" : "No saved cover letters yet.");
  };

  return (
    <main className="mx-auto max-w-5xl px-6 py-10 text-white">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-teal-300">
            Saved drafts
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white md:text-4xl">
            My Saved Cover Letters
          </h1>
          <p className="mt-3 text-base leading-7 text-slate-300">
            Review, edit, copy, delete, and create new versions of your generated cover
            letters.
          </p>
        </div>

        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/10"
        >
          Back to Dashboard
        </Link>
      </div>

      {message && (
        <div className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm font-medium text-slate-200 backdrop-blur">
          {message}
        </div>
      )}

      <div className="space-y-6">
        {letters.map((letter) => (
          <section
            key={letter.id}
            className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/20"
          >
            <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
              <p className="text-sm text-slate-300">
                <span className="font-semibold text-slate-100">Created:</span>{" "}
                {new Date(letter.created_at).toLocaleString()}
              </p>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => handleCopy(letter.content)}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/10"
                >
                  Copy Cover Letter
                </button>

                <button
                  onClick={() => handleSave(letter.id, letter.content)}
                  disabled={savingId === letter.id}
                  className="rounded-xl bg-teal-400 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-teal-300 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {savingId === letter.id ? "Saving..." : "Save Changes"}
                </button>

                <button
                  onClick={() => handleSaveAsNewVersion(letter.id, letter.content)}
                  disabled={creatingVersionId === letter.id}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {creatingVersionId === letter.id
                    ? "Saving New Version..."
                    : "Save as New Version"}
                </button>

                <button
                  onClick={() => handleDelete(letter.id)}
                  disabled={deletingId === letter.id}
                  className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-2.5 text-sm font-medium text-red-200 transition hover:bg-red-400/20 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {deletingId === letter.id ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>

            <textarea
              value={letter.content}
              onChange={(e) => handleChange(letter.id, e.target.value)}
              rows={16}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-white placeholder:text-slate-500 outline-none transition focus:border-teal-300"
            />

            {itemMessage[letter.id] && (
              <p className="mt-3 text-sm font-medium text-slate-300">
                {itemMessage[letter.id]}
              </p>
            )}
          </section>
        ))}
      </div>
    </main>
  );
}
