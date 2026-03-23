"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type Question = {
  field: string;
  question: string;
};

export default function ProfileOnboardingPage() {
  const [cvTexts, setCvTexts] = useState<string[]>([""]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [sessionId, setSessionId] = useState("");
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [consentChecked, setConsentChecked] = useState(false);

  const canStart = useMemo(() => {
    const hasAtLeastOneCv = cvTexts.some((text) => text.trim().length > 0);
    return hasAtLeastOneCv && consentChecked && !loading;
  }, [cvTexts, consentChecked, loading]);

  const updateCv = (index: number, value: string) => {
    const next = [...cvTexts];
    next[index] = value;
    setCvTexts(next);
  };

  const addCvBox = () => {
    if (cvTexts.length >= 3) return;
    setCvTexts([...cvTexts, ""]);
  };

  const startOnboarding = async () => {
    if (!consentChecked) {
      setMessage(
        "Please confirm that you agree to the processing of your personal data before continuing.",
      );
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const res = await fetch("/api/profile-onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cvTexts }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.error || "Something went wrong.");
        return;
      }

      setSessionId(data.sessionId);
      setQuestions(data.questions || []);
      setProfile(data.profile);
      setMessage(data.message || "");
    } catch {
      setMessage("Something went wrong while building your profile.");
    } finally {
      setLoading(false);
    }
  };

  const completeOnboarding = async () => {
    setLoading(true);
    setMessage("");

    try {
      const res = await fetch("/api/profile-onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, answers }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.error || "Something went wrong.");
        return;
      }

      setProfile(data.profile);
      setQuestions([]);
      setMessage("Your canonical profile has been saved.");
    } catch {
      setMessage("Something went wrong while saving your profile.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Create your canonical profile</h1>

      <div className="space-y-3 rounded-xl border p-4 bg-white">
        <p className="text-sm text-gray-700">
          You can upload or paste up to 3 CVs. If you have more than 3, please
          merge them into one document. Duplicates are removed automatically.
        </p>

        <p className="text-sm text-gray-700">
          If you do not want your direct personal information to be processed by
          AI at this stage, you may replace it with placeholders such as{" "}
          <span className="font-medium">Name Name</span>,{" "}
          <span className="font-medium">Telefon Telefon</span>, or{" "}
          <span className="font-medium">Email Email</span>. Plain text is
          accepted.
        </p>

        <label className="flex items-start gap-3 text-sm text-gray-700">
          <input
            type="checkbox"
            className="mt-1"
            checked={consentChecked}
            onChange={(e) => setConsentChecked(e.target.checked)}
          />
          <span>
            By checking this box, I agree that my personal data may be processed
            for profile creation and application-tailoring purposes. I have read
            the{" "}
            <Link
              href="/gdpr-policy"
              className="underline font-medium"
              target="_blank"
            >
              GDPR / Privacy Policy
            </Link>
            .
          </span>
        </label>
      </div>

      {cvTexts.map((text, index) => (
        <textarea
          key={index}
          className="w-full min-h-40 border rounded-lg p-3"
          placeholder={`Paste CV ${index + 1}`}
          value={text}
          onChange={(e) => updateCv(index, e.target.value)}
        />
      ))}

      {cvTexts.length < 3 && (
        <button
          onClick={addCvBox}
          className="border rounded-lg px-4 py-2"
          type="button"
        >
          Add another CV
        </button>
      )}

      <div>
        <button
          onClick={startOnboarding}
          disabled={!canStart}
          className={`rounded-lg px-4 py-2 border ${
            !canStart ? "opacity-50 cursor-not-allowed" : ""
          }`}
          type="button"
        >
          {loading ? "Processing..." : "Build profile"}
        </button>
      </div>

      {profile && (
        <div className="border rounded-xl p-4 space-y-2">
          <h2 className="font-semibold">Draft profile</h2>
          <pre className="text-xs whitespace-pre-wrap">
            {JSON.stringify(profile, null, 2)}
          </pre>
        </div>
      )}

      {questions.length > 0 && (
        <div className="space-y-4 border rounded-xl p-4">
          <h2 className="font-semibold">A few details are still missing</h2>

          <p className="text-sm text-gray-600">
            You may answer with real values or with placeholders such as{" "}
            <span className="font-medium">Telefon Telefon</span> if you prefer
            not to provide personal details yet.
          </p>

          {questions.map((q) => (
            <div key={q.field} className="space-y-1">
              <label className="block text-sm font-medium">{q.question}</label>
              <input
                type="text"
                className="w-full border rounded-lg p-2"
                placeholder={`Enter ${q.field.replaceAll("_", " ")}`}
                value={answers[q.field] || ""}
                onChange={(e) =>
                  setAnswers((prev) => ({ ...prev, [q.field]: e.target.value }))
                }
              />
            </div>
          ))}

          <button
            onClick={completeOnboarding}
            disabled={loading}
            className="rounded-lg px-4 py-2 border"
            type="button"
          >
            {loading ? "Saving..." : "Save canonical profile"}
          </button>
        </div>
      )}

      {message && <p className="text-sm">{message}</p>}
    </main>
  );
}