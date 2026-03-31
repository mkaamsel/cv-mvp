import type { ReactNode } from "react";
import WorkspaceShell from "@/components/workspace/WorkspaceShell";
import WorkspaceProvider from "@/components/workspace/WorkspaceProvider";

export default function WorkspaceLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <WorkspaceProvider>
      <WorkspaceShell>{children}</WorkspaceShell>
    </WorkspaceProvider>
  );
}