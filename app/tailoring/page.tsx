"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type OutputLanguage = "English" | "German";
type WritingLevel =
  | "Simple professional"
  | "B2 professional"
  | "C1 professional"
  | "Strong polished professional";

type FeedbackDocumentType = "cv" | "cover_letter";
type StatusTone = "neutral" | "success" | "error";
type DraftTable = "cvs" | "cover_letters";

type CandidateProfile = {
  highest_education: string | null;
  years_experience_estimate: string | null;
  seniority_level: string | null;
  leadership_experience: string | null;
  languages: string[];
  core_skills: string[];
  erp_systems: string[];
  reporting_frameworks: string[];
  location: string | null;
  age_present_in_cv: boolean;
  age_value: string | null;
};

type RoleFitResult = {
  fit_score: number;
  warning: boolean;
  strengths: string[];
  gaps: string[];
  summary: string;
};

export default function TailoringPage() {
  const supabase = createSupabaseBrowserClient();

  const [jobText, setJobText] = useState("");
  const [cvResult, setCvResult] = useState("");
  const [coverLetterResult, setCoverLetterResult] = useState("");

  const [loadingCV, setLoadingCV] = useState(false);
  const [loadingLetter, setLoadingLetter] = useState(false);
  const [cvProgressText, setCvProgressText] = useState("");
  const [letterProgressText, setLetterProgressText] = useState("");

  const [statusMessage, setStatusMessage] = useState("");
  const [statusTone, setStatusTone] = useState<StatusTone>("neutral");

  const [hasBaseCV, setHasBaseCV] = useState(false);
  const [language, setLanguage] = useState<OutputLanguage>("English");
  const [writingLevel, setWritingLevel] =
    useState<WritingLevel>("Simple professional");
  const [strengths, setStrengths] = useState("");
  const [motivation, setMotivation] = useState("");

  const [candidateProfile, setCandidateProfile] =
    useState<CandidateProfile | null>(null);
  const [roleFit, setRoleFit] = useState<RoleFitResult | null>(null);

  const [cvFeedbackSubmitted, setCvFeedbackSubmitted] = useState(false);
  const [coverLetterFeedbackSubmitted, setCoverLetterFeedbackSubmitted] =
    useState(false);

  const [cvQualityRating, setCvQualityRating] = useState<number | null>(null);
  const [cvTimeSavingRating, setCvTimeSavingRating] = useState<number | null>(
    null,
  );
  const [cvComments, setCvComments] = useState("");

  const [letterQualityRating, setLetterQualityRating] = useState<number | null>(
    null,
  );
  const [letterTimeSavingRating, setLetterTimeSavingRating] = useState<
    number | null
  >(null);
  const [letterComments, setLetterComments] = useState("");

  const [submittingCvFeedback, setSubmittingCvFeedback] = useState(false);
  const [submittingLetterFeedback, setSubmittingLetterFeedback] =
    useState(false);

  const [copiedCv, setCopiedCv] = useState(false);
  const [copiedLetter, setCopiedLetter] = useState(false);

  useEffect(() => {
    const checkBaseCV = async () => {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          setHasBaseCV(false);
          return;
        }

        const { data, error } = await supabase
          .from("profiles")
          .select("cv_text")
          .eq("id", user.id)
          .maybeSingle();

        if (error) {
          console.error("Profile load error:", error);
          setHasBaseCV(false);
          return;
        }

        setHasBaseCV(Boolean(data?.cv_text?.trim()));
      } catch (error) {
        console.error("Base CV check error:", error);
        setHasBaseCV(false);
      }
    };

    checkBaseCV();
  }, [supabase]);

  const setNeutralMessage = (text: string) => {
    setStatusTone("neutral");
    setStatusMessage(text);
  };

  const setSuccessMessage = (text: string) => {
    setStatusTone("success");
    setStatusMessage(text);
  };

  const setErrorMessage = (text: string) => {
    setStatusTone("error");
    setStatusMessage(text);
  };

  const resetCvFeedback = () => {
    setCvFeedbackSubmitted(false);
    setCvQualityRating(null);
    setCvTimeSavingRating(null);
    setCvComments("");
  };

  const resetLetterFeedback = () => {
    setCoverLetterFeedbackSubmitted(false);
    setLetterQualityRating(null);
    setLetterTimeSavingRating(null);
    setLetterComments("");
  };

  const getUserAndCV = async () => {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setErrorMessage("You must be logged in.");
      return null;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("cv_text")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error("Profile read error:", profileError);
      setErrorMessage("Could not load your saved base CV.");
      return null;
    }

    const cvText = profile?.cv_text?.trim() || "";

    if (!cvText) {
      setErrorMessage(
        "No saved base CV found. Please go to Profile, save your base CV, and try again.",
      );
      setHasBaseCV(false);
      return null;
    }

    if (!jobText.trim()) {
      setErrorMessage("Please paste a job description first.");
      return null;
    }

    setHasBaseCV(true);
    return { user, cvText };
  };

  const saveDraftWithLimit = async (
    table: DraftTable,
    userId: string,
    content: string,
  ) => {
    const { error: insertError } = await supabase.from(table).insert([
      {
        user_id: userId,
        content,
      },
    ]);

    if (insertError) {
      throw insertError;
    }

    const { data: rows, error: fetchError } = await supabase
      .from(table)
      .select("id, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (fetchError) {
      throw fetchError;
    }

    const extraRows = rows?.slice(5) || [];
    const idsToDelete = extraRows.map((row) => row.id);

    if (idsToDelete.length > 0) {
      const { error: deleteError } = await supabase
        .from(table)
        .delete()
        .in("id", idsToDelete);

      if (deleteError) {
        throw deleteError;
      }
    }
  };

  const extractCandidateAndRoleFit = async (cvText: string, currentJobText: string) => {
    const extractRes = await fetch("/api/extract-candidate-profile", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ cvText }),
    });

    const extractData = await extractRes.json();

    if (!extractRes.ok) {
      throw new Error(extractData.error || "Failed to extract candidate profile.");
    }

    const extractedProfile = extractData.result as CandidateProfile;
    setCandidateProfile(extractedProfile);

    const fitRes = await fetch("/api/check-role-fit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        candidateProfile: extractedProfile,
        jobText: currentJobText,
      }),
    });

    const fitData = await fitRes.json();

    if (!fitRes.ok) {
      throw new Error(fitData.error || "Failed to check role fit.");
    }

    const fitResult = fitData.result as RoleFitResult;
    setRoleFit(fitResult);

    return { extractedProfile, fitResult };
  };

  const submitFeedback = async ({
    documentType,
    qualityRating,
    comments,
    timeSavingRating,
  }: {
    documentType: FeedbackDocumentType;
    qualityRating: number | null;
    comments: string;
    timeSavingRating: number | null;
  }) => {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setErrorMessage("You must be logged in to submit feedback.");
      return false;
    }

    if (qualityRating === null || timeSavingRating === null) {
      setErrorMessage("Please answer all required feedback questions.");
      return false;
    }

    const { error } = await supabase.from("feedback").insert([
      {
        user_id: user.id,
        document_type: documentType,
        rating_quality: qualityRating,
        rating_time_saved: timeSavingRating,
        comments,
      },
    ]);

    if (error) {
      console.error("Feedback save error:", error);
      setErrorMessage("Failed to save feedback.");
      return false;
    }

    return true;
  };

  const handleSubmitCvFeedback = async () => {
    setSubmittingCvFeedback(true);
    setNeutralMessage("");

    try {
      const ok = await submitFeedback({
        documentType: "cv",
        qualityRating: cvQualityRating,
        comments: cvComments,
        timeSavingRating: cvTimeSavingRating,
      });

      if (!ok) return;

      setCvFeedbackSubmitted(true);
      setSuccessMessage("Thank you — your CV feedback was saved.");
    } finally {
      setSubmittingCvFeedback(false);
    }
  };

  const handleSubmitLetterFeedback = async () => {
    setSubmittingLetterFeedback(true);
    setNeutralMessage("");

    try {
      const ok = await submitFeedback({
        documentType: "cover_letter",
        qualityRating: letterQualityRating,
        comments: letterComments,
        timeSavingRating: letterTimeSavingRating,
      });

      if (!ok) return;

      setCoverLetterFeedbackSubmitted(true);
      setSuccessMessage("Thank you — your cover letter feedback was saved.");
    } finally {
      setSubmittingLetterFeedback(false);
    }
  };

  const handleGenerateCV = async () => {
    setLoadingCV(true);
    setCvProgressText("Checking your base CV and job description...");
    setNeutralMessage("");
    resetCvFeedback();
    setCopiedCv(false);
    setCvResult("");

    try {
      const setup = await getUserAndCV();
      if (!setup) {
        setLoadingCV(false);
        setCvProgressText("");
        return;
      }

      const { user, cvText } = setup;

      setCvProgressText("Extracting key candidate data and checking role fit...");
      await extractCandidateAndRoleFit(cvText, jobText);

      setCvProgressText("Generating your tailored CV draft...");

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cvText,
          jobText,
          outputLanguage: language,
          writingLevel,
          strengths,
          motivation,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || "Failed to generate CV.");
        setLoadingCV(false);
        setCvProgressText("");
        return;
      }

      setCvProgressText("Saving your generated CV draft...");

      const outputText = data.result || "No result";
      setCvResult(outputText);

      await saveDraftWithLimit("cvs", user.id, outputText);

      setSuccessMessage(
        `CV draft generated and saved successfully in ${language}. Only your latest 5 CV drafts are stored.`,
      );
    } catch (error) {
      console.error(error);
      setErrorMessage("Something went wrong while generating the CV.");
    } finally {
      setLoadingCV(false);
      setCvProgressText("");
    }
  };

  const handleGenerateCoverLetter = async () => {
    setLoadingLetter(true);
    setLetterProgressText("Checking your base CV and job description...");
    setNeutralMessage("");
    resetLetterFeedback();
    setCopiedLetter(false);
    setCoverLetterResult("");

    try {
      const setup = await getUserAndCV();
      if (!setup) {
        setLoadingLetter(false);
        setLetterProgressText("");
        return;
      }

      const { user, cvText } = setup;

      if (!candidateProfile || !roleFit) {
        setLetterProgressText("Extracting key candidate data and checking role fit...");
        await extractCandidateAndRoleFit(cvText, jobText);
      }

      setLetterProgressText("Generating your tailored cover letter draft...");

      const res = await fetch("/api/generate-cover-letter", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cvText,
          jobText,
          outputLanguage: language,
          writingLevel,
          strengths,
          motivation,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || "Failed to generate cover letter.");
        setLoadingLetter(false);
        setLetterProgressText("");
        return;
      }

      setLetterProgressText("Saving your generated cover letter draft...");

      const outputText = data.result || "No result";
      setCoverLetterResult(outputText);

      await saveDraftWithLimit("cover_letters", user.id, outputText);

      setSuccessMessage(
        `Cover letter draft generated and saved successfully in ${language}. Only your latest 5 cover letter drafts are stored.`,
      );
    } catch (error) {
      console.error(error);
      setErrorMessage("Something went wrong while generating the cover letter.");
    } finally {
      setLoadingLetter(false);
      setLetterProgressText("");
    }
  };

  const handleCopy = async (text: string, type: FeedbackDocumentType) => {
    try {
      await navigator.clipboard.writeText(text);

      if (type === "cv") {
        setCopiedCv(true);
      } else {
        setCopiedLetter(true);
      }

      setSuccessMessage(
        type === "cv" ? "CV copied to clipboard." : "Cover letter copied to clipboard.",
      );
    } catch (error) {
      console.error(error);
      setErrorMessage("Copy failed. Please try again.");
    }
  };

  const renderTenStarRating = ({
    value,
    onChange,
    label,
  }: {
    value: number | null;
    onChange: (value: number) => void;
    label: string;
  }) => {
    return (
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-200">{label}</label>

        <div className="flex flex-wrap items-center gap-2">
          {Array.from({ length: 10 }, (_, index) => {
            const star = index + 1;
            const active = value !== null && value >= star;

            return (
              <button
                key={star}
                type="button"
                onClick={() => onChange(star)}
                className={`text-2xl leading-none transition ${
                  active ? "text-amber-400" : "text-slate-500 hover:text-slate-300"
                }`}
                aria-label={`${label}: ${star} out of 10`}
                title={`${star}/10`}
              >
                ★
              </button>
            );
          })}

          <span className="ml-2 text-sm text-slate-400">
            {value !== null ? `${value}/10` : "Not rated"}
          </span>
        </div>
      </div>
    );
  };

  const writingLevelOptions: WritingLevel[] =
    language === "German"
      ? ["Simple professional", "B2 professional", "C1 professional"]
      : [
          "Simple professional",
          "B2 professional",
          "C1 professional",
          "Strong polished professional",
        ];

  const statusToneClass =
    statusTone === "success"
      ? "text-emerald-300"
      : statusTone === "error"
        ? "text-rose-300"
        : "text-slate-200";

  return (
    <main className="mx-auto max-w-5xl px-6 py-10 text-white">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-teal-300">
            Tailoring workspace
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white md:text-4xl">
            Create a tailored CV and cover letter
          </h1>
          <p className="mt-3 text-base leading-7 text-slate-300">
            Start from your saved base CV, add the job description, and guide the
            output with writing level, strengths, and motivation.
          </p>
        </div>

        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/10"
        >
          Back to Dashboard
        </Link>
      </div>

      <section className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
        <p className={`font-medium ${hasBaseCV ? "text-emerald-300" : "text-amber-300"}`}>
          {hasBaseCV
            ? "Base CV found and ready to use."
            : "No saved base CV found yet. Save it first in Profile."}
        </p>
      </section>

      {roleFit && (
        <section
          className={`mb-6 rounded-2xl border p-5 ${
            roleFit.warning
              ? "border-amber-400/30 bg-amber-400/10"
              : "border-emerald-400/20 bg-emerald-400/10"
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-white">Role fit check</h2>
            <span
              className={`rounded-full px-3 py-1 text-sm font-semibold ${
                roleFit.warning
                  ? "bg-amber-300 text-slate-950"
                  : "bg-emerald-300 text-slate-950"
              }`}
            >
              Fit score: {roleFit.fit_score}/100
            </span>
          </div>

          <p className="mt-3 text-sm text-slate-200">{roleFit.summary}</p>

          {roleFit.warning && (
            <p className="mt-3 text-sm font-medium text-amber-200">
              Warning: this job may not be a strong fit for your current profile. You
              can still generate drafts if you want to explore the role.
            </p>
          )}

          {roleFit.strengths.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-semibold text-white">Strengths</p>
              <p className="mt-1 text-sm text-slate-300">
                {roleFit.strengths.join(", ")}
              </p>
            </div>
          )}

          {roleFit.gaps.length > 0 && (
            <div className="mt-3">
              <p className="text-sm font-semibold text-white">Gaps</p>
              <p className="mt-1 text-sm text-slate-300">{roleFit.gaps.join(", ")}</p>
            </div>
          )}
        </section>
      )}

      <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/20">
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <p className="mb-3 text-sm font-semibold text-slate-200">Output language</p>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setLanguage("English")}
                className={`rounded-xl px-5 py-3 text-sm font-semibold transition ${
                  language === "English"
                    ? "bg-teal-400 text-slate-950"
                    : "border border-white/10 bg-white/5 text-white hover:bg-white/10"
                }`}
              >
                English
              </button>

              <button
                type="button"
                onClick={() => setLanguage("German")}
                className={`rounded-xl px-5 py-3 text-sm font-semibold transition ${
                  language === "German"
                    ? "bg-teal-400 text-slate-950"
                    : "border border-white/10 bg-white/5 text-white hover:bg-white/10"
                }`}
              >
                German
              </button>
            </div>
          </div>

          <div>
            <label
              htmlFor="writingLevel"
              className="mb-3 block text-sm font-semibold text-slate-200"
            >
              Writing level
            </label>
            <select
              id="writingLevel"
              value={writingLevel}
              onChange={(e) => setWritingLevel(e.target.value as WritingLevel)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-teal-300"
            >
              {writingLevelOptions.map((option) => (
                <option key={option} value={option} className="text-black">
                  {option}
                </option>
              ))}
            </select>
            <p className="mt-2 text-sm text-slate-400">
              Choose how simple or polished the wording should feel.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div>
            <label
              htmlFor="strengths"
              className="mb-3 block text-sm font-semibold text-slate-200"
            >
              Top strengths to highlight
            </label>
            <input
              id="strengths"
              type="text"
              placeholder="Example: IFRS reporting, HGB, SAP, consolidation"
              value={strengths}
              onChange={(e) => setStrengths(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-slate-500 outline-none transition focus:border-teal-300"
            />
          </div>

          <div>
            <label
              htmlFor="motivation"
              className="mb-3 block text-sm font-semibold text-slate-200"
            >
              Motivation for this role
            </label>
            <textarea
              id="motivation"
              placeholder="Example: I want to move into a broader group accounting role in an international environment."
              value={motivation}
              onChange={(e) => setMotivation(e.target.value)}
              rows={4}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-slate-500 outline-none transition focus:border-teal-300"
            />
          </div>
        </div>

        <div className="mt-6">
          <label
            htmlFor="jobText"
            className="mb-3 block text-sm font-semibold text-slate-200"
          >
            Job description
          </label>

          <textarea
            id="jobText"
            placeholder="Paste the job description here"
            value={jobText}
            onChange={(e) => setJobText(e.target.value)}
            rows={12}
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-white placeholder:text-slate-500 outline-none transition focus:border-teal-300"
          />
        </div>

        <div className="mt-6 rounded-2xl border border-teal-400/20 bg-teal-400/5 p-4 text-sm text-slate-300">
          Feedback is optional. You can copy any generated draft immediately, and you can
          rate it afterward to help improve the tool.
        </div>

        <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
          Only your latest 5 CV drafts and latest 5 cover letter drafts are stored.
        </div>

        <div className="mt-6 flex flex-wrap gap-4">
          <button
            onClick={handleGenerateCV}
            disabled={loadingCV || loadingLetter}
            className="inline-flex items-center justify-center rounded-xl bg-teal-400 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-teal-300 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loadingCV ? "Generating CV..." : `Generate CV Draft (${language})`}
          </button>

          <button
            onClick={handleGenerateCoverLetter}
            disabled={loadingLetter || loadingCV}
            className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loadingLetter
              ? "Generating Cover Letter..."
              : `Generate Cover Letter Draft (${language})`}
          </button>
        </div>

        {(loadingCV || loadingLetter) && (
          <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-sm font-medium text-teal-300">
              {loadingCV ? cvProgressText : letterProgressText}
            </p>
            <p className="mt-2 text-sm text-slate-400">
              This can take a few seconds depending on the job description length.
            </p>
          </div>
        )}

        {statusMessage && (
          <p className={`mt-5 text-sm font-medium ${statusToneClass}`}>{statusMessage}</p>
        )}
      </section>

      {candidateProfile && (
        <section className="mt-8 rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/20">
          <h2 className="text-2xl font-semibold text-white">
            Extracted candidate profile
          </h2>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm font-medium text-slate-300">Education</p>
              <p className="mt-1 text-white">
                {candidateProfile.highest_education || "Not found"}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm font-medium text-slate-300">Experience</p>
              <p className="mt-1 text-white">
                {candidateProfile.years_experience_estimate || "Not found"}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm font-medium text-slate-300">Seniority</p>
              <p className="mt-1 text-white">
                {candidateProfile.seniority_level || "Not found"}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm font-medium text-slate-300">Leadership</p>
              <p className="mt-1 text-white">
                {candidateProfile.leadership_experience || "Not found"}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm font-medium text-slate-300">Location</p>
              <p className="mt-1 text-white">
                {candidateProfile.location || "Not found"}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm font-medium text-slate-300">Age in CV</p>
              <p className="mt-1 text-white">
                {candidateProfile.age_present_in_cv
                  ? candidateProfile.age_value || "Present"
                  : "Not present"}
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-sm font-medium text-slate-300">Languages</p>
            <p className="mt-1 text-white">
              {candidateProfile.languages.length > 0
                ? candidateProfile.languages.join(", ")
                : "Not found"}
            </p>
          </div>

          <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-sm font-medium text-slate-300">Core skills</p>
            <p className="mt-1 text-white">
              {candidateProfile.core_skills.length > 0
                ? candidateProfile.core_skills.join(", ")
                : "Not found"}
            </p>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm font-medium text-slate-300">ERP systems</p>
              <p className="mt-1 text-white">
                {candidateProfile.erp_systems.length > 0
                  ? candidateProfile.erp_systems.join(", ")
                  : "Not found"}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm font-medium text-slate-300">
                Reporting frameworks
              </p>
              <p className="mt-1 text-white">
                {candidateProfile.reporting_frameworks.length > 0
                  ? candidateProfile.reporting_frameworks.join(", ")
                  : "Not found"}
              </p>
            </div>
          </div>
        </section>
      )}

      {cvResult && (
        <section className="mt-8 rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/20">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-2xl font-semibold text-white">
              Generated CV Draft ({language})
            </h2>

            <button
              onClick={() => handleCopy(cvResult, "cv")}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/10"
            >
              {copiedCv ? "Copied" : "Copy CV"}
            </button>
          </div>

          <textarea
            value={cvResult}
            onChange={(e) => setCvResult(e.target.value)}
            rows={24}
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-white outline-none transition focus:border-teal-300"
          />

          {!cvFeedbackSubmitted && (
            <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5">
              <h3 className="text-lg font-semibold text-white">Optional feedback</h3>
              <p className="mt-2 text-sm text-slate-400">
                You can skip this, but your answers help improve the draft quality over
                time.
              </p>

              <div className="mt-4">
                {renderTenStarRating({
                  value: cvQualityRating,
                  onChange: setCvQualityRating,
                  label: "1. How would you rate this CV draft?",
                })}
              </div>

              <div className="mt-4">
                {renderTenStarRating({
                  value: cvTimeSavingRating,
                  onChange: setCvTimeSavingRating,
                  label: "2. How much time would this save you?",
                })}
              </div>

              <div className="mt-4">
                <label className="mb-2 block text-sm font-medium text-slate-200">
                  3. Your comments
                </label>
                <textarea
                  value={cvComments}
                  onChange={(e) => setCvComments(e.target.value)}
                  rows={4}
                  placeholder="Optional: share what worked, what felt weak, what was missing, or how this could be improved."
                  className="w-full rounded-xl border border-white/10 bg-slate-800 px-4 py-3 text-white placeholder:text-slate-500 outline-none transition focus:border-teal-300"
                />
              </div>

              <button
                onClick={handleSubmitCvFeedback}
                disabled={submittingCvFeedback}
                className="mt-5 rounded-xl bg-teal-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-teal-300 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {submittingCvFeedback ? "Submitting..." : "Send feedback"}
              </button>
            </div>
          )}
        </section>
      )}

      {coverLetterResult && (
        <section className="mt-8 rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/20">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-2xl font-semibold text-white">
              Generated Cover Letter Draft ({language})
            </h2>

            <button
              onClick={() => handleCopy(coverLetterResult, "cover_letter")}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/10"
            >
              {copiedLetter ? "Copied" : "Copy Cover Letter"}
            </button>
          </div>

          <textarea
            value={coverLetterResult}
            onChange={(e) => setCoverLetterResult(e.target.value)}
            rows={16}
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-white outline-none transition focus:border-teal-300"
          />

          {!coverLetterFeedbackSubmitted && (
            <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5">
              <h3 className="text-lg font-semibold text-white">Optional feedback</h3>
              <p className="mt-2 text-sm text-slate-400">
                You can skip this, but your answers help improve the draft quality over
                time.
              </p>

              <div className="mt-4">
                {renderTenStarRating({
                  value: letterQualityRating,
                  onChange: setLetterQualityRating,
                  label: "1. How would you rate this cover letter draft?",
                })}
              </div>

              <div className="mt-4">
                {renderTenStarRating({
                  value: letterTimeSavingRating,
                  onChange: setLetterTimeSavingRating,
                  label: "2. How much time would this save you?",
                })}
              </div>

              <div className="mt-4">
                <label className="mb-2 block text-sm font-medium text-slate-200">
                  3. Your comments
                </label>
                <textarea
                  value={letterComments}
                  onChange={(e) => setLetterComments(e.target.value)}
                  rows={4}
                  placeholder="Optional: share what worked, what felt weak, what was missing, or how this could be improved."
                  className="w-full rounded-xl border border-white/10 bg-slate-800 px-4 py-3 text-white placeholder:text-slate-500 outline-none transition focus:border-teal-300"
                />
              </div>

              <button
                onClick={handleSubmitLetterFeedback}
                disabled={submittingLetterFeedback}
                className="mt-5 rounded-xl bg-teal-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-teal-300 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {submittingLetterFeedback ? "Submitting..." : "Send feedback"}
              </button>
            </div>
          )}
        </section>
      )}
    </main>
  );
}