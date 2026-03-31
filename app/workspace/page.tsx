"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import AppCard from "@/components/ui/AppCard";
import SectionLabel from "@/components/ui/SectionLabel";
import { useWorkspace } from "@/components/workspace/WorkspaceProvider";

export default function WorkspacePage() {
  const router = useRouter();
  const { progress, getStepHref, state } = useWorkspace();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      router.replace(getStepHref(progress.nextStep));
    }, 500);

    return () => window.clearTimeout(timer);
  }, [router, progress.nextStep, getStepHref]);

  return (
    <div className="space-y-6">
      <AppCard className="p-6 sm:p-8">
        <SectionLabel tone="blue">Workspace</SectionLabel>

        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#f4efe9] sm:text-4xl">
          Preparing your workspace
        </h1>

        <p className="mt-4 max-w-3xl text-base leading-7 text-[#d8cbbf]">
          The workspace checks what is already available and routes you to the
          next meaningful step.
        </p>

        <div className="mt-6 rounded-2xl border border-[#2d2621] bg-[#211d1a] p-4 text-sm text-[#d8cbbf]">
          <div>Next step: {progress.nextStep}</div>
          <div className="mt-2">
            Candidate profile: {state.candidateProfile ? "available" : "missing"}
          </div>
          <div>Job profile: {state.jobProfile ? "available" : "missing"}</div>
          <div>Insights: {state.insights ? "available" : "missing"}</div>
        </div>
      </AppCard>
    </div>
  );
}