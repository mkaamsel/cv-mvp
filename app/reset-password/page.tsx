"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { designTokens } from "@/lib/design/tokens";

const t = designTokens;

function validatePassword(password: string): string | null {
  if (password.length < 8) {
    return "Password must be at least 8 characters.";
  }
  return null;
}

export default function ResetPasswordPage(): React.JSX.Element {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [hasRecoverySession, setHasRecoverySession] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let active = true;

    async function checkSession() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (active) {
          setHasRecoverySession(Boolean(session));
        }
      } finally {
        if (active) {
          setCheckingSession(false);
        }
      }
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setHasRecoverySession(Boolean(session));
        setCheckingSession(false);
      }
    });

    void checkSession();

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const passwordError = validatePassword(password);
      if (passwordError) {
        setError(passwordError);
        return;
      }
      if (password !== confirmPassword) {
        setError("Password and confirm password do not match.");
        return;
      }
      if (!hasRecoverySession) {
        setError("Reset session is missing or expired. Request a new reset email.");
        return;
      }

      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setError(error.message);
        return;
      }

      setSuccess("Password updated successfully. You can now log in.");
      setTimeout(() => {
        router.replace("/login");
      }, 900);
    } catch {
      setError("Something went wrong while updating your password.");
    } finally {
      setSubmitting(false);
    }
  }

  if (checkingSession) {
    return (
      <main style={centerStyle}>
        <div style={statusCardStyle}>Checking reset session...</div>
      </main>
    );
  }

  return (
    <main style={centerStyle}>
      <div style={cardStyle}>
        <h1 style={titleStyle}>Set new password</h1>
        <p style={leadStyle}>
          Choose a new password to complete your reset.
        </p>

        {!hasRecoverySession ? (
          <div style={{ display: "grid", gap: 14, marginTop: 18 }}>
            <div style={errorStyle}>
              Reset link is missing or expired. Please request a new reset email.
            </div>
            <Link href="/forgot-password" style={linkStyle}>
              Request new reset email
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ marginTop: 24, display: "grid", gap: 16 }}>
            <div style={{ display: "grid", gap: 8 }}>
              <label htmlFor="password" style={labelStyle}>
                New password
              </label>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError("");
                  setSuccess("");
                }}
                style={inputStyle}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                style={textButtonStyle}
              >
                {showPassword ? "Hide password" : "Show password"}
              </button>
            </div>

            <div style={{ display: "grid", gap: 8 }}>
              <label htmlFor="confirmPassword" style={labelStyle}>
                Confirm new password
              </label>
              <input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                required
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setError("");
                  setSuccess("");
                }}
                style={inputStyle}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                style={textButtonStyle}
              >
                {showConfirmPassword ? "Hide password" : "Show password"}
              </button>
            </div>

            {error ? <div style={errorStyle}>{error}</div> : null}
            {success ? <div style={successStyle}>{success}</div> : null}

            <button
              type="submit"
              disabled={submitting}
              style={submitButtonStyle(submitting)}
            >
              {submitting ? "Updating..." : "Update password"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}

const centerStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: t.colors.background,
  display: "grid",
  placeItems: "center",
  padding: "40px 20px",
};

const cardStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 560,
  background: t.colors.surface,
  border: `1px solid ${t.colors.border}`,
  borderRadius: t.radius.xl,
  boxShadow: t.shadow.lg,
  padding: 36,
};

const statusCardStyle: React.CSSProperties = {
  ...cardStyle,
  color: t.colors.textSecondary,
  fontSize: 15,
  textAlign: "center",
};

const titleStyle: React.CSSProperties = {
  fontSize: 28,
  lineHeight: 1.15,
  letterSpacing: "-0.03em",
  color: t.colors.textPrimary,
  margin: 0,
};

const leadStyle: React.CSSProperties = {
  margin: "10px 0 0",
  fontSize: 14,
  lineHeight: 1.6,
  color: t.colors.textSecondary,
};

const labelStyle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 700,
  color: t.colors.textPrimary,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  height: 46,
  borderRadius: t.radius.sm,
  border: `1px solid ${t.colors.border}`,
  padding: "0 12px",
  fontSize: 15,
  outline: "none",
  background: t.colors.surface,
  color: t.colors.textPrimary,
};

const textButtonStyle: React.CSSProperties = {
  width: "fit-content",
  padding: 0,
  border: "none",
  background: "transparent",
  color: t.colors.textSecondary,
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
};

const errorStyle: React.CSSProperties = {
  background: "#fff5f5",
  border: `1px solid ${t.colors.danger}`,
  padding: 12,
  borderRadius: t.radius.sm,
  fontSize: 14,
  color: t.colors.textPrimary,
};

const successStyle: React.CSSProperties = {
  background: t.colors.surfaceAlt,
  border: `1px solid ${t.colors.success}`,
  padding: 12,
  borderRadius: t.radius.sm,
  fontSize: 14,
  color: t.colors.textPrimary,
};

const linkStyle: React.CSSProperties = {
  color: t.colors.primary,
  textDecoration: "underline",
  fontWeight: 700,
};

function submitButtonStyle(submitting: boolean): React.CSSProperties {
  return {
    width: "100%",
    height: 48,
    borderRadius: t.radius.sm,
    background: t.colors.primary,
    color: t.colors.textOnPrimary,
    border: "none",
    fontWeight: 700,
    fontSize: 15,
    cursor: submitting ? "not-allowed" : "pointer",
    opacity: submitting ? 0.75 : 1,
  };
}
