"use client";

import Link from "next/link";
import { designTokens } from "@/lib/design/tokens";

const t = designTokens;

const highlights = [
  "Build one reusable candidate profile from your real documents",
  "Analyse the target role before tailoring your application",
  "Generate credible CVs and cover letters without inventing experience",
];

export default function HomePage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: t.colors.background,
        color: t.colors.textPrimary,
      }}
    >
      <div
        style={{
          maxWidth: 1240,
          margin: "0 auto",
          padding: "28px 20px 48px",
        }}
      >
        {/* Header */}
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 20,
            flexWrap: "wrap",
            marginBottom: 40,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div
              style={{
                fontSize: 28,
                fontWeight: 800,
                letterSpacing: "-0.03em",
                color: t.colors.textPrimary,
              }}
            >
              cv-mvp
            </div>
            <div
              style={{
                fontSize: 14,
                color: t.colors.textSecondary,
              }}
            >
              AI Job Application Assistant
            </div>
          </div>

          <nav
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <Link href="/" style={navLinkStyle}>
              Home
            </Link>

            <Link href="/login" style={navLinkStyle}>
              Log in
            </Link>

            <Link href="/signup" style={primaryNavButtonStyle}>
              Create account
            </Link>
          </nav>
        </header>

        {/* Main section */}
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "1.08fr 0.92fr",
            gap: 24,
            alignItems: "stretch",
          }}
        >
          {/* Left */}
          <div
            style={{
              background: t.colors.surface,
              border: `1px solid ${t.colors.border}`,
              borderRadius: t.radius.xl,
              boxShadow: t.shadow.lg,
              padding: "40px 32px",
            }}
          >
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
              Guided application workflow
            </div>

            <h1
              style={{
                margin: 0,
                fontSize: "clamp(2.5rem, 6vw, 4.8rem)",
                lineHeight: 1.02,
                letterSpacing: "-0.05em",
                color: t.colors.textPrimary,
                maxWidth: 820,
              }}
            >
              Build better applications from your real experience.
            </h1>

            <p
              style={{
                margin: "18px 0 0",
                fontSize: 18,
                lineHeight: 1.7,
                color: t.colors.textSecondary,
                maxWidth: 760,
              }}
            >
              cv-mvp helps turn your actual background into stronger,
              credible job applications. Build your profile once,
              analyse the role, and generate tailored CVs and cover
              letters with a structured workflow.
            </p>

            <div
              style={{
                display: "flex",
                gap: 14,
                flexWrap: "wrap",
                marginTop: 28,
              }}
            >
              <Link href="/login" style={secondaryButtonStyle}>
                Log in
              </Link>

              <Link href="/signup" style={primaryButtonStyle}>
                Create account
              </Link>
            </div>

            <div
              style={{
                marginTop: 28,
                display: "flex",
                flexWrap: "wrap",
                gap: 10,
              }}
            >
              {["Profile first", "Role analysis", "Credible outputs", "English & German"].map(
                (item) => (
                  <span
                    key={item}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      padding: "8px 12px",
                      borderRadius: 999,
                      background: t.colors.backgroundSoft,
                      color: t.colors.textSecondary,
                      border: `1px solid ${t.colors.borderSoft}`,
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    {item}
                  </span>
                )
              )}
            </div>
          </div>

          {/* Right */}
          <aside
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 18,
            }}
          >
            <div
              style={{
                background: t.colors.surface,
                border: `1px solid ${t.colors.border}`,
                borderRadius: t.radius.xl,
                boxShadow: t.shadow.md,
                padding: 24,
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: t.colors.textMuted,
                  marginBottom: 12,
                }}
              >
                What the product does
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {highlights.map((item) => (
                  <div
                    key={item}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 10,
                      padding: "12px 14px",
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
            </div>

            <div
              style={{
                background: t.colors.surfaceAlt,
                border: `1px solid ${t.colors.success}`,
                borderRadius: t.radius.xl,
                boxShadow: t.shadow.md,
                padding: 24,
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: t.colors.textMuted,
                  marginBottom: 10,
                }}
              >
                MVP Flow
              </div>

              <div
                style={{
                  fontSize: 15,
                  lineHeight: 1.8,
                  color: t.colors.textPrimary,
                }}
              >
                Sign up or log in, build your candidate profile,
                analyse the job, and generate tailored CV and cover letter.
              </div>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}

const navLinkStyle: React.CSSProperties = {
  textDecoration: "none",
  color: designTokens.colors.textSecondary,
  fontSize: 14,
  fontWeight: 600,
  padding: "10px 12px",
};

const primaryNavButtonStyle: React.CSSProperties = {
  textDecoration: "none",
  background: designTokens.colors.primary,
  color: designTokens.colors.textOnPrimary,
  fontSize: 14,
  fontWeight: 700,
  padding: "11px 16px",
  borderRadius: designTokens.radius.md,
  boxShadow: designTokens.shadow.sm,
};

const primaryButtonStyle: React.CSSProperties = {
  textDecoration: "none",
  background: designTokens.colors.primary,
  color: designTokens.colors.textOnPrimary,
  fontSize: 15,
  fontWeight: 700,
  padding: "14px 18px",
  borderRadius: designTokens.radius.md,
  boxShadow: designTokens.shadow.sm,
};

const secondaryButtonStyle: React.CSSProperties = {
  textDecoration: "none",
  background: designTokens.colors.surface,
  color: designTokens.colors.textPrimary,
  fontSize: 15,
  fontWeight: 700,
  padding: "14px 18px",
  borderRadius: designTokens.radius.md,
  border: `1px solid ${designTokens.colors.border}`,
};