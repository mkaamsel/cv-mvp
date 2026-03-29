"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  const [loading, setLoading] = useState(true);
  const [profileReady, setProfileReady] = useState(false);

  useEffect(() => {
    const checkAccess = async () => {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.replace("/login");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("candidate_profiles")
        .select("id, profile_status")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profileError) {
        console.error("Profile check error:", profileError);
        router.replace("/profile");
        return;
      }

      if (!profile) {
        router.replace("/profile");
        return;
      }

      setProfileReady(true);
      setLoading(false);
    };

    checkAccess();
  }, [router, supabase]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#F7F3ED] text-[#2F2A26]">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <p className="text-sm uppercase tracking-[0.2em] text-[#8B8077]">
            Workspace
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight">
            Loading...
          </h1>
        </div>
      </main>
    );
  }

  if (!profileReady) {
    return null;
  }

  return (
    <main className="min-h-screen bg-[#F7F3ED] text-[#2F2A26]">
      <section className="relative overflow-hidden border-b border-[#E7DDD2]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(127,163,141,0.16),transparent_35%),radial-gradient(circle_at_85%_20%,rgba(201,143,111,0.14),transparent_28%)]" />

        <div className="relative mx-auto max-w-5xl px-6 py-12">
          <section className="mb-10 max-w-3xl">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-[#7FA38D]">
              Workspace
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
              Dashboard
            </h1>
            <p className="mt-3 text-base leading-8 text-[#6B625B]">
              Manage your profile, create tailored application drafts, and review
              saved versions in one place.
            </p>
          </section>

          <section className="grid gap-6 md:grid-cols-2">
            <div className="rounded-3xl border border-[#E7DDD2] bg-[#FFFDF9] p-6 shadow-sm">
              <h2 className="text-xl font-semibold">Profile</h2>
              <p className="mt-3 min-h-[4.5rem] text-base leading-7 text-[#6B625B]">
                Review and update the canonical profile that all tailoring should
                be based on.
              </p>
              <Link
                href="/profile"
                className="mt-6 inline-flex w-full items-center justify-center rounded-xl border border-[#D8CDC1] bg-[#FFFDF9] px-4 py-3 text-sm font-medium text-[#2F2A26] transition hover:bg-[#F3ECE3]"
              >
                Edit Profile
              </Link>
            </div>

            <div className="rounded-3xl border border-[#E7DDD2] bg-[#FFFDF9] p-6 shadow-sm">
              <h2 className="text-xl font-semibold">Tailoring</h2>
              <p className="mt-3 min-h-[4.5rem] text-base leading-7 text-[#6B625B]">
                Paste a job description and generate a fresh tailored CV and
                cover letter draft.
              </p>
              <Link
                href="/tailoring"
                className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-[#7FA38D] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#6F927E]"
              >
                Create New Tailored Draft
              </Link>
            </div>

            <div className="rounded-3xl border border-[#E7DDD2] bg-[#FFFDF9] p-6 shadow-sm">
              <h2 className="text-xl font-semibold">Saved CVs</h2>
              <p className="mt-3 min-h-[4.5rem] text-base leading-7 text-[#6B625B]">
                Review the CV drafts you have already generated and saved.
              </p>
              <Link
                href="/dashboard/cvs"
                className="mt-6 inline-flex w-full items-center justify-center rounded-xl border border-[#D8CDC1] bg-[#FFFDF9] px-4 py-3 text-sm font-medium text-[#2F2A26] transition hover:bg-[#F3ECE3]"
              >
                View Saved CVs
              </Link>
            </div>

            <div className="rounded-3xl border border-[#E7DDD2] bg-[#FFFDF9] p-6 shadow-sm">
              <h2 className="text-xl font-semibold">Cover Letter History</h2>
              <p className="mt-3 min-h-[4.5rem] text-base leading-7 text-[#6B625B]">
                Review, edit, and reuse parts of previously generated cover
                letter drafts.
              </p>
              <Link
                href="/dashboard/cover-letters"
                className="mt-6 inline-flex w-full items-center justify-center rounded-xl border border-[#D8CDC1] bg-[#FFFDF9] px-4 py-3 text-sm font-medium text-[#2F2A26] transition hover:bg-[#F3ECE3]"
              >
                View Cover Letter History
              </Link>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}