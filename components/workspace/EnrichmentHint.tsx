"use client";

import { useEffect, useRef, useState } from "react";
import type { BehaviouralState } from "@/lib/workspace/behaviouralTelemetry";
import { designTokens } from "@/lib/design/tokens";

const t = designTokens;

type Props = {
  behaviouralState: BehaviouralState;
  hint: string | null;
  loading: boolean;
  onDismiss: () => void;
};

export default function EnrichmentHint({
  behaviouralState,
  hint,
  loading,
  onDismiss,
}: Props) {
  const [visible, setVisible] = useState(false);
  const dismissedRef = useRef(false);

  useEffect(() => {
    if (behaviouralState === "stuck" && !dismissedRef.current) {
      setVisible(true);
    } else if (behaviouralState === "flowing") {
      // User resumed typing — reset so the hint can reappear next time
      dismissedRef.current = false;
      setVisible(false);
    }
  }, [behaviouralState]);

  function handleDismiss() {
    dismissedRef.current = true;
    setVisible(false);
    onDismiss();
  }

  if (!visible) return null;
  if (!loading && !hint) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        marginTop: 8,
        padding: "10px 14px",
        borderRadius: t.radius.md,
        background: t.colors.primarySoft,
        border: `1px solid ${t.colors.focusRing}`,
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        fontSize: 13,
        lineHeight: 1.65,
        color: t.colors.textSecondary,
        opacity: loading ? 0.7 : 1,
        transition: "opacity 0.2s ease",
      }}
    >
      {/* Mentor indicator dot */}
      <span
        aria-hidden
        style={{
          flexShrink: 0,
          marginTop: 3,
          width: 7,
          height: 7,
          borderRadius: "50%",
          background: t.colors.primary,
          display: "inline-block",
        }}
      />

      <span style={{ flex: 1 }}>
        {loading ? "One moment\u2026" : hint}
      </span>

      {!loading ? (
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss hint"
          style={{
            flexShrink: 0,
            border: "none",
            background: "transparent",
            color: t.colors.textMuted,
            cursor: "pointer",
            fontSize: 16,
            lineHeight: 1,
            padding: "0 2px",
            marginTop: -1,
          }}
        >
          ×
        </button>
      ) : null}
    </div>
  );
}
