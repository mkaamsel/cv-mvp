"use client";

import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import ErrorBoundary from "@/components/ErrorBoundary";
import WorkspaceShell from "@/components/workspace/WorkspaceShell";
import WorkspaceProvider from "@/components/workspace/WorkspaceProvider";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

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
  }, [router, supabase, pathname]);

  if (checkingAuth) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          fontSize: 16,
          color: "#475569",
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
        <WorkspaceShell>{children}</WorkspaceShell>
      </WorkspaceProvider>
    </ErrorBoundary>
  );
}