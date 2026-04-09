export default function PrivacyPage(): React.JSX.Element {
  return (
    <main style={{ maxWidth: 920, margin: "0 auto", padding: "40px 20px", lineHeight: 1.7 }}>
      <h1>Privacy Policy</h1>
      <p>
        This beta service processes uploaded documents and profile inputs to analyze
        professional information and generate job application materials (for example CV and
        cover letter drafts).
      </p>

      <h2>How your data is processed</h2>
      <p>
        We may use AI services provided by OpenAI to process your uploaded text and role/job
        context. These inputs are processed to provide the requested product functionality.
      </p>
      <p>
        Data sent through this integration is not used to train OpenAI models.
      </p>

      <h2>Profile reuse</h2>
      <p>
        Your profile data may be reused across multiple job analyses in your workspace so you do
        not need to start from zero for each role.
      </p>

      <h2>GDPR rights</h2>
      <p>
        You have rights under GDPR, including access, rectification, erasure, restriction,
        objection, and data portability (where applicable).
      </p>

      <h2>Deletion requests</h2>
      <p>
        You can request deletion of your account and associated data. For beta support and
        deletion requests, please contact: privacy@placeholder.example
      </p>
    </main>
  );
}
