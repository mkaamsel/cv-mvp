import Link from "next/link";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import PageHeader from "@/components/ui/PageHeader";
import Section from "@/components/ui/Section";

export default function WorkspacePage() {
  return (
    <main>
      <Section>
        <PageHeader
          eyebrow="Workspace"
          title="Choose how you want to start"
          description="Get immediate value with quick tailoring, or build your canonical profile for stronger, more consistent applications later."
        />

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="p-6 md:p-8">
            <div className="mb-4 inline-flex rounded-full bg-[var(--color-primary-soft)] px-3 py-1 text-sm font-medium text-[var(--color-text-secondary)]">
              Fast start
            </div>

            <h2 className="text-2xl font-semibold text-[var(--color-text-primary)]">
              Quick Tailor Now
            </h2>

            <p className="mt-3 text-[var(--color-text-secondary)] leading-7">
              Paste your CV and the job description to generate a tailored CV
              and cover letter without setting up a full profile first.
            </p>

            <ul className="mt-5 space-y-2 text-sm text-[var(--color-text-secondary)]">
              <li>• Immediate role-fit analysis</li>
              <li>• Tailored CV draft</li>
              <li>• Cover letter draft</li>
              <li>• Best for fast applications</li>
            </ul>

            <div className="mt-6">
              <Link href="/tailoring">
                <Button variant="primary">Start quick tailoring</Button>
              </Link>
            </div>
          </Card>

          <Card className="p-6 md:p-8">
            <div className="mb-4 inline-flex rounded-full bg-[var(--color-accent-green)] px-3 py-1 text-sm font-medium text-[var(--color-text-secondary)]">
              Guided setup
            </div>

            <h2 className="text-2xl font-semibold text-[var(--color-text-primary)]">
              Build Canonical Profile
            </h2>

            <p className="mt-3 text-[var(--color-text-secondary)] leading-7">
              Upload or paste one or more CVs, let the system extract your
              profile, and refine it once for more credible tailoring later.
            </p>

            <ul className="mt-5 space-y-2 text-sm text-[var(--color-text-secondary)]">
              <li>• Reusable candidate profile</li>
              <li>• Better long-term consistency</li>
              <li>• Missing-data prompts</li>
              <li>• Best for repeated applications</li>
            </ul>

            <div className="mt-6">
              <Link href="/profile">
                <Button variant="secondary">Build profile</Button>
              </Link>
            </div>
          </Card>
        </div>

        <Card className="mt-8 p-6">
          <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
            Recommended way to use the MVP
          </h3>
          <p className="mt-3 max-w-3xl text-[var(--color-text-secondary)] leading-7">
            Start with quick tailoring if you want immediate output. Build your
            canonical profile once you want stronger consistency across multiple
            applications.
          </p>
        </Card>
      </Section>
    </main>
  );
}