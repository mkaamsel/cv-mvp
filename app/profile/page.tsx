"use client";

import { useEffect, useState } from "react";
import mammoth from "mammoth";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function ProfilePage() {
  const supabase = createSupabaseBrowserClient();

  const [cvText, setCvText] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoading(true);
        setMessage("");

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          setMessage("You must be logged in to view your profile.");
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from("profiles")
          .select("cv_text")
          .eq("id", user.id)
          .maybeSingle();

        if (error) {
          console.error(error);
          setMessage("Could not load profile.");
        } else if (data?.cv_text) {
          setCvText(data.cv_text);
        }
      } catch (err) {
        console.error(err);
        setMessage("Something went wrong while loading your profile.");
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [supabase]);

  const handleCVUpload = async (file: File) => {
    try {
      const arrayBuffer = await file.arrayBuffer();

      const result = await mammoth.extractRawText({
        arrayBuffer,
      });

      setCvText(result.value);
      setMessage("CV text extracted. Review and save.");
    } catch (err) {
      console.error(err);
      setMessage("Could not read the CV file.");
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setMessage("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setMessage("You must be logged in to save your profile.");
        return;
      }

      const { error } = await supabase.from("profiles").upsert({
        id: user.id,
        cv_text: cvText,
      });

      if (error) {
        console.error(error);
        setMessage("Could not save profile.");
        return;
      }

      setMessage("Profile saved successfully.");
    } catch (err) {
      console.error(err);
      setMessage("Something went wrong while saving.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
        <div className="mx-auto max-w-3xl">Loading profile...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-semibold">Profile</h1>
        <p className="mt-2 text-sm text-slate-300">
          Save your master CV here. You can paste it manually or upload a DOCX file.
        </p>

        <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="mt-4">
            <label className="mb-2 block text-sm font-medium text-slate-200">
              Upload CV (.docx)
            </label>

            <input
              type="file"
              accept=".docx"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleCVUpload(file);
              }}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white"
            />
          </div>

          <div className="mt-6">
            <label className="mb-2 block text-sm font-medium text-slate-200">
              Master CV
            </label>

            <textarea
              value={cvText}
              onChange={(e) => setCvText(e.target.value)}
              rows={18}
              placeholder="Paste your master CV here..."
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-slate-400"
            />
          </div>

          <div className="mt-4 flex items-center gap-4">
            <button
  onClick={handleSave}
  disabled={saving}
  className="rounded-xl bg-cyan-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-slate-500 disabled:text-slate-200"
>
  {saving ? "Saving..." : "Save Profile"}
</button>

            {message ? (
              <p className="text-sm text-slate-300">{message}</p>
            ) : null}
          </div>
        </div>
      </div>
    </main>
  );
}