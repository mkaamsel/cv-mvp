"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { designTokens } from "@/lib/design/tokens";

const t = designTokens;

type FeedbackLocale = "en" | "de";

type FeedbackStarsProps = {
  runId?: string;
  stage: string;
  prompt?: string;
  locale?: FeedbackLocale;
};

function getStarColor(index: number, selected: number, hovered: number): string {
  const activeValue = hovered || selected;
  if (index > activeValue) return "#E5E7EB";

  if (activeValue <= 3) return "#DC2626";
  if (activeValue <= 7) return "#F59E0B";
  return "#16A34A";
}

function getCopy(locale: FeedbackLocale) {
  if (locale === "de") {
    return {
      saved: "Vielen Dank für Ihr Feedback.",
      helperDefault: "1–3 rot, 4–7 gelb, 8–10 grün",
      helperLow: "Verbesserungsbedarf",
      helperMid: "Akzeptabel",
      helperHigh: "Starker Output",
      improveTitle: "Was sollten wir hier verbessern?",
      placeholder: "Optionales Feedback",
      submit: "Feedback senden",
      saving: "Speichert...",
      skip: "Überspringen",
      error: "Feedback konnte nicht gespeichert werden.",
      alreadySubmitted: "Feedback bereits gespeichert.",
    };
  }

  return {
    saved: "Thank you for your feedback.",
    helperDefault: "1–3 red, 4–7 yellow, 8–10 green",
    helperLow: "Needs improvement",
    helperMid: "Acceptable",
    helperHigh: "Strong output",
    improveTitle: "What should we improve here?",
    placeholder: "Optional feedback",
    submit: "Submit feedback",
    saving: "Saving...",
    skip: "Skip",
    error: "Unable to save feedback.",
    alreadySubmitted: "Feedback already saved.",
  };
}

function getStorageKey(runId: string | undefined, stage: string) {
  return `cvmvp_feedback_${runId || "missing"}_${stage}`;
}

export default function FeedbackStars({
  runId,
  stage,
  prompt = "Rate this step",
  locale = "en",
}: FeedbackStarsProps) {
  const copy = useMemo(() => getCopy(locale), [locale]);
  const storageKey = useMemo(() => getStorageKey(runId, stage), [runId, stage]);

  const [selected, setSelected] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState("");
  const [showComment, setShowComment] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const startTimeRef = useRef<number>(Date.now());
  const successTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const storedValue = window.sessionStorage.getItem(storageKey);
    const storedSubmitted = window.sessionStorage.getItem(`${storageKey}_submitted`);

    if (storedValue) {
      const numericValue = Number(storedValue);
      if (!Number.isNaN(numericValue)) {
        setSelected(numericValue);
      }
    }

    if (storedSubmitted === "true") {
      setSubmitted(true);
      setSuccessMessage(copy.alreadySubmitted);
    }
  }, [storageKey, copy.alreadySubmitted]);

  useEffect(() => {
    return () => {
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current);
      }
    };
  }, []);

  const activeValue = hovered || selected;

  const helperText = useMemo(() => {
    if (successMessage) return successMessage;
    if (!activeValue) return copy.helperDefault;
    if (activeValue <= 3) return copy.helperLow;
    if (activeValue <= 7) return copy.helperMid;
    return copy.helperHigh;
  }, [activeValue, copy, successMessage]);

  function persistSubmission(value: number) {
    if (typeof window === "undefined") return;
    window.sessionStorage.setItem(storageKey, String(value));
    window.sessionStorage.setItem(`${storageKey}_submitted`, "true");
  }

  function showSavedMessage() {
    setSuccessMessage(copy.saved);

    if (successTimeoutRef.current) {
      clearTimeout(successTimeoutRef.current);
    }

    successTimeoutRef.current = setTimeout(() => {
      setSuccessMessage(copy.alreadySubmitted);
    }, 4500);
  }

  async function saveFeedback(
    stars: number,
    feedbackComment?: string,
    stepTimeMs?: number
  ) {
    try {
      setSubmitting(true);
      setError("");

      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          runId: runId || null,
          stage,
          page: stage,
          stars,
          comment: feedbackComment?.trim() || null,
          stepTimeMs: stepTimeMs ?? null,
        }),
      });

      const data = (await response.json()) as { ok?: boolean; error?: string };

      if (!response.ok || !data.ok) {
        throw new Error(data.error || copy.error);
      }

      setSubmitted(true);
      setShowComment(false);
      persistSubmission(stars);
      showSavedMessage();
    } catch (err) {
      console.warn("Feedback save failed — continuing", err);
      setError(err instanceof Error ? err.message : copy.error);
      setShowComment(false);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStarClick(value: number) {
    if (submitting || submitted) return;

    setSelected(value);
    setError("");
    setSuccessMessage("");

    if (value <= 3) {
      setShowComment(true);
      return;
    }

    setShowComment(false);
    await saveFeedback(value, undefined, Date.now() - startTimeRef.current);
  }

  async function handleCommentSubmit() {
    if (!selected || submitting || submitted) return;
    await saveFeedback(selected, comment, Date.now() - startTimeRef.current);
  }

  async function handleSkipComment() {
    if (!selected || submitting || submitted) return;
    await saveFeedback(selected, undefined, Date.now() - startTimeRef.current);
  }

  return (
    <div
      style={{
        marginTop: 18,
        border: `1px solid ${t.colors.border}`,
        borderRadius: t.radius.md,
        background: t.colors.surface,
        padding: 16,
      }}
    >
      <div
        style={{
          fontSize: 14,
          fontWeight: 700,
          color: t.colors.textPrimary,
        }}
      >
        {prompt}
      </div>

      <div
        style={{
          display: "flex",
          gap: 6,
          flexWrap: "wrap",
          marginTop: 12,
        }}
      >
        {Array.from({ length: 10 }, (_, i) => {
          const value = i + 1;
          return (
            <button
              key={value}
              type="button"
              disabled={submitting || submitted}
              onMouseEnter={() => setHovered(value)}
              onMouseLeave={() => setHovered(0)}
              onClick={() => void handleStarClick(value)}
              aria-label={`Rate ${value} out of 10`}
              style={{
                border: "none",
                background: "transparent",
                padding: 0,
                margin: 0,
                cursor: submitting || submitted ? "default" : "pointer",
                fontSize: 24,
                lineHeight: 1,
                color: getStarColor(value, selected, hovered),
                opacity: submitting ? 0.7 : 1,
              }}
            >
              ★
            </button>
          );
        })}
      </div>

      <div
        style={{
          marginTop: 10,
          fontSize: 12,
          color: successMessage
            ? "#166534"
            : error
              ? "#B91C1C"
              : t.colors.textMuted,
          fontWeight: successMessage ? 700 : 400,
        }}
      >
        {error || helperText}
      </div>

      {showComment && !submitted ? (
        <div
          style={{
            marginTop: 14,
            padding: 14,
            borderRadius: t.radius.sm,
            border: `1px solid ${t.colors.border}`,
            background: t.colors.backgroundSoft,
          }}
        >
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: t.colors.textPrimary,
              marginBottom: 8,
            }}
          >
            {copy.improveTitle}
          </div>

          <textarea
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            rows={4}
            placeholder={copy.placeholder}
            style={{
              width: "100%",
              resize: "vertical",
              borderRadius: t.radius.sm,
              border: `1px solid ${t.colors.border}`,
              padding: 10,
              fontSize: 14,
              lineHeight: 1.5,
              color: t.colors.textPrimary,
              background: t.colors.surface,
            }}
          />

          <div
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
              marginTop: 12,
            }}
          >
            <button
              type="button"
              onClick={() => void handleCommentSubmit()}
              disabled={submitting || submitted}
              style={{
                border: "none",
                borderRadius: t.radius.sm,
                background: t.colors.primary,
                color: t.colors.textOnPrimary,
                fontSize: 13,
                fontWeight: 700,
                padding: "10px 14px",
                cursor: submitting || submitted ? "default" : "pointer",
              }}
            >
              {submitting ? copy.saving : copy.submit}
            </button>

            <button
              type="button"
              onClick={() => void handleSkipComment()}
              disabled={submitting || submitted}
              style={{
                border: `1px solid ${t.colors.border}`,
                borderRadius: t.radius.sm,
                background: t.colors.surface,
                color: t.colors.textPrimary,
                fontSize: 13,
                fontWeight: 700,
                padding: "10px 14px",
                cursor: submitting || submitted ? "default" : "pointer",
              }}
            >
              {copy.skip}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}