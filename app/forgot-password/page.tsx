"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { designTokens } from "@/lib/design/tokens";

const t = designTokens;

export default function ForgotPasswordPage(): React.JSX.Element {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const normalizedEmail = email.trim();
      if (!normalizedEmail) {
        setError("Please enter your email address.");
        return;
      }

      const redirectTo =
        typeof window !== "undefined"
          ? `${window.location.origin}/reset-password`
          : undefined;

      const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo,
      });

      if (error) {
        setError(error.message);
        return;
      }

      setSuccess("Password reset email sent. Please check your inbox.");
    } catch {
      setError("Something went wrong while sending the reset email.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: t.colors.background,
        display: "grid",
        placeItems: "center",
        padding: "40px 20px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 560,
          background: t.colors.surface,
          border: `1px solid ${t.colors.border}`,
          borderRadius: t.radius.xl,
          boxShadow: t.shadow.lg,
          padding: 36,
        }}
      >
        <h1
          style={{
            fontSize: 28,
            lineHeight: 1.15,
            letterSpacing: "-0.03em",
            color: t.colors.textPrimary,
            margin: 0,
          }}
        >
          Forgot password
        </h1>

        <p
          style={{
            margin: "10px 0 0",
            fontSize: 14,
            lineHeight: 1.6,
            color: t.colors.textSecondary,
          }}
        >
          Enter your email address and we will send you a password reset link.
        </p>

        <form onSubmit={handleSubmit} style={{ marginTop: 24, display: "grid", gap: 16 }}>
          <div style={{ display: "grid", gap: 8 }}>
            <label htmlFor="email" style={labelStyle}>
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError("");
                setSuccess("");
              }}
              style={inputStyle}
              autoComplete="email"
            />
          </div>

          {error ? (
            <div style={errorStyle}>{error}</div>
          ) : null}

          {success ? (
            <div style={successStyle}>{success}</div>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            style={submitButtonStyle(submitting)}
          >
            {submitting ? "Sending..." : "Send reset email"}
          </button>
        </form>

        <p
          style={{
            marginTop: 18,
            fontSize: 14,
            color: t.colors.textSecondary,
            lineHeight: 1.6,
          }}
        >
          Back to{" "}
          <Link href="/login" style={{ color: t.colors.primary }}>
            login
          </Link>
          .
        </p>
      </div>
    </main>
  );
}

const labelStyle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 700,
  color: designTokens.colors.textPrimary,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  height: 46,
  borderRadius: designTokens.radius.sm,
  border: `1px solid ${designTokens.colors.border}`,
  padding: "0 12px",
  fontSize: 15,
  outline: "none",
  background: designTokens.colors.surface,
  color: designTokens.colors.textPrimary,
};

const errorStyle: React.CSSProperties = {
  background: "#fff5f5",
  border: `1px solid ${designTokens.colors.danger}`,
  padding: 12,
  borderRadius: designTokens.radius.sm,
  fontSize: 14,
  color: designTokens.colors.textPrimary,
};

const successStyle: React.CSSProperties = {
  background: designTokens.colors.surfaceAlt,
  border: `1px solid ${designTokens.colors.success}`,
  padding: 12,
  borderRadius: designTokens.radius.sm,
  fontSize: 14,
  color: designTokens.colors.textPrimary,
};

function submitButtonStyle(submitting: boolean): React.CSSProperties {
  return {
    width: "100%",
    height: 48,
    borderRadius: designTokens.radius.sm,
    background: designTokens.colors.primary,
    color: designTokens.colors.textOnPrimary,
    border: "none",
    fontWeight: 700,
    fontSize: 15,
    cursor: submitting ? "not-allowed" : "pointer",
    opacity: submitting ? 0.75 : 1,
  };
}
