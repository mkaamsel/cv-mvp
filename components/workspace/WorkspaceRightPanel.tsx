"use client";

import AppCard from "@/components/ui/AppCard";
import { designTokens } from "@/lib/designTokens";

function StatusCard({
  title,
  value,
  tone,
  detail,
}: {
  title: string;
  value: string;
  tone: "gold" | "green" | "rose" | "blue";
  detail: string;
}) {
  const toneClasses =
    tone === "green"
      ? designTokens.badgeGreen
      : tone === "gold"
      ? designTokens.badgeGold
      : tone === "rose"
      ? designTokens.badgeRose
      : designTokens.badgeBlue;

  return (
    <AppCard className="p-4" soft>
      <div className="text-xs uppercase tracking-[0.18em] text-[#a9998c]">
        {title}
      </div>
      <div className={`mt-3 ${toneClasses}`}>{value}</div>
      <p className="mt-3 text-sm leading-6 text-[#d8cbbf]">{detail}</p>
    </AppCard>
  );
}

export default function WorkspaceRightPanel() {
  return (
    <div className="space-y-4">
      <AppCard className="p-5">
        <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-[#a9998c]">
          Profile readiness
        </h3>

        <div className="mt-5 flex items-center justify-center">
          <div className="relative flex h-44 w-44 items-center justify-center rounded-full border border-[#7fa7c6]/28 bg-[#7fa7c6]/6">
            <div className="flex h-32 w-32 items-center justify-center rounded-full border border-[#8fbf9f]/30 bg-[#8fbf9f]/6">
              <div className="flex h-20 w-20 items-center justify-center rounded-full border border-[#d8c27a]/30 bg-[#d8c27a]/6 text-center">
                <span className="px-2 text-xs font-medium leading-4 text-[#f4efe9]">
                  Early
                </span>
              </div>
            </div>
          </div>
        </div>

        <p className="mt-5 text-sm leading-6 text-[#d8cbbf]">
          Outer ring: profile completeness. Middle ring: corroborated evidence.
          Inner ring: more information needed.
        </p>
      </AppCard>

      <StatusCard
        title="Profile"
        value="Building"
        tone="gold"
        detail="Candidate profile is available, but further evidence and supporting detail can improve positioning."
      />

      <StatusCard
        title="Evidence"
        value="Corroborated"
        tone="green"
        detail="Only supported claims should flow into final generation. No invention, no creative accounting."
      />

      <StatusCard
        title="Signals missing"
        value="Review needed"
        tone="rose"
        detail="Leadership depth, systems ownership, and role-specific emphasis may still need stronger evidence."
      />
    </div>
  );
}