"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import WorkspaceHeader from "@/components/workspace/WorkspaceHeader";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function WorkspaceShell({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    if (loggingOut) return;

    setLoggingOut(true);

    try {
      await supabase.auth.signOut();
      router.replace("/login");
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <WorkspaceHeader />

      <div className="w-full px-6 pt-4 lg:px-8">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loggingOut ? "Logging out..." : "Log out"}
          </button>
        </div>
      </div>

      <main className="w-full px-6 py-6 lg:px-8">{children}</main>
    </div>
  );
}