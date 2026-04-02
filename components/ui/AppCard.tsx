"use client";

import type { CSSProperties, ReactNode } from "react";
import { designTokens } from "@/lib/design/tokens";

const t = designTokens;

type AppCardProps = {
  children: ReactNode;
  className?: string;
  soft?: boolean;
  style?: CSSProperties;
};

export default function AppCard({
  children,
  className,
  soft = false,
  style,
}: AppCardProps) {
  return (
    <div
      className={className}
      style={{
        background: soft ? t.colors.backgroundSoft : t.colors.surface,
        border: `1px solid ${t.colors.border}`,
        borderRadius: t.radius.lg,
        boxShadow: t.shadow.md,
        ...style,
      }}
    >
      {children}
    </div>
  );
}