"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function NavBar() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const loadUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setUser(user);
    };

    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  const handleLogout = async () => {
    await fetch("/auth/signout", {
      method: "POST",
    });

    setUser(null);
    router.push("/login");
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-50 border-b border-[#D9CEC3] bg-[#F4EEE6] shadow-sm">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl font-semibold tracking-tight text-[#2F2A26]">
            CV-MVP
          </span>
        </Link>

        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="text-sm font-medium text-[#5F5751] transition hover:text-[#2F2A26]"
          >
            Home
          </Link>

          {!user ? (
            <>
              <Link
                href="/login"
                className="text-sm font-medium text-[#5F5751] transition hover:text-[#2F2A26]"
              >
                Log in
              </Link>

              <Link
                href="/signup"
                className="inline-flex items-center justify-center rounded-xl bg-[#7FA38D] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#6F927E]"
              >
                Create account
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/profile"
                className="text-sm font-medium text-[#5F5751] transition hover:text-[#2F2A26]"
              >
                Profile
              </Link>

              <Link
                href="/dashboard"
                className="text-sm font-medium text-[#5F5751] transition hover:text-[#2F2A26]"
              >
                Dashboard
              </Link>

              <button
                onClick={handleLogout}
                className="rounded-xl border border-[#D8CDC1] bg-[#FFFDF9] px-4 py-2 text-sm font-medium text-[#2F2A26] transition hover:bg-[#F3ECE3]"
              >
                Logout
              </button>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}