import Link from "next/link";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Section from "@/components/ui/Section";

function PreviewLine({ width }: { width: string }) {
  return (
    <div
      className="h-3 rounded-full bg-[var(--color-border)]/70"
      style={{ width }}
    />
  );
}

export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[var(--color-background)]">
      <div className="absolute -top-32 -left-32 h-[420px] w-[420px] rounded-full bg-[var(--color-accent-purple)] opacity-25 blur-[120px]" />
      <div className="absolute top-1/3 -right-32 h-[380px] w-[380px] rounded-full bg-[var(--color-accent-green)] opacity-25 blur-[120px]" />

      <Section className="relative flex min-h-screen items-center">
        <div className="grid w-full gap-14 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">

          {/* LEFT SIDE */}
          <div>

            {/* softened label */}
            <p className="mb-4 text-sm text-[var(--color-text-secondary)]">
              A calmer way to apply for jobs
            </p>

            <h1 className="max-w-3xl text-5xl font-semibold leading-tight tracking-tight text-[var(--color-text-primary)] md:text-6xl">
              Build thoughtful job applications
              without rewriting your CV every time
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--color-text-secondary)]">
              Most job applications fail because they are rushed, generic,
              or inconsistent. This workspace helps you create applications
              that feel clear, credible, and worth reading.
            </p>

            <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--color-text-secondary)]">
              Paste your CV and a job description to generate a tailored draft,
              or build a reusable candidate profile that improves every
              application you send.
            </p>

            {/* BUTTONS */}
            <div className="mt-10 flex flex-wrap gap-4">

              <Link href="/signup">
                <Button className="px-10 py-4 text-lg shadow-lg">
                  Create account
                </Button>
              </Link>

              <Link href="/login">
                <Button variant="secondary" className="px-7 py-4 text-lg">
                  Log in
                </Button>
              </Link>

            </div>

            {/* softer feature tags */}
            <div className="mt-10 flex flex-wrap gap-3 text-sm text-[var(--color-text-muted)] opacity-80">
              <span>Tailored CV drafts</span>
              <span>•</span>
              <span>Cover letters</span>
              <span>•</span>
              <span>Reusable candidate profile</span>
              <span>•</span>
              <span>Works across languages</span>
            </div>

          </div>

          {/* RIGHT SIDE PREVIEW */}
          <div className="animate-[float_6s_ease-in-out_infinite]">

            <Card className="p-8 space-y-6">

              <div className="space-y-3">
                <PreviewLine width="80%" />
                <PreviewLine width="90%" />
                <PreviewLine width="70%" />
              </div>

              <div className="space-y-3">
                <PreviewLine width="60%" />
                <PreviewLine width="85%" />
                <PreviewLine width="65%" />
              </div>

              <div className="space-y-3">
                <PreviewLine width="75%" />
                <PreviewLine width="95%" />
                <PreviewLine width="70%" />
              </div>

            </Card>

          </div>

        </div>
      </Section>
    </main>
  );
}