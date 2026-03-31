"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function WorkspaceHeader() {
  const pathname = usePathname();

  function stepClass(path: string) {
    const active = pathname.startsWith(path);

    return active
      ? "rounded-full bg-white px-4 py-2 text-sm font-medium text-blue-700 shadow"
      : "rounded-full bg-white/20 px-4 py-2 text-sm font-medium text-white hover:bg-white/30";
  }

  return (
    <header className="w-full border-b border-blue-300 bg-blue-600 text-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        
        {/* Left title */}
        <div>
          <div className="text-lg font-semibold">
            AI Job Application Assistant
          </div>
          <div className="text-sm text-blue-100">
            Guided application workspace
          </div>
        </div>

        {/* Step navigation */}
        <nav className="flex items-center gap-3">
          <Link href="/workspace/profile" className={stepClass("/workspace/profile")}>
            1 Profile
          </Link>

          <Link href="/workspace/job" className={stepClass("/workspace/job")}>
            2 Job
          </Link>

          <Link href="/workspace/insights" className={stepClass("/workspace/insights")}>
            3 Insights
          </Link>

          <Link href="/workspace/final" className={stepClass("/workspace/final")}>
            4 Final
          </Link>
        </nav>
      </div>
    </header>
  );
}