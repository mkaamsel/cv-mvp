"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function HomePage() {
  const supabase = createSupabaseBrowserClient();

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setUser(user);
      setLoading(false);
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

  if (loading) {
    return (
      <main style={{ padding: "2rem" }}>
        <h1>CV Tailor MVP</h1>
        <p>Loading...</p>
      </main>
    );
  }

  return (
    <main style={{ padding: "2rem" }}>
      <h1>CV Tailor MVP</h1>
      <p style={{ marginTop: "0.75rem" }}>
        Build tailored CVs from your base profile and a job description.
      </p>

      {!user ? (
        <div style={{ display: "flex", gap: "1rem", marginTop: "2rem" }}>
          <Link href="/signup">
            <button style={{ padding: "0.9rem 1.2rem", cursor: "pointer" }}>
              Sign up
            </button>
          </Link>

          <Link href="/login">
            <button style={{ padding: "0.9rem 1.2rem", cursor: "pointer" }}>
              Log in
            </button>
          </Link>
        </div>
      ) : (
        <div style={{ marginTop: "2rem" }}>
          <p style={{ marginBottom: "1rem" }}>You are logged in.</p>

          <Link href="/dashboard">
            <button style={{ padding: "0.9rem 1.2rem", cursor: "pointer" }}>
              Go to Dashboard
            </button>
          </Link>
        </div>
      )}
    </main>
  );
}