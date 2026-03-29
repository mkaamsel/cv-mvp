import { IntelligenceCore } from "./core/intelligenceCore";
import { registerModules } from "./registry/registerModules";

function unique(items: string[]): string[] {
  return Array.from(new Set(items.map((item) => item.trim()).filter(Boolean)));
}

function bulletList(items: string[], max = 5): string {
  return unique(items)
    .slice(0, max)
    .map((item) => `- ${item}`)
    .join("\n");
}

async function main() {
  const core = new IntelligenceCore();
  registerModules(core);

  const bundle = await core.run({
    applicationId: "draft-preview-001",
    outputLanguage: "en",
    candidateInput: {
      rawText: `
Manoj Agarwal
Senior finance and accounting professional with experience in R2R,
IFRS, HGB, reporting, controls, process improvement and SAP environments.
      `.trim()
    },
    jobInput: {
      rawText: `
Finance Manager

Location: Düsseldorf

Responsibilities:
- Own monthly, quarterly and annual closing activities
- Manage general ledger accuracy and reconciliations
- Coordinate audits and statutory reporting
- Support process improvements and internal controls
- Work closely with business stakeholders

Requirements:
- Degree in finance, accounting or similar
- Several years of experience in accounting / finance
- Strong knowledge of HGB and IFRS
- SAP experience preferred
- Strong communication skills
      `.trim()
    }
  });

  const candidate = bundle.layers.candidate?.payload as any;
  const job = bundle.layers.job?.payload as any;
  const requiredProfile = bundle.layers.requiredProfile?.payload as any;

  const cvDraft = `
MANOJ AGARWAL

Target Role
${job?.title ?? "Target role not available"}

Location
${job?.location ?? "Not specified"}

Professional Summary
${candidate?.summary ?? "Candidate summary not available."}

Relevant Strengths
${bulletList([
  ...(candidate?.skillSignals ?? []),
  ...(requiredProfile?.mustHaves ?? [])
], 6)}

Role Alignment Highlights
${bulletList([
  ...(job?.responsibilities ?? []),
  ...(requiredProfile?.shouldHaves ?? [])
], 6)}
  `.trim();

  const coverLetterDraft = `
Dear Hiring Team,

I am applying for the ${job?.title ?? "position"} role${job?.location ? ` in ${job.location}` : ""}.

My background is rooted in finance and accounting, with experience across R2R, IFRS, HGB, reporting, controls, process improvement and SAP-linked environments. This aligns well with the core needs of your role, particularly around closing activities, general ledger accuracy, reconciliations, audit coordination and process discipline.

What makes this opportunity particularly relevant is the overlap between your requirements and the areas where I can contribute from day one: strong accounting grounding, exposure to HGB and IFRS, structured reporting work, and support for robust finance processes and internal controls.

I would welcome the opportunity to contribute this experience to your team and discuss how my background can support the goals of the role.

Kind regards,
Manoj Agarwal
  `.trim();

  console.log("\n================ CV DRAFT ================\n");
  console.log(cvDraft);

  console.log("\n============ COVER LETTER DRAFT ==========\n");
  console.log(coverLetterDraft);

  console.log("\n============== RAW BUNDLE ================\n");
  console.log(JSON.stringify(bundle, null, 2));
}

main().catch((error) => {
  console.error("Draft preview runner failed");
  console.error(error);
});