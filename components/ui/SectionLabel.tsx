"use client";

import type { CSSProperties, ReactNode } from "react";
import { designTokens } from "@/lib/design/tokens";

const t = designTokens;

type SectionLabelTone = "blue" | "green" | "yellow" | "purple";

type SectionLabelProps = {
  children: ReactNode;
  tone?: SectionLabelTone;
  style?: CSSProperties;
};

const toneMap: Record<SectionLabelTone, string> = {
  blue: t.colors.primarySoft,
  green: t.colors.accentGreen,
  yellow: t.colors.accentYellow,
  purple: t.colors.accentPurple,
};

export default function SectionLabel({
  children,
  tone = "blue",
  style,
}: SectionLabelProps) {
  const background = toneMap[tone] ?? t.colors.primarySoft;

  return (
    <div
      style={{
        display: "inline-block",
        padding: "6px 10px",
        borderRadius: t.radius.sm,
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: "0.02em",
        background,
        color: t.colors.textPrimary,
        lineHeight: 1,
        ...style,
      }}
    >
      {children}
    </div>
  );
}