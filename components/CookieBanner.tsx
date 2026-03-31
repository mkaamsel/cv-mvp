"use client";

import { useEffect, useState } from "react";
import { designTokens } from "@/lib/design/tokens";

const t = designTokens;

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("cookie_consent");
    if (!consent) {
      setVisible(true);
    }
  }, []);

  function acceptCookies() {
    localStorage.setItem("cookie_consent", "accepted");
    setVisible(false);
  }

  function declineCookies() {
    localStorage.setItem("cookie_consent", "declined");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 20,
        left: 20,
        right: 20,
        zIndex: 1000,
        display: "flex",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          maxWidth: 900,
          width: "100%",
          background: t.colors.surface,
          border: `1px solid ${t.colors.border}`,
          borderRadius: t.radius.lg,
          boxShadow: t.shadow.lg,
          padding: "18px 20px",
          display: "flex",
          flexWrap: "wrap",
          gap: 14,
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div
          style={{
            fontSize: 14,
            lineHeight: 1.6,
            color: t.colors.textSecondary,
            maxWidth: 640,
          }}
        >
          We use cookies to improve the experience of this application. By
          continuing to use the platform you agree to the use of cookies for
          basic functionality and analytics.
        </div>

        <div
          style={{
            display: "flex",
            gap: 10,
            flexShrink: 0,
          }}
        >
          <button
            onClick={declineCookies}
            style={{
              border: `1px solid ${t.colors.border}`,
              background: t.colors.surface,
              color: t.colors.textPrimary,
              padding: "8px 14px",
              borderRadius: t.radius.sm,
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Decline
          </button>

          <button
            onClick={acceptCookies}
            style={{
              border: "none",
              background: t.colors.primary,
              color: t.colors.textOnPrimary,
              padding: "8px 16px",
              borderRadius: t.radius.sm,
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: t.shadow.sm,
            }}
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}