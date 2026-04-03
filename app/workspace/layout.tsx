"use client";

import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import ErrorBoundary from "@/components/ErrorBoundary";
import WorkspaceShell from "@/components/workspace/WorkspaceShell";
import WorkspaceProvider from "@/components/workspace/WorkspaceProvider";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type WorkspaceStep = {
  href: string;
  label: string;
  shortLabel: string;
};

const WORKSPACE_STEPS: WorkspaceStep[] = [
  {
    href: "/workspace/profile",
    label: "Profile",
    shortLabel: "P",
  },
  {
    href: "/workspace/job",
    label: "Job",
    shortLabel: "J",
  },
  {
    href: "/workspace/insights",
    label: "Insights",
    shortLabel: "I",
  },
  {
    href: "/workspace/final",
    label: "Final",
    shortLabel: "F",
  },
];

function isStepActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function getCurrentStepIndex(pathname: string) {
  const index = WORKSPACE_STEPS.findIndex((step) =>
    isStepActive(pathname, step.href),
  );

  return index >= 0 ? index : 0;
}

function WorkspaceTopBar({ pathname }: { pathname: string }) {
  const currentStepIndex = getCurrentStepIndex(pathname);

  return (
    <div
      style={{
        borderBottom: "1px solid #e2e8f0",
        background: "#ffffff",
        position: "sticky",
        top: 0,
        zIndex: 20,
      }}
    >
      <div
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          padding: "14px 24px 18px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <Link
            href="/workspace/profile"
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: "#0f172a",
              textDecoration: "none",
            }}
          >
            CV-MVP Workspace
          </Link>

          <div style={{ flex: 1 }} />

          <Link
            href="/workspace/debug"
            style={{
              color: "#475569",
              textDecoration: "none",
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            Debug
          </Link>

          <Link
            href="/workspace/observatory"
            style={{
              color: "#475569",
              textDecoration: "none",
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            Observatory
          </Link>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${WORKSPACE_STEPS.length}, minmax(0, 1fr))`,
            gap: 12,
            marginTop: 16,
          }}
        >
          {WORKSPACE_STEPS.map((step, index) => {
            const active = isStepActive(pathname, step.href);
            const completed = index < currentStepIndex;

            return (
              <Link
                key={step.href}
                href={step.href}
                style={{
                  textDecoration: "none",
                }}
              >
                <div
                  style={{
                    border: active
                      ? "1px solid #0f172a"
                      : "1px solid #cbd5e1",
                    background: active
                      ? "#f8fafc"
                      : completed
                        ? "#f8fafc"
                        : "#ffffff",
                    borderRadius: 14,
                    padding: "12px 14px",
                    minHeight: 74,
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    transition: "all 120ms ease",
                  }}
                >
                  <div
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 999,
                      display: "grid",
                      placeItems: "center",
                      fontSize: 13,
                      fontWeight: 700,
                      border: active
                        ? "1px solid #0f172a"
                        : completed
                          ? "1px solid #94a3b8"
                          : "1px solid #cbd5e1",
                      color: "#0f172a",
                      background: active ? "#e2e8f0" : "#ffffff",
                      flexShrink: 0,
                    }}
                  >
                    {step.shortLabel}
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: "#0f172a",
                      }}
                    >
                      {step.label}
                    </div>
                    <div
                      style={{
                        marginTop: 4,
                        height: 6,
                        width: "100%",
                        borderRadius: 999,
                        background: "#e2e8f0",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: active ? "100%" : completed ? "100%" : "28%",
                          background: active
                            ? "#0f172a"
                            : completed
                              ? "#64748b"
                              : "#cbd5e1",
                          borderRadius: 999,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function WorkspaceLayout({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isAllowed, setIsAllowed] = useState(false);

  useEffect(() => {
    let active = true;

    async function checkAuth() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!active) return;

        if (!session) {
          setIsAllowed(false);
          router.replace("/login");
          return;
        }

        setIsAllowed(true);
      } catch {
        if (!active) return;
        setIsAllowed(false);
        router.replace("/login");
      } finally {
        if (active) {
          setCheckingAuth(false);
        }
      }
    }

    void checkAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;

      if (!session) {
        setIsAllowed(false);
        router.replace("/login");
        return;
      }

      setIsAllowed(true);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [router, supabase]);

  if (checkingAuth) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          fontSize: 16,
          color: "#475569",
          background: "#f8fafc",
        }}
      >
        Loading workspace...
      </div>
    );
  }

  if (!isAllowed) {
    return null;
  }

  return (
    <ErrorBoundary
      title="Workspace unavailable"
      message="The workspace hit a UI problem. Please reload and continue."
    >
      <WorkspaceProvider>
        <WorkspaceTopBar pathname={pathname} />
        <WorkspaceShell>{children}</WorkspaceShell>
      </WorkspaceProvider>
    </ErrorBoundary>
  );
}