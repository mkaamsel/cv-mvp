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
      <main className="min-h-screen bg-slate-950 text-white">
        <div className="mx-auto flex min-h-screen max-w-6xl items-center px-6 py-16">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-slate-400">
              CV-MVP
            </p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight">
              Loading...
            </h1>
          </div>
        </div>
      </main>
    );
  }

  const primaryHref = user ? "/dashboard" : "/signup";
  const primaryLabel = user ? "Go to Dashboard" : "Try it now";
  const secondaryHref = user ? "/dashboard/cvs" : "/login";
  const secondaryLabel = user ? "View your CVs" : "Log in";

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(45,212,191,0.18),transparent_35%),radial-gradient(circle_at_80%_20%,rgba(59,130,246,0.16),transparent_30%)]" />
        <div className="relative mx-auto max-w-6xl px-6 py-20 md:py-28">
          <div className="max-w-3xl">
            <div className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200 backdrop-blur">
              Tailored applications, not generic AI output
            </div>

            <h1 className="mt-6 text-4xl font-semibold leading-tight tracking-tight text-white md:text-6xl">
              Create job applications that feel specific, credible, and worth
              reading.
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
              Upload your base CV, paste the job description, and generate a
              tailored CV and cover letter designed to match the role in
              minutes.
            </p>

            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <Link
                href={primaryHref}
                className="inline-flex items-center justify-center rounded-xl bg-teal-400 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:scale-[1.01] hover:bg-teal-300"
              >
                {primaryLabel}
              </Link>

              <Link
                href={secondaryHref}
                className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/10"
              >
                {secondaryLabel}
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap gap-6 text-sm text-slate-400">
              <span>No generic templates</span>
              <span>Tailored to the role</span>
              <span>Built for real applications</span>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-8 md:py-12">
        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl shadow-black/10 backdrop-blur">
            <div className="mb-4 text-sm font-medium text-teal-300">Step 1</div>
            <h2 className="text-xl font-semibold text-white">Upload your base CV</h2>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              Start with your existing profile and work from the experience you
              already have.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl shadow-black/10 backdrop-blur">
            <div className="mb-4 text-sm font-medium text-teal-300">Step 2</div>
            <h2 className="text-xl font-semibold text-white">
              Paste the job description
            </h2>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              Give the system the role context so the application can be adapted
              to the actual requirements.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl shadow-black/10 backdrop-blur">
            <div className="mb-4 text-sm font-medium text-teal-300">Step 3</div>
            <h2 className="text-xl font-semibold text-white">
              Generate tailored documents
            </h2>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              Get a sharper CV and cover letter that feel more relevant, clear,
              and professionally positioned.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-8 md:py-14">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-8 shadow-2xl shadow-black/20">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-teal-300">
              Why it feels better
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white">
              Built to improve relevance, not just generate text.
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-8 text-slate-300">
              The goal is not to flood applications with generic AI language.
              The goal is to help candidates present their experience more
              clearly, more specifically, and in a way that matches the role
              they actually want.
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur">
            <h3 className="text-xl font-semibold text-white">What you get</h3>
            <ul className="mt-5 space-y-4 text-sm leading-7 text-slate-300">
              <li>Cleaner, more focused wording</li>
              <li>Role-specific tailoring</li>
              <li>Stronger professional presentation</li>
              <li>Faster iteration for each application</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-8 md:py-16">
        <div className="rounded-3xl border border-white/10 bg-gradient-to-r from-teal-400/15 via-cyan-400/10 to-blue-400/15 p-8 md:p-10">
          <div className="max-w-3xl">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-teal-300">
              Final call
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white md:text-4xl">
              Stop sending the same application everywhere.
            </h2>
            <p className="mt-4 text-base leading-8 text-slate-300">
              Create tailored applications that look more deliberate, more
              relevant, and more worth reading.
            </p>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Link
                href={primaryHref}
                className="inline-flex items-center justify-center rounded-xl bg-teal-400 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:scale-[1.01] hover:bg-teal-300"
              >
                {primaryLabel}
              </Link>

              {!user && (
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/10"
                >
                  Already have an account?
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}