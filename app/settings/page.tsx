"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { designTokens } from "@/lib/design/tokens";

const t = designTokens;

export default function SettingsPage() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [showConfirm, setShowConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDeleteAccount() {
    setDeleting(true);
    setError(null);

    try {
      const response = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmed: true }),
      });

      const data = (await response.json()) as { ok: boolean; message?: string };

      if (!data.ok) {
        setError(
          data.message ??
            "Something went wrong. Please try again or contact us."
        );
        setDeleting(false);
        return;
      }

      // Sign out locally then redirect to home
      await supabase.auth.signOut();
      router.replace("/");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again or contact us.");
      setDeleting(false);
    }
  }

  return (
    <main
      style={{
        maxWidth: 720,
        margin: "0 auto",
        padding: "48px 24px",
        fontFamily: "inherit",
      }}
    >
      <h1
        style={{
          fontSize: 26,
          fontWeight: 700,
          color: t.colors.textPrimary,
          margin: "0 0 6px",
          letterSpacing: "-0.02em",
        }}
      >
        Account settings
      </h1>
      <p
        style={{
          fontSize: 14,
          color: t.colors.textSecondary,
          margin: "0 0 40px",
          lineHeight: 1.6,
        }}
      >
        Manage your account and data preferences.
      </p>

      {/* Delete account section */}
      <div
        style={{
          border: `1px solid ${t.colors.border}`,
          borderRadius: t.radius.md,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "20px 24px",
            borderBottom: `1px solid ${t.colors.border}`,
            background: t.colors.surface,
          }}
        >
          <h2
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: t.colors.textPrimary,
              margin: 0,
            }}
          >
            Delete account
          </h2>
          <p
            style={{
              fontSize: 13,
              color: t.colors.textSecondary,
              margin: "6px 0 0",
              lineHeight: 1.6,
            }}
          >
            This permanently removes your account and everything associated with
            it — your profile, all tailoring runs, generated documents, and
            feedback. There is no undo.
          </p>
        </div>

        <div style={{ padding: "20px 24px", background: t.colors.background }}>
          {!showConfirm ? (
            <button
              type="button"
              onClick={() => setShowConfirm(true)}
              style={{
                padding: "10px 18px",
                borderRadius: t.radius.sm,
                border: `1px solid ${t.colors.danger}`,
                background: "transparent",
                color: t.colors.danger,
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Delete my account and all data
            </button>
          ) : (
            <div
              style={{
                background: t.colors.surface,
                border: `1px solid ${t.colors.border}`,
                borderRadius: t.radius.md,
                padding: "20px 24px",
                display: "grid",
                gap: 16,
              }}
            >
              <div>
                <p
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: t.colors.textPrimary,
                    margin: "0 0 8px",
                  }}
                >
                  Just to be sure
                </p>
                <p
                  style={{
                    fontSize: 13,
                    color: t.colors.textSecondary,
                    margin: 0,
                    lineHeight: 1.7,
                  }}
                >
                  Once you confirm, your account and all your data will be
                  permanently deleted. We won&apos;t be able to recover it for
                  you afterwards. If you&apos;re taking a break, you can simply
                  log out instead — your profile and runs will be here when you
                  come back.
                </p>
              </div>

              {error ? (
                <div
                  style={{
                    padding: "10px 14px",
                    borderRadius: t.radius.sm,
                    background: "#fff5f5",
                    border: `1px solid ${t.colors.danger}`,
                    fontSize: 13,
                    color: t.colors.textPrimary,
                    lineHeight: 1.6,
                  }}
                >
                  {error}
                </div>
              ) : null}

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={handleDeleteAccount}
                  disabled={deleting}
                  style={{
                    padding: "10px 18px",
                    borderRadius: t.radius.sm,
                    border: "none",
                    background: deleting ? t.colors.backgroundSoft : t.colors.danger,
                    color: deleting ? t.colors.textMuted : "#fff",
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: deleting ? "not-allowed" : "pointer",
                  }}
                >
                  {deleting ? "Deleting…" : "Yes, delete everything"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowConfirm(false);
                    setError(null);
                  }}
                  disabled={deleting}
                  style={{
                    padding: "10px 18px",
                    borderRadius: t.radius.sm,
                    border: `1px solid ${t.colors.border}`,
                    background: t.colors.surface,
                    color: t.colors.textPrimary,
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: deleting ? "not-allowed" : "pointer",
                  }}
                >
                  Keep my account
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
