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
    <nav
      style={{
        display: "flex",
        gap: "1.5rem",
        alignItems: "center",
        padding: "1rem 2rem",
        borderBottom: "1px solid #ddd",
        marginBottom: "1.5rem",
      }}
    >
      <Link href="/">Home</Link>

      {!user ? (
        <>
          <Link href="/login">Login</Link>
          <Link href="/signup">Sign up</Link>
        </>
      ) : (
        <button
          onClick={handleLogout}
          style={{
            cursor: "pointer",
            background: "none",
            border: "none",
            padding: 0,
            font: "inherit",
          }}
        >
          Logout
        </button>
      )}
    </nav>
  );
}