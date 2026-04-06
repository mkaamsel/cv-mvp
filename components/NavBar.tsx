"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { designTokens } from "@/lib/design/tokens";

const t = designTokens;

type AuthUser = {
  id: string;
  email?: string;
} | null;

export default function NavBar() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [user, setUser] = useState<AuthUser>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!mounted) return;
      setUser(user ? { id: user.id, email: user.email } : null);
      setLoading(false);
    }

    void loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(
        session?.user ? { id: session.user.id, email: session.user.email } : null
      );
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  async function handleLogout() {
    await supabase.auth.signOut();
    setUser(null);
    router.push("/login");
    router.refresh();
  }

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        borderBottom: `1px solid ${t.colors.border}`,
        background: "rgba(255,255,255,0.9)",
        backdropFilter: "blur(10px)",
      }}
    >
      <nav
        style={{
          maxWidth: 1240,
          margin: "0 auto",
          padding: "14px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <Link
          href="/"
          style={{
            textDecoration: "none",
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          <span
            style={{
              fontSize: 22,
              fontWeight: 800,
              letterSpacing: "-0.03em",
              color: t.colors.textPrimary,
            }}
          >
            cv-mvp
          </span>
          <span
            style={{
              fontSize: 12,
              color: t.colors.textMuted,
            }}
          >
            AI Job Application Assistant
          </span>
        </Link>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <Link href="/" style={navLinkStyle}>
            Home
          </Link>

          {!loading && !user ? (
            <>
              <Link href="/login" style={navLinkStyle}>
                Log in
              </Link>

              <Link href="/signup" style={primaryButtonStyle}>
                Create account
              </Link>
            </>
          ) : null}

          {!loading && user ? (
            <>
              <Link href="/profile" style={navLinkStyle}>
                Profile
              </Link>

              <Link href="/tailoring" style={navLinkStyle}>
                Tailoring
              </Link>

              <Link href="/settings" style={navLinkStyle}>
                Settings
              </Link>

              <button type="button" onClick={handleLogout} style={secondaryButtonStyle}>
                Log out
              </button>
            </>
          ) : null}
        </div>
      </nav>
    </header>
  );
}

const navLinkStyle: React.CSSProperties = {
  textDecoration: "none",
  color: designTokens.colors.textSecondary,
  fontSize: 14,
  fontWeight: 600,
  padding: "10px 12px",
};

const primaryButtonStyle: React.CSSProperties = {
  textDecoration: "none",
  background: designTokens.colors.primary,
  color: designTokens.colors.textOnPrimary,
  fontSize: 14,
  fontWeight: 700,
  padding: "10px 14px",
  borderRadius: designTokens.radius.sm,
  boxShadow: designTokens.shadow.sm,
};

const secondaryButtonStyle: React.CSSProperties = {
  border: `1px solid ${designTokens.colors.border}`,
  background: designTokens.colors.surface,
  color: designTokens.colors.textPrimary,
  fontSize: 14,
  fontWeight: 700,
  padding: "10px 14px",
  borderRadius: designTokens.radius.sm,
  cursor: "pointer",
};