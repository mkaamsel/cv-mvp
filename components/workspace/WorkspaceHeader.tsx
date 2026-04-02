"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useWorkspace } from "@/components/workspace/WorkspaceProvider";

export default function WorkspaceHeader() {
  const pathname = usePathname();
  const { progress, getStepHref } = useWorkspace();

  function stepClass(path: string, enabled: boolean) {
    const active = pathname.startsWith(path);

    if (!enabled) {
      return "rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white/50 cursor-not-allowed";
    }

    return active
      ? "rounded-full bg-white px-4 py-2 text-sm font-medium text-blue-700 shadow"
      : "rounded-full bg-white/20 px-4 py-2 text-sm font-medium text-white hover:bg-white/30";
  }

  return (
    <header className="w-full border-b border-blue-300 bg-blue-600 text-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        
        <div>
          <div className="text-lg font-semibold">
            AI Job Application Assistant
          </div>
          <div className="text-sm text-blue-100">
            Guided application workspace
          </div>
        </div>

        <nav className="flex items-center gap-3">
          <Link
            href={getStepHref("profile")}
            className={stepClass("/workspace/profile", true)}
          >
            1 Profile
          </Link>

          <Link
            href={getStepHref("job")}
            className={stepClass("/workspace/job", progress.profileReady)}
          >
            2 Job
          </Link>

          <Link
            href={getStepHref("insights")}
            className={stepClass("/workspace/insights", progress.jobReady)}
          >
            3 Insights
          </Link>

          <Link
            href={getStepHref("final")}
            className={stepClass("/workspace/final", progress.insightsReady)}
          >
            4 Final
          </Link>
        </nav>
      </div>
    </header>
  );
}