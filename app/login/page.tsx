"use client";

import Link from "next/link";
import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("Logging in...");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    setMessage("Login successful.");
    setLoading(false);
    router.push("/profile");
    router.refresh();
  };

  return (
    <main className="min-h-screen bg-[#F7F3ED] text-[#2F2A26]">
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(127,163,141,0.18),transparent_35%),radial-gradient(circle_at_85%_20%,rgba(201,143,111,0.14),transparent_28%)]" />
        <div className="absolute left-10 top-24 h-36 w-36 rounded-full bg-[#E8D8C7]/40 blur-3xl" />
        <div className="absolute right-16 top-20 h-40 w-40 rounded-full bg-[#D9E7DD]/50 blur-3xl" />

        <div className="relative mx-auto grid min-h-screen max-w-6xl gap-10 px-6 py-12 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <div className="max-w-xl">
            <div className="inline-flex items-center rounded-full border border-[#E7DDD2] bg-[#FFFDF9]/80 px-4 py-2 text-sm text-[#6B625B]">
              Welcome back
            </div>

            <h1 className="mt-6 text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
              Log in and continue where you left off.
            </h1>

            <p className="mt-6 text-lg leading-8 text-[#6B625B]">
              Access your saved profile, manage your data, and continue building
              tailored applications with less friction.
            </p>

            <div className="mt-8 rounded-3xl border border-[#E7DDD2] bg-[#FFFDF9] p-6 shadow-sm">
              <h2 className="text-lg font-semibold">Inside your workspace</h2>
              <ul className="mt-4 space-y-3 text-sm leading-7 text-[#6B625B]">
                <li>Manage your canonical profile</li>
                <li>Review or update your CV-based data</li>
                <li>Prepare role-specific application drafts</li>
                <li>Keep application language credible and consistent</li>
              </ul>
            </div>
          </div>

          <div className="w-full">
            <div className="rounded-[2rem] border border-[#E7DDD2] bg-[#FFFDF9]/95 p-6 shadow-[0_20px_60px_rgba(74,58,43,0.10)] backdrop-blur md:p-8">
              <div className="mb-6">
                <h2 className="text-2xl font-semibold tracking-tight">Log in</h2>
                <p className="mt-2 text-sm leading-7 text-[#6B625B]">
                  Continue to your profile and workspace.
                </p>
              </div>

              <form onSubmit={handleLogin} className="grid gap-5">
                <div className="grid gap-2">
                  <label
                    htmlFor="email"
                    className="text-sm font-medium text-[#2F2A26]"
                  >
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    placeholder="your.email@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="rounded-xl border border-[#D8CDC1] bg-[#FFFDF9] px-4 py-3 text-sm text-[#2F2A26] outline-none transition placeholder:text-[#9A9087] focus:border-[#7FA38D]"
                  />
                </div>

                <div className="grid gap-2">
                  <label
                    htmlFor="password"
                    className="text-sm font-medium text-[#2F2A26]"
                  >
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="rounded-xl border border-[#D8CDC1] bg-[#FFFDF9] px-4 py-3 text-sm text-[#2F2A26] outline-none transition placeholder:text-[#9A9087] focus:border-[#7FA38D]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className={`inline-flex items-center justify-center rounded-xl px-6 py-3 text-sm font-semibold text-white transition ${
                    loading
                      ? "cursor-not-allowed bg-[#A9B9AF] opacity-70"
                      : "bg-[#7FA38D] hover:bg-[#6F927E]"
                  }`}
                >
                  {loading ? "Logging in..." : "Log in"}
                </button>
              </form>

              {message && (
                <div className="mt-5 rounded-2xl border border-[#E7DDD2] bg-[#F8F5F0] px-4 py-3 text-sm text-[#5F5751]">
                  {message}
                </div>
              )}

              <p className="mt-6 text-sm text-[#6B625B]">
                Do not have an account yet?{" "}
                <Link href="/signup" className="font-medium underline">
                  Create account
                </Link>
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}