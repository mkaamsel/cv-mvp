"use client";

import Link from "next/link";

export default function Dashboard() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-10 text-white">
      <section className="mb-8 max-w-3xl">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-teal-300">
          Workspace
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white md:text-4xl">
          Dashboard
        </h1>
        <p className="mt-3 text-base leading-7 text-slate-300">
          Manage your base profile, create tailored application drafts, and review saved
          versions.
        </p>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/20">
          <h2 className="text-xl font-semibold text-white">Profile</h2>
          <p className="mt-3 min-h-[4.5rem] text-base leading-7 text-slate-300">
            Save your full name and master CV used for tailoring.
          </p>
          <Link
            href="/profile"
            className="mt-6 inline-flex w-full items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/10"
          >
            Edit Profile
          </Link>
        </div>

        <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/20">
          <h2 className="text-xl font-semibold text-white">Tailoring</h2>
          <p className="mt-3 min-h-[4.5rem] text-base leading-7 text-slate-300">
            Paste a job description and generate a fresh tailored CV and cover letter
            draft.
          </p>
          <Link
            href="/tailoring"
            className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-teal-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-teal-300"
          >
            Create New Tailored Draft
          </Link>
        </div>

        <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/20">
          <h2 className="text-xl font-semibold text-white">Saved CVs</h2>
          <p className="mt-3 min-h-[4.5rem] text-base leading-7 text-slate-300">
            Review the CV drafts you have already generated and saved.
          </p>
          <Link
            href="/dashboard/cvs"
            className="mt-6 inline-flex w-full items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/10"
          >
            View Saved CVs
          </Link>
        </div>

        <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/20">
          <h2 className="text-xl font-semibold text-white">Cover Letter History</h2>
          <p className="mt-3 min-h-[4.5rem] text-base leading-7 text-slate-300">
            Review, edit, and reuse parts of previously generated cover letter drafts.
          </p>
          <Link
            href="/dashboard/cover-letters"
            className="mt-6 inline-flex w-full items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/10"
          >
            View Cover Letter History
          </Link>
        </div>
      </section>
    </main>
  );
}
