import type { ApplicationIntelligenceBundle } from "../../../types/applicationIntelligenceBundle";
import { generateCvDraft } from "@/lib/generation/cvDraftGenerator";
import { reviewDraft } from "@/lib/generation/generationReviewModule";
import { polishDocument } from "@/lib/generation/generationPolishModule";

function buildEnglishCoverLetter(bundle: ApplicationIntelligenceBundle): string {
  const job = bundle.layers.job?.payload as any;
  const recommendation = bundle.layers.recommendation?.payload as any;
  const positioningBrief = bundle.layers.positioningBrief?.payload as any;

  return `
Dear Hiring Team,

I am applying for the ${job?.title ?? "position"} role${job?.location ? ` in ${job.location}` : ""}.

What makes this opportunity compelling is the overlap between the role requirements and the parts of my background that are most immediately relevant. ${
    positioningBrief?.coverLetterAngle ??
    "My experience combines accounting depth, structured reporting, and process discipline in demanding finance environments."
  }

I would bring a practical, evidence-based contribution to this role, particularly in areas such as ${
    Array.isArray(recommendation?.strongMatches) && recommendation.strongMatches.length
      ? recommendation.strongMatches.slice(0, 3).join(", ")
      : "accounting delivery, reporting quality, and finance process reliability"
  }.

I would welcome the opportunity to discuss my background with you in more detail.

Kind regards,
Manoj Agarwal
  `.trim();
}

function buildGermanCoverLetter(bundle: ApplicationIntelligenceBundle): string {
  const job = bundle.layers.job?.payload as any;
  const recommendation = bundle.layers.recommendation?.payload as any;
  const positioningBrief = bundle.layers.positioningBrief?.payload as any;

  return `
Sehr geehrte Damen und Herren,

hiermit bewerbe ich mich um die Position als ${job?.title ?? "Mitarbeiter/in"}${
    job?.location ? ` in ${job.location}` : ""
  }.

An dieser Position spricht mich besonders an, dass sich die Anforderungen der Rolle in wesentlichen Punkten mit den Bereichen decken, in denen ich nachweislich relevante Erfahrung mitbringe. ${
    positioningBrief?.coverLetterAngle ??
    "Mein Hintergrund verbindet fachliche Tiefe im Rechnungswesen mit strukturierter Reporting-Arbeit und belastbaren Prozessen im Finance-Umfeld."
  }

Einen konkreten Mehrwert sehe ich insbesondere in Bereichen wie ${
    Array.isArray(recommendation?.strongMatches) && recommendation.strongMatches.length
      ? recommendation.strongMatches.slice(0, 3).join(", ")
      : "Abschlussnähe, Reporting-Qualität und verlässlichen Finanzprozessen"
  }.

Über die Gelegenheit zu einem persönlichen Gespräch würde ich mich sehr freuen.

Mit freundlichen Grüßen
Manoj Agarwal
  `.trim();
}

export async function generateApplicationDrafts(
  bundle: ApplicationIntelligenceBundle,
  outputLanguage: "en" | "de"
) {
  const normalizedBundle = {
    candidateProfile: bundle.layers.candidate?.payload ?? {},
    structuredJob: bundle.layers.job?.payload ?? {},
    requiredProfile: bundle.layers.requiredProfile?.payload ?? {},
    companyContext: bundle.layers.companyContext?.payload ?? {},
    companyResearch: bundle.layers.companyResearch?.payload ?? {},
    marketSignals: bundle.layers.marketSignals?.payload ?? {},
    selectedEvidence: bundle.layers.selectedEvidence?.payload ?? {},
    positioningBrief: bundle.layers.positioningBrief?.payload ?? {},
    recommendation: bundle.layers.recommendation?.payload ?? {},
    outputLanguage: outputLanguage === "de" ? "German" : "English",
    rawBundle: bundle,
  };

  const cvDraft = await generateCvDraft(normalizedBundle);
  const cvReviewed = await reviewDraft(cvDraft, normalizedBundle);
  const cvPolished = await polishDocument(cvReviewed);

  const coverLetterDraft =
    outputLanguage === "de"
      ? buildGermanCoverLetter(bundle)
      : buildEnglishCoverLetter(bundle);

  const coverLetterReviewed = await reviewDraft(
    coverLetterDraft,
    normalizedBundle
  );
  const coverLetterPolished = await polishDocument(coverLetterReviewed);

  return {
    cv: cvPolished,
    coverLetter: coverLetterPolished,
    debug: {
      cvDraft,
      cvReviewed,
      coverLetterDraft,
      coverLetterReviewed,
    },
  };
}