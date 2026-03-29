"use client";

import Link from "next/link";
import { useState } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Section from "@/components/ui/Section";

const EMAIL_VERIFICATION_ENABLED = false;

type Step = "signup" | "verify" | "success";

export default function SignupPage() {
  const [step, setStep] = useState<Step>("signup");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [verifyPassword, setVerifyPassword] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [gdprAccepted, setGdprAccepted] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showVerifyPassword, setShowVerifyPassword] = useState(false);

  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function handleSignupSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    if (!password) {
      setError("Please enter a password.");
      return;
    }

    if (password.length < 6) {
      setError("Password should contain at least 6 characters.");
      return;
    }

    if (password !== verifyPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (!gdprAccepted) {
      setError("Please accept the GDPR notice to continue.");
      return;
    }

    setSubmitted(true);

    setTimeout(() => {
      if (EMAIL_VERIFICATION_ENABLED) {
        setStep("verify");
      } else {
        setStep("success");
      }
      setSubmitted(false);
    }, 600);
  }

  function handleVerifySubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!verificationCode.trim()) {
      setError("Please enter the verification code.");
      return;
    }

    setSubmitted(true);

    setTimeout(() => {
      setStep("success");
      setSubmitted(false);
    }, 600);
  }

  return (
    <main className="relative min-h-screen bg-[var(--color-background)]">
      <Section className="flex min-h-screen items-center">
        <div className="mx-auto w-full max-w-4xl">
          <div className="mb-10 text-center">
            <p className="text-sm text-[var(--color-text-secondary)]">
              Create your account
            </p>

            <h1 className="mt-3 text-4xl font-semibold text-[var(--color-text-primary)]">
              Welcome — let&apos;s set up your application workspace
            </h1>

            <p className="mx-auto mt-4 max-w-2xl text-lg text-[var(--color-text-secondary)]">
              Create your account to tailor CVs, build your reusable candidate
              profile, and keep your job applications structured and consistent.
            </p>
          </div>

          <Card className="mx-auto max-w-2xl p-8">
            {step === "signup" && (
              <>
                <div className="mb-6">
                  <h2 className="text-2xl font-semibold text-[var(--color-text-primary)]">
                    Start your account
                  </h2>
                </div>

                <form onSubmit={handleSignupSubmit} className="space-y-6">
                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Email address
                    </label>

                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full rounded border border-[var(--color-border)] px-4 py-3"
                    />
                  </div>

                  <div className="relative">
                    <label className="mb-2 block text-sm font-medium">
                      Password
                    </label>

                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      className="w-full rounded border border-[var(--color-border)] px-4 py-3 pr-14"
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-[42px] text-sm"
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>

                  <div className="relative">
                    <label className="mb-2 block text-sm font-medium">
                      Verify password
                    </label>

                    <input
                      type={showVerifyPassword ? "text" : "password"}
                      value={verifyPassword}
                      onChange={(e) => setVerifyPassword(e.target.value)}
                      placeholder="Repeat password"
                      className="w-full rounded border border-[var(--color-border)] px-4 py-3 pr-14"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowVerifyPassword(!showVerifyPassword)
                      }
                      className="absolute right-3 top-[42px] text-sm"
                    >
                      {showVerifyPassword ? "Hide" : "Show"}
                    </button>
                  </div>

                  <div className="rounded border border-[var(--color-border)] p-4">
                    <label className="flex items-start gap-3 text-sm">
                      <input
                        type="checkbox"
                        checked={gdprAccepted}
                        onChange={(e) => setGdprAccepted(e.target.checked)}
                      />

                      <span>
                        I have read and accept the GDPR notice regarding the
                        processing of my application data.
                      </span>
                    </label>
                  </div>

                  {error && (
                    <div className="text-sm text-red-600">{error}</div>
                  )}

                  <Button type="submit" className="w-full py-4">
                    {submitted ? "Creating account..." : "Create account"}
                  </Button>
                </form>
              </>
            )}

            {step === "verify" && (
              <>
                <div className="mb-6 text-center">
                  <h2 className="text-2xl font-semibold">
                    Verify your email
                  </h2>

                  <p className="mt-3 text-[var(--color-text-secondary)]">
                    Enter the verification code sent to {email}.
                  </p>
                </div>

                <form onSubmit={handleVerifySubmit} className="space-y-6">
                  <input
                    type="text"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    placeholder="Verification code"
                    className="w-full rounded border border-[var(--color-border)] px-4 py-3"
                  />

                  {error && (
                    <div className="text-sm text-red-600">{error}</div>
                  )}

                  <Button type="submit" className="w-full py-4">
                    {submitted ? "Verifying..." : "Verify account"}
                  </Button>
                </form>
              </>
            )}

            {step === "success" && (
              <>
                <div className="text-center">
                  <h2 className="text-2xl font-semibold">
                    Thank you for subscribing
                  </h2>

                  <p className="mt-4 text-[var(--color-text-secondary)]">
                    Your account is now active. You can start building stronger
                    job applications immediately.
                  </p>
                </div>

                <div className="mt-8">
                  <Link href="/workspace">
                    <Button className="w-full py-4">
                      Go to workspace
                    </Button>
                  </Link>
                </div>
              </>
            )}
          </Card>
        </div>
      </Section>
    </main>
  );
}