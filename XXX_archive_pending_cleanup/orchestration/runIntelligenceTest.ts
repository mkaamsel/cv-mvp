import { IntelligenceCore } from "./core/intelligenceCore";
import { registerModules } from "./registry/registerModules";

async function main() {
  const core = new IntelligenceCore();

  registerModules(core);

  const bundle = await core.run({
    applicationId: "test-application-001",
    outputLanguage: "en",
    candidateInput: {
      rawText: `
Manoj Agarwal
Senior finance and accounting professional with experience in R2R,
IFRS, HGB, reporting, controls, process improvement and SAP environments.
      `.trim(),
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
      `.trim(),
    },
  });

  console.log(JSON.stringify(bundle, null, 2));
}

main().catch((error) => {
  console.error("Intelligence test runner failed");
  console.error(error);
});