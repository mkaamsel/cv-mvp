export default function GdprPolicyPage() {
  return (
    <main className="max-w-3xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">GDPR / Privacy Policy</h1>

      <p className="text-sm text-gray-700">
        This page explains how personal data is processed when users create a
        profile, upload CV content, and use application-tailoring features.
      </p>

      <p className="text-sm text-gray-700">
        The service may process uploaded CV content, profile information, job
        description text, and related inputs in order to generate tailored
        application materials and improve the user experience.
      </p>

      <p className="text-sm text-gray-700">
        Users who prefer not to provide direct personal identifiers at this
        stage may use placeholders such as “Name Name”, “Telefon Telefon”, or
        similar text labels instead of real personal details.
      </p>

      <p className="text-sm text-gray-700">
        A fuller legal privacy notice should be added before public rollout.
      </p>
    </main>
  );
}