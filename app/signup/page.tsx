"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { designTokens } from "@/lib/design/tokens";

const t = designTokens;

function validatePassword(password: string): string | null {
  if (password.length < 8) {
    return "Password must be at least 8 characters long.";
  }
  return null;
}

export default function SignupPage(): React.JSX.Element {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Granular consent state
  const [consentTerms, setConsentTerms] = useState(false);
  const [consentPrivacy, setConsentPrivacy] = useState(false);
  const [consentStorage, setConsentStorage] = useState(false);
  const [consentImprovement, setConsentImprovement] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const requiredConsentsGiven = consentTerms && consentPrivacy && consentStorage;

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const normalizedEmail = email.trim();

    if (!normalizedEmail) {
      setError("Please enter your email address.");
      return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    if (password !== confirmPassword) {
      setError("Password and confirm password do not match.");
      return;
    }

    if (!requiredConsentsGiven) {
      setError("Please confirm the required checkboxes before continuing.");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: {
            consent_terms: consentTerms,
            consent_privacy: consentPrivacy,
            consent_storage: consentStorage,
            consent_improvement: consentImprovement,
            consent_recorded_at: new Date().toISOString(),
          },
        },
      });

      if (error) {
        setError(error.message);
        return;
      }

      if (!data.user) {
        setError("Account creation did not return a user.");
        return;
      }

      if (!data.session) {
        setSuccess(
          "Account created. Please check your email and confirm your account before logging in.",
        );
        router.replace("/login");
        router.refresh();
        return;
      }

      setSuccess("Account created successfully.");
      router.replace("/profile");
      router.refresh();
    } catch {
      setError("Something went wrong during account creation. Please try again.");
    } finally {
      setLoading(false);
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
          maxWidth: 920,
          background: t.colors.surface,
          border: `1px solid ${t.colors.border}`,
          borderRadius: t.radius.xl,
          boxShadow: t.shadow.lg,
          padding: 36,
        }}
      >
        <div style={{ maxWidth: 520, margin: "0 auto" }}>
          <h1
            style={{
              fontSize: 28,
              lineHeight: 1.15,
              letterSpacing: "-0.03em",
              color: t.colors.textPrimary,
              margin: 0,
            }}
          >
            Create account
          </h1>

          <p
            style={{
              margin: "10px 0 0",
              fontSize: 14,
              lineHeight: 1.6,
              color: t.colors.textSecondary,
            }}
          >
            Create your account to build a profile, tailor roles, and generate
            application documents.
          </p>

          <form onSubmit={handleSignup} style={{ marginTop: 24, display: "grid", gap: 16 }}>
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
                  setError(null);
                  setSuccess(null);
                }}
                style={inputStyle}
                autoComplete="email"
              />
            </div>

            <div style={{ display: "grid", gap: 8 }}>
              <label htmlFor="password" style={labelStyle}>
                Password
              </label>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(null);
                  setSuccess(null);
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
              <div style={helperTextStyle}>Password must be at least 8 characters long.</div>
            </div>

            <div style={{ display: "grid", gap: 8 }}>
              <label htmlFor="confirmPassword" style={labelStyle}>
                Confirm password
              </label>
              <input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                required
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setError(null);
                  setSuccess(null);
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

            {/* Granular consent checkboxes */}
            <div
              style={{
                display: "grid",
                gap: 12,
                marginTop: 8,
                padding: "16px 20px",
                background: t.colors.backgroundSoft,
                borderRadius: t.radius.md,
                border: `1px solid ${t.colors.border}`,
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: t.colors.textMuted,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  marginBottom: 2,
                }}
              >
                Your choices
              </div>

              <ConsentCheckbox
                id="consent-terms"
                checked={consentTerms}
                onChange={setConsentTerms}
                required
              >
                I agree to the{" "}
                <Link href="/terms" target="_blank" style={linkStyle}>
                  Terms of Service
                </Link>{" "}
                <RequiredBadge />
              </ConsentCheckbox>

              <ConsentCheckbox
                id="consent-privacy"
                checked={consentPrivacy}
                onChange={setConsentPrivacy}
                required
              >
                I agree to the{" "}
                <Link href="/privacy" target="_blank" style={linkStyle}>
                  Privacy Policy
                </Link>{" "}
                <RequiredBadge />
              </ConsentCheckbox>

              <ConsentCheckbox
                id="consent-storage"
                checked={consentStorage}
                onChange={setConsentStorage}
                required
              >
                I consent to my profile and application data being stored and
                used to generate tailored documents{" "}
                <RequiredBadge />
              </ConsentCheckbox>

              <ConsentCheckbox
                id="consent-improvement"
                checked={consentImprovement}
                onChange={setConsentImprovement}
              >
                I&apos;m happy for anonymised data to be used to improve the
                system{" "}
                <span style={{ fontSize: 11, color: t.colors.textMuted }}>
                  (optional)
                </span>
              </ConsentCheckbox>
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
              disabled={loading || !requiredConsentsGiven}
              style={{
                width: "100%",
                height: 48,
                borderRadius: t.radius.sm,
                background:
                  loading || !requiredConsentsGiven
                    ? t.colors.backgroundSoft
                    : t.colors.primary,
                color:
                  loading || !requiredConsentsGiven
                    ? t.colors.textMuted
                    : t.colors.textOnPrimary,
                border: "none",
                fontWeight: 700,
                fontSize: 15,
                cursor:
                  loading || !requiredConsentsGiven ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "Creating account..." : "Create account"}
            </button>
          </form>

          <p
            style={{
              marginTop: 20,
              fontSize: 14,
              color: t.colors.textSecondary,
              lineHeight: 1.6,
            }}
          >
            Already have an account? <Link href="/login">Log in</Link>
          </p>
        </div>
      </div>
    </main>
  );
}

function RequiredBadge() {
  return (
    <span
      style={{
        fontSize: 11,
        color: t.colors.textMuted,
        fontWeight: 600,
      }}
    >
      (required)
    </span>
  );
}

function ConsentCheckbox({
  id,
  checked,
  onChange,
  required = false,
  children,
}: {
  id: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label
      htmlFor={id}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        fontSize: 13,
        lineHeight: 1.6,
        color: t.colors.textPrimary,
        cursor: "pointer",
      }}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        required={required}
        style={{ marginTop: 3, flexShrink: 0 }}
      />
      <span>{children}</span>
    </label>
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

const helperTextStyle: React.CSSProperties = {
  fontSize: 12,
  lineHeight: 1.5,
  color: designTokens.colors.textSecondary,
};

const linkStyle: React.CSSProperties = {
  color: designTokens.colors.primary,
  textDecoration: "underline",
};
