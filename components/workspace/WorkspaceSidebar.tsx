"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import AppCard from "@/components/ui/AppCard";
import { useWorkspace } from "@/components/workspace/WorkspaceProvider";

const navItems = [
  {
    href: "/workspace/profile",
    title: "Profile",
    description: "Candidate documents and extracted profile",
    key: "profile",
  },
  {
    href: "/workspace/job",
    title: "Job",
    description: "Job source, extraction, required profile",
    key: "job",
  },
  {
    href: "/workspace/insights",
    title: "Insights",
    description: "Evidence, positioning, missing signals",
    key: "insights",
  },
  {
    href: "/workspace/final",
    title: "Final",
    description: "Readiness and generation handoff",
    key: "final",
  },
] as const;

export default function WorkspaceSidebar() {
  const pathname = usePathname();
  const { progress } = useWorkspace();

  function isComplete(stepKey: (typeof navItems)[number]["key"]) {
    if (stepKey === "profile") return progress.profileReady;
    if (stepKey === "job") return progress.jobReady;
    if (stepKey === "insights") return progress.insightsReady;
    return progress.finalReady;
  }

  return (
    <AppCard className="p-3">
      <div className="mb-3 px-3 pt-2">
        <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-[#a9998c]">
          Workspace
        </h2>
      </div>

      <div className="space-y-2">
        {navItems.map((item) => {
          const active = pathname === item.href;
          const complete = isComplete(item.key);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "block rounded-2xl border px-4 py-3 transition",
                active
                  ? "border-[#7fa7c6]/30 bg-[#7fa7c6]/10"
                  : "border-transparent bg-transparent hover:border-[#3a312b] hover:bg-[#211d1a]",
              ].join(" ")}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold text-[#f4efe9]">
                  {item.title}
                </div>
                <div
                  className={[
                    "rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em]",
                    complete
                      ? "border border-[#8fbf9f]/30 bg-[#8fbf9f]/12 text-[#def1e3]"
                      : "border border-[#3a312b] bg-[#1a1715] text-[#a9998c]",
                  ].join(" ")}
                >
                  {complete ? "ready" : "pending"}
                </div>
              </div>

              <div className="mt-1 text-xs leading-5 text-[#a9998c]">
                {item.description}
              </div>
            </Link>
          );
        })}
      </div>
    </AppCard>
  );
}