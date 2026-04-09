"use client";

import { useEffect, useState } from "react";
import { designTokens } from "@/lib/design/tokens";

const t = designTokens;

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const noticeSeen = localStorage.getItem("cookie_notice_seen");
    if (!noticeSeen) {
      setVisible(true);
    }
  }, []);

  function dismissNotice() {
    localStorage.setItem("cookie_notice_seen", "yes");
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
          We use essential cookies only for login/session handling in this beta.
          We do not use tracking or advertising cookies.
        </div>

        <div
          style={{
            display: "flex",
            gap: 10,
            flexShrink: 0,
          }}
        >
          <button
            onClick={dismissNotice}
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
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
