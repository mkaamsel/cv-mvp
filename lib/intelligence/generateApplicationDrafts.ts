import type { ApplicationIntelligenceBundle } from "../../types/applicationIntelligenceBundle";

function unique(items: string[]): string[] {
  return Array.from(new Set(items.map((item) => item.trim()).filter(Boolean)));
}

function bulletList(items: string[], max = 6): string {
  return unique(items)
    .slice(0, max)
    .map((item) => `- ${item}`)
    .join("\n");
}

function buildEnglishCv(bundle: ApplicationIntelligenceBundle): string {
  const candidate = bundle.layers.candidate?.payload as any;
  const job = bundle.layers.job?.payload as any;
  const requiredProfile = bundle.layers.requiredProfile?.payload as any;

  return `
MANOJ AGARWAL

Target Role
${job?.title ?? "Target role not available"}

Location
${job?.location ?? "Not specified"}

Professional Summary
${candidate?.summary ?? "Candidate summary not available."}

Relevant Strengths
${bulletList(
  [
    ...(candidate?.skillSignals ?? []),
    ...(requiredProfile?.mustHaves ?? [])
  ],
  6
)}

Role Alignment Highlights
${bulletList(
  [
    ...(job?.responsibilities ?? []),
    ...(requiredProfile?.shouldHaves ?? [])
  ],
  6
)}
  `.trim();
}

function buildGermanCv(bundle: ApplicationIntelligenceBundle): string {
  const candidate = bundle.layers.candidate?.payload as any;
  const job = bundle.layers.job?.payload as any;
  const requiredProfile = bundle.layers.requiredProfile?.payload as any;

  return `
MANOJ AGARWAL

Zielposition
${job?.title ?? "Zielposition nicht verfügbar"}

Standort
${job?.location ?? "Nicht angegeben"}

Kurzprofil
${candidate?.summary ?? "Kandidatenprofil nicht verfügbar."}

Relevante Stärken
${bulletList(
  [
    ...(candidate?.skillSignals ?? []),
    ...(requiredProfile?.mustHaves ?? [])
  ],
  6
)}

Passende Anknüpfungspunkte
${bulletList(
  [
    ...(job?.responsibilities ?? []),
    ...(requiredProfile?.shouldHaves ?? [])
  ],
  6
)}
  `.trim();
}

function buildEnglishCoverLetter(bundle: ApplicationIntelligenceBundle): string {
  const job = bundle.layers.job?.payload as any;

  return `
Dear Hiring Team,

I am applying for the ${job?.title ?? "position"} role${job?.location ? ` in ${job.location}` : ""}.

My background is rooted in finance and accounting, with experience across R2R, IFRS, HGB, reporting, controls, process improvement and SAP-linked environments. This aligns well with the core needs of your role, particularly around closing activities, general ledger accuracy, reconciliations, audit coordination and process discipline.

What makes this opportunity particularly relevant is the overlap between your requirements and the areas where I can contribute from day one: strong accounting grounding, exposure to HGB and IFRS, structured reporting work, and support for robust finance processes and internal controls.

I would welcome the opportunity to contribute this experience to your team and discuss how my background can support the goals of the role.

Kind regards,
Manoj Agarwal
  `.trim();
}

function buildGermanCoverLetter(bundle: ApplicationIntelligenceBundle): string {
  const job = bundle.layers.job?.payload as any;

  return `
Sehr geehrte Damen und Herren,

hiermit bewerbe ich mich um die Position als ${job?.title ?? "Mitarbeiter/in"}${job?.location ? ` in ${job.location}` : ""}.

Mein beruflicher Hintergrund liegt im Finanz- und Rechnungswesen mit Erfahrung in R2R, IFRS, HGB, Reporting, Kontrollen, Prozessverbesserungen und SAP-nahen Umfeldern. Dadurch bringe ich eine solide Grundlage für die Anforderungen dieser Position mit, insbesondere im Zusammenhang mit Abschlussprozessen, Hauptbuch, Abstimmungen, Audit-Unterstützung und belastbaren Finanzprozessen.

Besonders passend erscheint mir diese Position, weil sich Ihre Anforderungen in wesentlichen Punkten mit meinem fachlichen Profil überschneiden: fundierte Accounting-Erfahrung, Berührungspunkte mit HGB und IFRS, strukturierte Reporting-Arbeit sowie ein klarer Fokus auf saubere Prozesse und interne Kontrollen.

Über die Gelegenheit, mich und meinen Beitrag zu dieser Position in einem persönlichen Gespräch näher vorzustellen, würde ich mich sehr freuen.

Mit freundlichen Grüßen
Manoj Agarwal
  `.trim();
}

export function generateApplicationDrafts(
  bundle: ApplicationIntelligenceBundle,
  outputLanguage: "en" | "de"
) {
  const cv =
    outputLanguage === "de"
      ? buildGermanCv(bundle)
      : buildEnglishCv(bundle);

  const coverLetter =
    outputLanguage === "de"
      ? buildGermanCoverLetter(bundle)
      : buildEnglishCoverLetter(bundle);

  return {
    cv,
    coverLetter
  };
}