"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { designTokens } from "@/lib/design/tokens";

const t = designTokens;

export default function LoginPage() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let active = true;

    async function checkExistingSession() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!active) return;

        if (session) {
          router.replace("/profile");
          return;
        }
      } finally {
        if (active) {
          setCheckingSession(false);
        }
      }
    }

    void checkExistingSession();

    return () => {
      active = false;
    };
  }, [router, supabase]);

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const normalizedEmail = email.trim();

      if (!normalizedEmail) {
        setError("Please enter your email address.");
        return;
      }

      if (password.length < 8) {
        setError("Password must be at least 8 characters.");
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (error) {
        setError("Invalid email or password.");
        return;
      }

      if (!data?.session || !data.user) {
        setError("Login failed. No active session was created.");
        return;
      }

      setSuccess("Login successful.");
      router.replace("/profile");
      router.refresh();
    } catch {
      setError("Something went wrong during login. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (checkingSession) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background: t.colors.background,
          display: "grid",
          placeItems: "center",
          padding: "40px 20px",
          color: t.colors.textSecondary,
          fontSize: 16,
        }}
      >
        Checking session...
      </main>
    );
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
          maxWidth: 1120,
          display: "grid",
          gridTemplateColumns: "1.02fr 0.98fr",
          background: t.colors.surface,
          border: `1px solid ${t.colors.border}`,
          borderRadius: t.radius.xl,
          boxShadow: t.shadow.lg,
          overflow: "hidden",
        }}
      >
        <section
          style={{
            padding: 36,
            background: t.colors.surface,
            borderRight: `1px solid ${t.colors.border}`,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            gap: 24,
          }}
        >
          <div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "8px 12px",
                borderRadius: 999,
                background: t.colors.primarySoft,
                color: t.colors.textOnPrimary,
                fontSize: 12,
                fontWeight: 800,
                marginBottom: 18,
              }}
            >
              Welcome back
            </div>

            <h1
              style={{
                margin: 0,
                fontSize: 42,
                lineHeight: 1.08,
                letterSpacing: "-0.04em",
                color: t.colors.textPrimary,
                maxWidth: 520,
              }}
            >
              Continue from your saved profile.
            </h1>

            <p
              style={{
                margin: "18px 0 0",
                fontSize: 17,
                lineHeight: 1.75,
                color: t.colors.textSecondary,
                maxWidth: 560,
              }}
            >
              Log in to review your candidate profile, continue role analysis, and
              generate tailored application documents.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gap: 12,
            }}
          >
            {[
              "Return to your saved candidate profile",
              "Continue tailoring for a new role",
              "Keep your application documents consistent and credible",
            ].map((item) => (
              <div
                key={item}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  padding: "14px 16px",
                  borderRadius: t.radius.md,
                  background: t.colors.backgroundSoft,
                  border: `1px solid ${t.colors.borderSoft}`,
                }}
              >
                <span
                  style={{
                    width: 9,
                    height: 9,
                    borderRadius: 999,
                    background: t.colors.primary,
                    marginTop: 7,
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontSize: 14,
                    lineHeight: 1.6,
                    color: t.colors.textPrimary,
                  }}
                >
                  {item}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section
          style={{
            padding: 36,
            background: t.colors.background,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 430,
            }}
          >
            <div style={{ marginBottom: 22 }}>
              <h2
                style={{
                  margin: 0,
                  fontSize: 28,
                  lineHeight: 1.15,
                  letterSpacing: "-0.03em",
                  color: t.colors.textPrimary,
                }}
              >
                Log in
              </h2>

              <p
                style={{
                  margin: "8px 0 0",
                  fontSize: 14,
                  lineHeight: 1.6,
                  color: t.colors.textSecondary,
                }}
              >
                Use your email and password to continue.
              </p>
            </div>

            <form onSubmit={handleLogin} style={{ display: "grid", gap: 16 }}>
              <div style={{ display: "grid", gap: 8 }}>
                <label htmlFor="email" style={labelStyle}>
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError("");
                    setSuccess("");
                  }}
                  style={inputStyle}
                  autoComplete="email"
                  required
                />
              </div>

              <div style={{ display: "grid", gap: 8 }}>
                <label htmlFor="password" style={labelStyle}>
                  Password
                </label>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError("");
                    setSuccess("");
                  }}
                  style={inputStyle}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  style={textButtonStyle}
                >
                  {showPassword ? "Hide password" : "Show password"}
                </button>
              </div>

              {error ? (
                <div
                  style={{
                    background: "#fff5f5",
                    border: `1px solid ${t.colors.danger}`,
                    padding: 12,
                    borderRadius: t.radius.sm,
                    fontSize: 14,
                    color: t.colors.textPrimary,
                  }}
                >
                  {error}
                </div>
              ) : null}

              {success ? (
                <div
                  style={{
                    background: t.colors.surfaceAlt,
                    border: `1px solid ${t.colors.success}`,
                    padding: 12,
                    borderRadius: t.radius.sm,
                    fontSize: 14,
                    color: t.colors.textPrimary,
                  }}
                >
                  {success}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={submitting}
                style={{
                  height: 48,
                  borderRadius: t.radius.sm,
                  border: "none",
                  background: t.colors.primary,
                  color: t.colors.textOnPrimary,
                  fontWeight: 700,
                  fontSize: 15,
                  cursor: submitting ? "not-allowed" : "pointer",
                  opacity: submitting ? 0.75 : 1,
                }}
              >
                {submitting ? "Logging in..." : "Log in"}
              </button>
            </form>

            <p
              style={{
                marginTop: 12,
                fontSize: 14,
                color: t.colors.textSecondary,
                lineHeight: 1.6,
              }}
            >
              <Link
                href="/reset-password"
                style={{
                  color: t.colors.textOnPrimary,
                  fontWeight: 700,
                  textDecoration: "none",
                }}
              >
                Forgot password?
              </Link>
            </p>

            <p
              style={{
                marginTop: 18,
                fontSize: 14,
                color: t.colors.textSecondary,
                lineHeight: 1.6,
              }}
            >
              Do not have an account yet?{" "}
              <Link
                href="/signup"
                style={{
                  color: t.colors.textOnPrimary,
                  fontWeight: 700,
                  textDecoration: "none",
                }}
              >
                Create account
              </Link>
            </p>
          </div>
        </section>
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

const textButtonStyle: React.CSSProperties = {
  width: "fit-content",
  padding: 0,
  border: "none",
  background: "transparent",
  color: designTokens.colors.textSecondary,
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
};