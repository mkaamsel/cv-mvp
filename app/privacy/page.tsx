export default function PrivacyPage(): React.JSX.Element {
  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: "48px 24px", fontFamily: "inherit" }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em", margin: "0 0 8px" }}>
        Privacy Policy
      </h1>
      <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 40px" }}>
        Last updated: April 2026
      </p>

      <Section title="What this service does">
        <p>
          This service helps you build a candidate profile from your own documents and generates
          tailored CVs and cover letters for specific job applications. Everything is built around
          your own experience — we never invent or add information you have not provided.
        </p>
      </Section>

      <Section title="What data we collect">
        <p>The data we hold about you falls into three categories:</p>
        <ul>
          <li>
            <strong>Account data</strong> — your email address and encrypted password, stored by
            Supabase Auth. We do not store payment information.
          </li>
          <li>
            <strong>Profile data</strong> — the CV text, documents, and profile information you
            upload or enter. This is the source of truth for your generated documents.
          </li>
          <li>
            <strong>Run data</strong> — each time you run the pipeline we store the job description
            input, the structured analysis, the generated CV and cover letter, and anonymised
            telemetry (e.g. which pipeline stages ran, how long they took). This allows us to show
            you your history and improve the system.
          </li>
        </ul>
        <p>
          We do not collect or store any financial information, government IDs, or sensitive
          categories of personal data as defined under GDPR Article 9.
        </p>
      </Section>

      <Section title="Why we collect it">
        <p>We process your data for the following purposes:</p>
        <ul>
          <li>
            <strong>To provide the service</strong> — storing your profile and run history is
            necessary for the service to work. Legal basis: performance of a contract (Article
            6(1)(b) GDPR).
          </li>
          <li>
            <strong>To improve the system</strong> — if you consented at signup, anonymised
            patterns from your runs (not your personal content) may be used to tune the pipeline.
            Legal basis: consent (Article 6(1)(a) GDPR). You can withdraw this consent at any
            time in Settings.
          </li>
        </ul>
      </Section>

      <Section title="How your data is stored">
        <p>
          Your data is stored in Supabase, a cloud database provider. Data is encrypted at rest
          and in transit. Access is controlled by row-level security policies — your data is only
          accessible to your own authenticated session, except where our service needs to process
          it on your behalf.
        </p>
        <p>
          We use OpenAI&apos;s API to run the intelligence pipeline. Job description text and
          relevant profile data are sent to OpenAI as part of each analysis run. OpenAI&apos;s
          data processing terms apply to this data. We do not use OpenAI&apos;s training opt-in
          features.
        </p>
      </Section>

      <Section title="How long we keep it">
        <p>
          We retain your account and profile data for as long as your account is active. Run
          history is retained for 12 months from the date of each run. If you delete your account,
          all data is permanently erased immediately. We do not archive deleted accounts.
        </p>
        <p>
          A formal data retention schedule will be published before public launch.
        </p>
      </Section>

      <Section title="Your rights">
        <p>Under GDPR you have the following rights:</p>
        <ul>
          <li>
            <strong>Right of access</strong> — you can request a copy of all data we hold about
            you.
          </li>
          <li>
            <strong>Right to erasure</strong> — you can delete your account and all associated
            data at any time from the Settings page. Deletion is immediate and permanent.
          </li>
          <li>
            <strong>Right to portability</strong> — you can request a machine-readable export of
            your data. Data portability export is in development and will be available before
            public launch.
          </li>
          <li>
            <strong>Right to object</strong> — you can withdraw your consent for optional
            processing (system improvement) at any time in Settings.
          </li>
          <li>
            <strong>Right to rectification</strong> — you can update your profile data at any time
            through the Profile page.
          </li>
        </ul>
      </Section>

      <Section title="Contact for data requests">
        <p>
          For any data request — access, erasure, portability, or a concern about how your data is
          handled — please contact us. A formal data contact address will be listed here before
          public launch.
        </p>
        <p>
          You also have the right to lodge a complaint with a supervisory authority. In Germany
          this is the relevant Landesbeauftragte für Datenschutz. In the EU more broadly, you can
          contact your national data protection authority.
        </p>
      </Section>

      <Section title="Cookies and local storage">
        <p>
          We use session cookies to keep you logged in. No advertising or tracking cookies are
          used. Local storage may be used to preserve workspace state within your current browser
          session. See our{" "}
          <a href="/cookies" style={{ color: "inherit" }}>
            Cookie Policy
          </a>{" "}
          for details.
        </p>
      </Section>
    </main>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section style={{ marginBottom: 36 }}>
      <h2
        style={{
          fontSize: 17,
          fontWeight: 700,
          color: "#111827",
          margin: "0 0 12px",
          letterSpacing: "-0.01em",
        }}
      >
        {title}
      </h2>
      <div
        style={{
          fontSize: 14,
          lineHeight: 1.8,
          color: "#374151",
        }}
      >
        {children}
      </div>
    </section>
  );
}
