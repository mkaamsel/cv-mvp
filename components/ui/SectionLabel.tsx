"use client";

import type { ReactNode } from "react";
import { designTokens } from "@/lib/design/tokens";

const t = designTokens;

type SectionLabelProps = {
  children: ReactNode;
  tone?: "blue" | "green" | "yellow" | "purple";
};

export default function SectionLabel({
  children,
  tone = "blue",
}: SectionLabelProps) {
  const toneColor = {
    blue: t.colors.primarySoft,
    green: t.colors.accentGreen,
    yellow: t.colors.accentYellow,
    purple: t.colors.accentPurple,
  }[tone];

  return (
    <div
      style={{
        display: "inline-block",
        padding: "6px 10px",
        borderRadius: t.radius.sm,
        fontSize: 12,
        fontWeight: 700,
        background: toneColor,
        color: t.colors.textPrimary,
      }}
    >
      {children}
    </div>
  );
}