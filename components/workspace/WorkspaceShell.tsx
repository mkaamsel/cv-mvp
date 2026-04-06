"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type WorkspaceStep = {
  href: string;
  label: string;
  shortLabel: string;
};

const STEPS: WorkspaceStep[] = [
  { href: "/workspace/profile", label: "Profile", shortLabel: "P" },
  { href: "/workspace/job", label: "Job", shortLabel: "J" },
  { href: "/workspace/insights", label: "Insights", shortLabel: "I" },
  { href: "/workspace/final", label: "Final", shortLabel: "F" },
];

function isStepActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function getCurrentStepIndex(pathname: string) {
  const index = STEPS.findIndex((step) => isStepActive(pathname, step.href));
  return index >= 0 ? index : 0;
}

export default function WorkspaceShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [loggingOut, setLoggingOut] = useState(false);

  const currentStepIndex = getCurrentStepIndex(pathname);

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await supabase.auth.signOut();
      router.replace("/login");
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {/* ── Fixed left sidebar ─────────────────────────────── */}
      <aside
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          bottom: 0,
          width: 200,
          background: "#f8fafc",
          borderRight: "1px solid #e2e8f0",
          display: "flex",
          flexDirection: "column",
          zIndex: 30,
        }}
      >
        {/* Logo */}
        <div
          style={{
            padding: "18px 16px 16px",
            borderBottom: "1px solid #e2e8f0",
          }}
        >
          <Link
            href="/workspace/profile"
            style={{
              fontSize: 15,
              fontWeight: 800,
              color: "#0f172a",
              textDecoration: "none",
              letterSpacing: "-0.02em",
            }}
          >
            CV&nbsp;MVP
          </Link>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: "10px 8px", overflowY: "auto" }}>
          {STEPS.map((step, index) => {
            const active = isStepActive(pathname, step.href);
            const done = !active && index < currentStepIndex;
            const textColor = active ? "#0f172a" : done ? "#475569" : "#94a3b8";

            return (
              <Link
                key={step.href}
                href={step.href}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 10px",
                  borderRadius: 8,
                  marginBottom: 2,
                  textDecoration: "none",
                  fontSize: 14,
                  fontWeight: active ? 700 : 500,
                  color: textColor,
                  background: active ? "#ffffff" : "transparent",
                  boxShadow: active ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                  borderLeft: active ? "3px solid #0f172a" : "3px solid transparent",
                  transition: "background 100ms ease",
                }}
              >
                {/* Step badge */}
                <span
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 11,
                    fontWeight: 800,
                    flexShrink: 0,
                    background: active ? "#0f172a" : done ? "#e2e8f0" : "#f1f5f9",
                    color: active ? "#ffffff" : done ? "#475569" : "#94a3b8",
                  }}
                >
                  {done ? "✓" : step.shortLabel}
                </span>
                <span>{step.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Vertical current page label */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            padding: "10px 0 8px",
          }}
        >
          <span
            style={{
              writingMode: "vertical-rl",
              transform: "rotate(180deg)",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "#cbd5e1",
              userSelect: "none",
            }}
          >
            {STEPS[currentStepIndex]?.label ?? ""}
          </span>
        </div>

        {/* Footer: utility links + logout */}
        <div
          style={{
            borderTop: "1px solid #e2e8f0",
            padding: "10px 8px",
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          <Link
            href="/workspace/debug"
            style={{
              padding: "5px 10px",
              borderRadius: 6,
              textDecoration: "none",
              fontSize: 12,
              fontWeight: 500,
              color: "#94a3b8",
            }}
          >
            Debug
          </Link>
          <Link
            href="/workspace/observatory"
            style={{
              padding: "5px 10px",
              borderRadius: 6,
              textDecoration: "none",
              fontSize: 12,
              fontWeight: 500,
              color: "#94a3b8",
            }}
          >
            Observatory
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "8px 10px",
              borderRadius: 8,
              border: "1px solid #e2e8f0",
              background: "#ffffff",
              cursor: loggingOut ? "not-allowed" : "pointer",
              fontSize: 13,
              fontWeight: 600,
              color: loggingOut ? "#94a3b8" : "#475569",
              marginTop: 6,
              width: "100%",
            }}
          >
            {loggingOut ? "Logging out…" : "Log out"}
          </button>
        </div>
      </aside>

      {/* ── Main content area ──────────────────────────────── */}
      <main
        style={{
          marginLeft: 200,
          flex: 1,
          minHeight: "100vh",
          background: "#ffffff",
          padding: "28px 32px",
        }}
      >
        {children}
      </main>
    </div>
  );
}
