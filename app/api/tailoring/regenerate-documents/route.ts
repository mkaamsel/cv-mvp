import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { buildGenerateCoverLetterInstructions } from "@/lib/prompts/generateCoverLetterPrompt";
import { buildGenerateCvInstructions } from "@/lib/prompts/generateCvPrompt";
import { detectLanguage, type SupportedLanguage } from "@/lib/profile/languageDetection";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";

type OutputLanguage = "de" | "en" | "es";

type RegenerateDocumentsRequest = {
  outputLanguage?: string;
  bundle?: Record<string, unknown> | null;
  runId?: string;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value.trim() : null;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeLanguage(value: unknown): OutputLanguage {
  if (value === "de") return "de";
  if (value === "es") return "es";
  return "en";
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9aeiouu+#/.]+/i)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3);
}

function scoreOverlap(a: string, b: string): number {
  const tokensA = new Set(tokenize(a));
  const tokensB = tokenize(b);
  if (tokensA.size === 0 || tokensB.length === 0) return 0;
  let matches = 0;
  for (const token of tokensB) {
    if (tokensA.has(token)) matches += 1;
  }
  return matches;
}

function containsAny(text: string, needles: string[]): boolean {
  const haystack = text.toLowerCase();
  return needles.some((needle) => haystack.includes(needle.toLowerCase()));
}

function dedupeStrings(items: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of items) {
    const key = item.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }
  return result;
}

async function callAiText(systemInstruction: string, userPayload: string): Promise<string | null> {
  if (!openai) return null;
  try {
    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      temperature: 0.4,
      messages: [
        { role: "system", content: systemInstruction },
        { role: "user", content: userPayload },
      ],
    });
    const content = response.choices[0]?.message?.content?.trim() ?? "";
    return content || null;
  } catch {
    return null;
  }
}

function toSupportedLanguage(outputLanguage: OutputLanguage): SupportedLanguage {
  return outputLanguage;
}

async function enforceOutputLanguage(
  text: string,
  outputLanguage: OutputLanguage,
  documentType: "cv" | "cover_letter",
): Promise<string> {
  const detected = detectLanguage(text);
  if (detected === toSupportedLanguage(outputLanguage)) {
    return text;
  }

  const languageName =
    outputLanguage === "de" ? "German" : outputLanguage === "es" ? "Spanish" : "English";
  const docLabel = documentType === "cv" ? "CV" : "cover letter";

  const rewritten = await callAiText(
    [
      `Rewrite the following ${docLabel} into ${languageName}.`,
      "Keep facts, evidence, scope, chronology, and meaning unchanged.",
      "Do not invent information.",
      "Do not remove material evidence.",
      "Return plain text only.",
    ].join("\n"),
    text,
  );

  if (!rewritten) {
    return text;
  }

  const rewrittenDetected = detectLanguage(rewritten);
  return rewrittenDetected === toSupportedLanguage(outputLanguage) ? rewritten : text;
}

function getCandidateRoleLines(candidateProfile: Record<string, unknown> | null): string[] {
  if (!candidateProfile) return [];
  const roles = Array.isArray(candidateProfile.roles)
    ? candidateProfile.roles
    : Array.isArray(candidateProfile.experience)
      ? candidateProfile.experience
      : [];
  return roles
    .map((item) => {
      const role = asRecord(item);
      if (!role) return null;
      const title = asString(role.title) ?? "";
      const company = asString(role.company) ?? "";
      const achievements = asStringArray(role.achievements);
      const responsibilities = asStringArray(role.responsibilities);
      const header = [title, company].filter(Boolean).join(" at ").trim();
      if (!header && achievements.length === 0 && responsibilities.length === 0) {
        return null;
      }
      return [header, ...responsibilities, ...achievements].filter(Boolean).join(" - ");
    })
    .filter((item): item is string => Boolean(item));
}

function buildCvFallback(bundle: Record<string, unknown>, language: OutputLanguage): string {
  const candidateProfile = asRecord(bundle.candidateProfile);
  const summary =
    asString(candidateProfile?.summary) ??
    asString(candidateProfile?.headline) ??
    "Experienced professional with relevant background for the target role.";
  const selectedEvidence = asRecord(bundle.selectedEvidence);
  const evidence = asStringArray(selectedEvidence?.combinedTopEvidence).slice(0, 8);
  const roleLines = getCandidateRoleLines(candidateProfile).slice(0, 4);
  const evidenceHeading =
    language === "de"
      ? "Relevante Nachweise fuer diese Rolle:"
      : language === "es"
        ? "Evidencia relevante para este puesto:"
        : "Relevant evidence for this role:";
  const highlightsHeading =
    language === "de"
      ? "Karriere-Highlights:"
      : language === "es"
        ? "Logros profesionales:"
        : "Career highlights:";
  const evidenceFallbackItem =
    language === "de"
      ? "- Rollenrelevante Nachweise muessen weiter verfeinert werden."
      : language === "es"
        ? "- La evidencia alineada con el puesto necesita mas precision."
        : "- Role-aligned evidence still needs refinement.";
  const highlightsFallbackItem =
    language === "de"
      ? "- Noch keine Rollen-Highlights verfuegbar."
      : language === "es"
        ? "- Todavia no hay logros de puesto disponibles."
        : "- No role highlights available yet.";
  return [
    summary,
    "",
    evidenceHeading,
    ...(evidence.length ? evidence.map((item) => `- ${item}`) : [evidenceFallbackItem]),
    "",
    highlightsHeading,
    ...(roleLines.length ? roleLines.map((item) => `- ${item}`) : [highlightsFallbackItem]),
  ].join("\n");
}

function buildCoverLetterFallback(bundle: Record<string, unknown>, language: OutputLanguage): string {
  const candidateProfile = asRecord(bundle.candidateProfile);
  const structuredJob = asRecord(bundle.structuredJob);
  const selectedEvidence = asRecord(bundle.selectedEvidence);
  const roleLabel = asString(structuredJob?.jobTitle) || (language === "de" ? "die Position" : "the role");
  const companyLabel = asString(structuredJob?.companyName) || (language === "de" ? "dem Unternehmen" : "the organisation");
  const name = asString(candidateProfile?.fullName) ?? "Candidate";
  const evidence = asStringArray(selectedEvidence?.combinedTopEvidence).slice(0, 3).join(", ");

  if (language === "de") {
    return [
      `Bewerbung als ${roleLabel}`,
      "",
      "Sehr geehrte Damen und Herren,",
      "",
      `ich sehe eine glaubwuerdige Verbindung zwischen meinem Profil und der Rolle${asString(structuredJob?.companyName) ? ` bei ${companyLabel}` : ""}.`,
      evidence ? `Besonders relevant erscheinen dabei ${evidence}.` : "Die staerksten Anschlussfaehigkeiten werden im CV fokussiert dargestellt.",
      "",
      "Ich freue mich auf ein Gespraech.",
      "",
      `Mit freundlichen Gruessen\n${name}`,
    ].join("\n");
  }

  if (language === "es") {
    return [
      `Solicitud para ${roleLabel}`,
      "",
      "Estimado equipo de seleccion,",
      "",
      `veo una conexion creible entre mi experiencia y esta oportunidad${asString(structuredJob?.companyName) ? ` en ${companyLabel}` : ""}.`,
      evidence ? `Los puntos de mayor alineacion son ${evidence}.` : "En el CV priorizo la evidencia mas relevante para el puesto.",
      "",
      "Quedo a disposicion para ampliar detalles.",
      "",
      `Atentamente,\n${name}`,
    ].join("\n");
  }

  return [
    `Application for ${roleLabel}`,
    "",
    "Dear Hiring Team,",
    "",
    `I see a credible connection between my background and this opportunity${asString(structuredJob?.companyName) ? ` at ${companyLabel}` : ""}.`,
    evidence ? `The strongest alignment points currently appear to be ${evidence}.` : "I focus on the strongest role-relevant evidence in the CV.",
    "",
    "I would welcome the opportunity to discuss this further.",
    "",
    `Kind regards,\n${name}`,
  ].join("\n");
}

function extractJobKeywords(structuredJob: Record<string, unknown> | null): string[] {
  const tokens = tokenize(
    [
      asString(structuredJob?.jobTitle) ?? "",
      asString(structuredJob?.summary) ?? "",
      ...asStringArray(structuredJob?.responsibilities),
      ...asStringArray(structuredJob?.requirements),
    ].join(" "),
  );
  return Array.from(new Set(tokens)).slice(0, 20);
}

function deriveCompanyTone(bundle: Record<string, unknown>): string {
  const companyContext = asRecord(bundle.companyContext);
  const companyResearch = asRecord(bundle.companyResearch);
  const marketSignals = asRecord(bundle.marketSignals);
  const signals = [
    asString(companyContext?.environmentSummary) ?? "",
    ...asStringArray(companyResearch?.notes),
    ...asStringArray(marketSignals?.notes),
    asString(marketSignals?.strictnessSignal) ?? "",
  ]
    .join(" ")
    .toLowerCase();

  if (containsAny(signals, ["strict", "regulated", "formal"])) return "formal";
  if (containsAny(signals, ["collaborative", "dynamic", "growth"])) return "dynamic";
  return "professional";
}

function polishLanguageLayer(
  text: string,
  jobKeywords: string[],
  companyTone: string,
  outputLanguage: OutputLanguage,
): string {
  const lines = text
    .split("\n")
    .map((line) => line.replace(/\s{2,}/g, " ").trimEnd());
  const polished = lines.map((line) => {
    const trimmed = line.trim();
    if (!trimmed) return "";
    let next = trimmed;
    next = next.replace(/\s+,/g, ",");
    next = next.replace(/\s+\./g, ".");
    if (/^[a-z]/.test(next)) {
      next = next[0].toUpperCase() + next.slice(1);
    }
    return next;
  });
  const keywordCoverage = jobKeywords.filter((keyword) =>
    polished.join(" ").toLowerCase().includes(keyword.toLowerCase()),
  );
  if (outputLanguage === "en" && companyTone === "formal" && keywordCoverage.length > 0) {
    return polished.join("\n").replace(/Dear Hiring Team,/g, "Dear Hiring Team,");
  }
  return polished.join("\n");
}

function downgradeExaggeratedClaim(line: string): string {
  let next = line;
  next = next.replace(/\bled consolidated reporting\b/gi, "supported consolidated reporting activities");
  next = next.replace(/\bdeveloped accounting policies\b/gi, "contributed to accounting policies or SOPs");
  next = next.replace(/\bled\b/gi, "supported");
  next = next.replace(/\bowned\b/gi, "supported");
  next = next.replace(/\bspearheaded\b/gi, "contributed to");
  next = next.replace(/\bdrove\b/gi, "supported");
  return next;
}

type TruthLayerReport = {
  cv: { kept: string[]; softened: string[]; removed: string[] };
  coverLetter: { kept: string[]; softened: string[]; removed: string[] };
};

function validateTruthLayer(
  cvDraft: string,
  coverLetterDraft: string,
  bundle: Record<string, unknown>,
): { correctedCv: string; correctedCoverLetter: string; truthReport: TruthLayerReport } {
  const candidateProfile = asRecord(bundle.candidateProfile);
  const selectedEvidence = asRecord(bundle.selectedEvidence);
  const candidateClarifications = asRecord(bundle.candidateClarifications);
  const clarificationSignals = Array.isArray(candidateClarifications?.signals)
    ? candidateClarifications.signals
    : [];
  const clarificationLabels = clarificationSignals
    .map((signal) => asString(asRecord(signal)?.label))
    .filter((item): item is string => Boolean(item));

  const highEvidence = dedupeStrings([
    ...getCandidateRoleLines(candidateProfile),
    ...asStringArray(selectedEvidence?.strongEvidence),
    ...asStringArray(selectedEvidence?.supportEvidence).filter(
      (item) => !item.toLowerCase().startsWith("user clarification:"),
    ),
  ]);
  const mediumEvidence = dedupeStrings([
    ...asStringArray(selectedEvidence?.clarificationEvidenceUsed),
    ...clarificationLabels,
  ]);

  const applyToDocument = (text: string) => {
    const lines = text.split("\n");
    const kept: string[] = [];
    const softened: string[] = [];
    const removed: string[] = [];
    const corrected = lines
      .map((line) => {
        const trimmed = line.trim();
        if (!trimmed) return line;
        const lower = trimmed.toLowerCase();
        const hasExaggerationVerb = /\b(led|owned|spearheaded|drove|transformed)\b/i.test(trimmed);
        if (!hasExaggerationVerb) {
          kept.push(trimmed);
          return line;
        }
        const hasHigh = highEvidence.some((item) => scoreOverlap(item, trimmed) >= 2);
        const hasMedium = mediumEvidence.some((item) => scoreOverlap(item, trimmed) >= 2);
        const includesProtectedAtsKeyword = containsAny(lower, [
          "ifrs",
          "sap",
          "excel",
          "spreadsheet",
          "pivot",
          "xlookup",
          "xverweis",
          "vlookup",
          "sop",
          "guideline",
          "policy",
        ]);
        if (hasHigh || includesProtectedAtsKeyword) {
          kept.push(trimmed);
          return line;
        }
        if (hasMedium) {
          softened.push(trimmed);
          return downgradeExaggeratedClaim(line);
        }
        softened.push(trimmed);
        return downgradeExaggeratedClaim(line);
      })
      .filter((line) => line !== "");
    return { corrected: corrected.join("\n"), report: { kept, softened, removed } };
  };

  const cv = applyToDocument(cvDraft);
  const coverLetter = applyToDocument(coverLetterDraft);
  return {
    correctedCv: cv.corrected,
    correctedCoverLetter: coverLetter.corrected,
    truthReport: {
      cv: cv.report,
      coverLetter: coverLetter.report,
    },
  };
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      return NextResponse.json({ ok: false, message: authError.message }, { status: 401 });
    }
    if (!user) {
      return NextResponse.json({ ok: false, message: "User not authenticated." }, { status: 401 });
    }

    const body = (await req.json()) as RegenerateDocumentsRequest;
    const bundle = asRecord(body.bundle);
    if (!bundle) {
      return NextResponse.json(
        { ok: false, message: "Missing intelligence bundle for document regeneration." },
        { status: 422 },
      );
    }

    const outputLanguage = normalizeLanguage(body.outputLanguage);
    const structuredJob = asRecord(bundle.structuredJob);
    const positioningBrief = asRecord(bundle.positioningBrief);
    const applicationStrategy = asRecord(positioningBrief?.applicationStrategy);

    let cvDraft = buildCvFallback(bundle, outputLanguage);
    let coverLetterDraft = buildCoverLetterFallback(bundle, outputLanguage);

    const generationPayload = JSON.stringify(
      {
        candidateProfile: asRecord(bundle.candidateProfile),
        candidateClarifications: asRecord(bundle.candidateClarifications),
        bundle,
      },
      null,
      2,
    );

    const aiCvDraft = await callAiText(
      buildGenerateCvInstructions(
        outputLanguage,
        "Strong polished professional",
        null,
        {
          cvLeadEvidence: asStringArray(applicationStrategy?.cvLeadEvidence),
          coverLetterOpeningAngle: asString(applicationStrategy?.coverLetterOpeningAngle) ?? "",
          gapHandling: asStringArray(applicationStrategy?.gapHandling),
          confidenceLevel:
            asString(applicationStrategy?.confidenceLevel) === "careful"
              ? "careful"
              : asString(applicationStrategy?.confidenceLevel) === "assured"
                ? "assured"
                : "confident",
          toneGuidance: asStringArray(applicationStrategy?.toneGuidance),
          priorityThemes: asStringArray(applicationStrategy?.priorityThemes),
          doNotOverclaim: asStringArray(applicationStrategy?.doNotOverclaim),
        },
      ),
      generationPayload,
    );
    if (aiCvDraft) {
      cvDraft = aiCvDraft;
    }

    const aiCoverLetter = await callAiText(
      buildGenerateCoverLetterInstructions(
        outputLanguage,
        "Strong polished professional",
        null,
        {
          cvLeadEvidence: asStringArray(applicationStrategy?.cvLeadEvidence),
          coverLetterOpeningAngle: asString(applicationStrategy?.coverLetterOpeningAngle) ?? "",
          gapHandling: asStringArray(applicationStrategy?.gapHandling),
          confidenceLevel:
            asString(applicationStrategy?.confidenceLevel) === "careful"
              ? "careful"
              : asString(applicationStrategy?.confidenceLevel) === "assured"
                ? "assured"
                : "confident",
          toneGuidance: asStringArray(applicationStrategy?.toneGuidance),
          priorityThemes: asStringArray(applicationStrategy?.priorityThemes),
          doNotOverclaim: asStringArray(applicationStrategy?.doNotOverclaim),
        },
      ),
      generationPayload,
    );
    if (aiCoverLetter) {
      coverLetterDraft = aiCoverLetter;
    }

    const truthResult = validateTruthLayer(cvDraft, coverLetterDraft, bundle);
    cvDraft = truthResult.correctedCv;
    coverLetterDraft = truthResult.correctedCoverLetter;

    const jobKeywords = extractJobKeywords(structuredJob);
    const companyTone = deriveCompanyTone(bundle);
    cvDraft = polishLanguageLayer(cvDraft, jobKeywords, companyTone, outputLanguage);
    coverLetterDraft = polishLanguageLayer(
      coverLetterDraft,
      jobKeywords,
      companyTone,
      outputLanguage,
    );

    cvDraft = await enforceOutputLanguage(cvDraft, outputLanguage, "cv");
    coverLetterDraft = await enforceOutputLanguage(
      coverLetterDraft,
      outputLanguage,
      "cover_letter",
    );

    if (
      detectLanguage(cvDraft) !== toSupportedLanguage(outputLanguage) ||
      detectLanguage(coverLetterDraft) !== toSupportedLanguage(outputLanguage)
    ) {
      return NextResponse.json(
        {
          ok: false,
          message: "Regeneration could not reliably produce both documents in the selected language.",
        },
        { status: 500 },
      );
    }

    if (!cvDraft.trim() || !coverLetterDraft.trim()) {
      return NextResponse.json(
        {
          ok: false,
          message: "Regeneration returned incomplete documents.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      outputLanguage,
      cvText: cvDraft,
      coverLetterText: coverLetterDraft,
      finalDrafts: {
        cvDraft,
        coverLetterDraft,
        finalCv: cvDraft,
        finalCoverLetter: coverLetterDraft,
        outputLanguage,
        status: "ready",
        runId: body.runId ?? "",
        warnings: [],
        reviewFindings: {
          truthLayer: truthResult.truthReport,
        },
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Document regeneration failed.",
      },
      { status: 500 },
    );
  }
}
