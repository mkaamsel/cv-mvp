"use client";

import type { ReactNode } from "react";
import WorkspaceHeader from "@/components/workspace/WorkspaceHeader";

export default function WorkspaceShell({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <WorkspaceHeader />
      <main className="w-full px-6 py-6 lg:px-8">{children}</main>
    </div>
  );
}