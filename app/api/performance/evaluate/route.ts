import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type EvaluationScope = "individual" | "collective" | "mixed";

type EvaluationRequest = {
  scope?: EvaluationScope;
  runId?: string;
  runIds?: string[];
  lastN?: number;
  domain?: string | null;
};

type SignalBuckets = {
  roleSignals: string[];
  senioritySignals: string[];
  responsibilitySignals: string[];
  skillToolSignals: string[];
  standardsSignals: string[];
  achievementSignals: string[];
  leadershipSignals: string[];
  educationCertificationSignals: string[];
  languageSignals: string[];
  contextSignals: string[];
};

type SignalAudit = {
  sourceSignals: SignalBuckets;
  jobSignals: SignalBuckets;
  generationSignals: SignalBuckets;
  missingFromGeneration: Record<keyof SignalBuckets, string[]>;
  missingFromJobCoverage: Record<keyof SignalBuckets, string[]>;
  extraInGeneration: Record<keyof SignalBuckets, string[]>;
};

type RunSnapshot = {
  id: string | null;
  clientRunId: string | null;
  domain: string | null;
  outcome: string | null;
  inputType: string | null;
  outputLanguage: string | null;
  jobGeography: string | null;
  jobUrl: string | null;
  normalizedUrl: string | null;
  extractionSource: string | null;
  warnings: string[];
  degradedReasons: string[];
  structuredJob: Record<string, unknown>;
  extractedText: string;
  companyContext: Record<string, unknown>;
  marketSignals: Record<string, unknown>;
  companyResearch: Record<string, unknown>;
  recommendation: Record<string, unknown>;
  finalCvText: string;
  finalCoverLetterText: string;
  telemetry: Record<string, unknown>;
  stageStatuses: Record<string, unknown>;
  stageDurations: Record<string, unknown>;
  createdAt: string | null;
  updatedAt: string | null;
  quickMetrics: {
    structuredSignals: number;
    recommendationSignals: number;
    companySignals: number;
    cvPresent: boolean;
    coverLetterPresent: boolean;
  };
};

const STOPWORDS = new Set([
  "the","and","for","with","you","your","from","that","this","have","will","our","are","is","to",
  "of","in","on","as","a","an","or","by","be","at","we","us","their","they","them","not","all",
  "into","can","may","per","via","also","than","such","within","across","including","support",
  "supports","supporting","ensure","ensuring","responsible","responsibility","experience","years",
  "year","role","position","team","work","working","ability","strong","good","very","using",
  "related","required","preferred","must","should","would","de","en","der","die","das","und",
  "mit","für","auf","im","in","von","zu","den","des","ein","eine","einer","als","oder","bei",
  "ist","sind","wir","sie","er","es","auch","durch","über","unter","mehr","less","plus"
]);

const SENIORITY_TERMS = [
  "intern","junior","specialist","professional","associate","senior","lead","principal","manager",
  "head","director","vp","vice president","chief","officer","cfo","ceo","coo","partner"
];

const LEADERSHIP_TERMS = [
  "lead","led","leading","managed","manager","management","head of","director","owned","ownership",
  "steered","supervised","mentored","coordinated","coordination","stakeholder management"
];

const EDUCATION_TERMS = [
  "bachelor","master","mba","phd","degree","diploma","certification","certificate","licensed",
  "qualification","qualified","cima","acca","cpa","cfa"
];

const LANGUAGE_TERMS = [
  "english","german","deutsch","french","spanish","hindi","japanese","italian","polish","dutch",
  "arabic","mandarin","c1","c2","b2","b1","native","fluent"
];

function asTrimmedString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function clampScore(value: unknown): number | null {
  if (typeof value !== "number" || Number.isNaN(value)) return null;
  return Math.max(0, Math.min(100, Math.round(value * 100) / 100));
}

function countStringSignalsDeep(value: unknown): number {
  if (!value) return 0;

  if (typeof value === "string") {
    return value.trim() ? 1 : 0;
  }

  if (Array.isArray(value)) {
    return value.reduce<number>((sum, item) => sum + countStringSignalsDeep(item), 0);
  }

  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>).reduce<number>(
      (sum, item) => sum + countStringSignalsDeep(item),
      0
    );
  }

  return 0;
}

function uniqueNormalized(values: string[], limit = 25): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const raw of values) {
    const value = raw.replace(/\s+/g, " ").trim();
    if (!value) continue;

    const key = value.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    result.push(value);

    if (result.length >= limit) break;
  }

  return result;
}

function flattenText(value: unknown): string[] {
  if (!value) return [];

  if (typeof value === "string") {
    return value.trim() ? [value] : [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => flattenText(item));
  }

  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>).flatMap((item) =>
      flattenText(item)
    );
  }

  return [];
}

function splitIntoPhrases(text: string): string[] {
  return text
    .split(/[\n\r•·▪●\-\u2022]|(?<=[.!?;:])\s+/)
    .map((part) => part.trim())
    .filter((part) => part.length >= 3);
}

function normalizeToken(token: string): string {
  return token
    .toLowerCase()
    .replace(/[(){}\[\],.;:!?'"`]/g, "")
    .trim();
}

function tokenize(text: string): string[] {
  return text
    .split(/\s+/)
    .map((token) => normalizeToken(token))
    .filter((token) => token.length >= 2 && !STOPWORDS.has(token));
}

function buildNgrams(tokens: string[], minN = 1, maxN = 4): string[] {
  const grams: string[] = [];

  for (let i = 0; i < tokens.length; i += 1) {
    for (let n = minN; n <= maxN; n += 1) {
      const slice = tokens.slice(i, i + n);
      if (slice.length !== n) continue;
      const gram = slice.join(" ");
      if (gram.length < 3) continue;
      grams.push(gram);
    }
  }

  return grams;
}

function selectTopPhrasesFromTexts(texts: string[], limit = 30): string[] {
  const frequency = new Map<string, number>();

  for (const text of texts) {
    const tokens = tokenize(text);
    const grams = buildNgrams(tokens, 1, 3);

    for (const gram of grams) {
      if (gram.length < 3) continue;
      if (STOPWORDS.has(gram)) continue;
      frequency.set(gram, (frequency.get(gram) ?? 0) + 1);
    }
  }

  const ranked = [...frequency.entries()]
    .filter(([gram, count]) => {
      if (count < 2 && gram.split(" ").length === 1) return false;
      if (gram.split(" ").some((part) => STOPWORDS.has(part))) return false;
      return true;
    })
    .sort((a, b) => {
      const byCount = b[1] - a[1];
      if (byCount !== 0) return byCount;
      return b[0].length - a[0].length;
    })
    .map(([gram]) => gram);

  return uniqueNormalized(ranked, limit);
}

function extractCapitalizedOrTechnicalTerms(text: string): string[] {
  const matches =
    text.match(
      /\b([A-Z]{2,}(?:\/[A-Z0-9]+)?|[A-Z][a-zA-Z0-9]+(?:[\/\-][A-Za-z0-9]+)+|[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3}|[A-Za-z]+ ?\d+(?:\.\d+)?)\b/g
    ) ?? [];

  return uniqueNormalized(
    matches.filter((item) => item.length >= 2 && !STOPWORDS.has(item.toLowerCase())),
    30
  );
}

function extractQuantifiedPhrases(texts: string[], limit = 20): string[] {
  const matches: string[] = [];

  for (const text of texts) {
    for (const phrase of splitIntoPhrases(text)) {
      if (/\b\d[\d.,%]*\b/.test(phrase) || /€|\$|£/.test(phrase)) {
        matches.push(phrase);
      }
    }
  }

  return uniqueNormalized(matches, limit);
}

function extractMatchingPhrases(texts: string[], terms: string[], limit = 15): string[] {
  const matches: string[] = [];
  const lowerTerms = terms.map((term) => term.toLowerCase());

  for (const text of texts) {
    for (const phrase of splitIntoPhrases(text)) {
      const lower = phrase.toLowerCase();
      if (lowerTerms.some((term) => lower.includes(term))) {
        matches.push(phrase);
      }
    }
  }

  return uniqueNormalized(matches, limit);
}

function extractLikelyTitles(texts: string[], limit = 15): string[] {
  const candidates: string[] = [];

  for (const text of texts) {
    for (const phrase of splitIntoPhrases(text)) {
      const compact = phrase.replace(/\s+/g, " ").trim();
      if (compact.length < 4 || compact.length > 120) continue;

      const tokens = compact.split(" ");
      const titleLike =
        tokens.length <= 10 &&
        tokens.some((token) => /^[A-Z]/.test(token)) &&
        !/[.!?]/.test(compact);

      if (titleLike) {
        candidates.push(compact);
      }
    }
  }

  return uniqueNormalized(candidates, limit);
}

function buildSignalBucketsFromTexts(params: {
  titleTexts?: string[];
  responsibilityTexts?: string[];
  requirementTexts?: string[];
  allTexts: string[];
}): SignalBuckets {
  const titleTexts = params.titleTexts ?? [];
  const responsibilityTexts = params.responsibilityTexts ?? [];
  const requirementTexts = params.requirementTexts ?? [];
  const allTexts = params.allTexts;

  const allJoined = allTexts.join("\n");

  const roleSignals = uniqueNormalized(
    [
      ...extractLikelyTitles(titleTexts.length ? titleTexts : allTexts, 12),
      ...selectTopPhrasesFromTexts(titleTexts.length ? titleTexts : allTexts, 12),
    ],
    20
  );

  const senioritySignals = uniqueNormalized(
    [
      ...extractMatchingPhrases(titleTexts.length ? titleTexts : allTexts, SENIORITY_TERMS, 10),
      ...extractMatchingPhrases(allTexts, SENIORITY_TERMS, 10),
    ],
    15
  );

  const responsibilitySignals = uniqueNormalized(
    [
      ...responsibilityTexts.flatMap((text) => splitIntoPhrases(text)),
      ...selectTopPhrasesFromTexts(
        responsibilityTexts.length ? responsibilityTexts : allTexts,
        20
      ),
    ],
    25
  );

  const skillToolSignals = uniqueNormalized(
    [
      ...extractCapitalizedOrTechnicalTerms(allJoined),
      ...selectTopPhrasesFromTexts(requirementTexts.length ? requirementTexts : allTexts, 20),
    ],
    25
  );

  const standardsSignals = uniqueNormalized(
    extractCapitalizedOrTechnicalTerms(allJoined).filter(
      (term) =>
        /[A-Z]{2,}/.test(term) ||
        /\d/.test(term) ||
        term.includes("/") ||
        term.includes("-")
    ),
    20
  );

  const achievementSignals = uniqueNormalized(extractQuantifiedPhrases(allTexts, 15), 15);

  const leadershipSignals = uniqueNormalized(
    extractMatchingPhrases(allTexts, LEADERSHIP_TERMS, 15),
    15
  );

  const educationCertificationSignals = uniqueNormalized(
    [
      ...extractMatchingPhrases(allTexts, EDUCATION_TERMS, 15),
      ...extractCapitalizedOrTechnicalTerms(allJoined).filter((term) =>
        /\b(cert|certification|certificate|degree|mba|bachelor|master|diploma|qualification)\b/i.test(
          term
        )
      ),
    ],
    15
  );

  const languageSignals = uniqueNormalized(
    extractMatchingPhrases(allTexts, LANGUAGE_TERMS, 15),
    15
  );

  const contextSignals = uniqueNormalized(
    [
      ...selectTopPhrasesFromTexts(allTexts, 20),
      ...extractCapitalizedOrTechnicalTerms(allJoined),
    ],
    20
  );

  return {
    roleSignals,
    senioritySignals,
    responsibilitySignals,
    skillToolSignals,
    standardsSignals,
    achievementSignals,
    leadershipSignals,
    educationCertificationSignals,
    languageSignals,
    contextSignals,
  };
}

function diffByNormalization(source: string[], target: string[]): string[] {
  const targetSet = new Set(target.map((item) => item.toLowerCase()));
  return source.filter((item) => !targetSet.has(item.toLowerCase()));
}

function inferDomainLabel(run: any): string | null {
  const structuredJob = run?.structured_job_json;
  const title =
    asTrimmedString(structuredJob?.jobTitle) ??
    asTrimmedString(structuredJob?.title) ??
    null;

  if (title) return title;

  const recommendation = run?.application_recommendation_json;
  const role =
    asTrimmedString(recommendation?.targetRole) ??
    asTrimmedString(recommendation?.headline) ??
    null;

  if (role) return role;

  return null;
}

function buildWorkspaceSnapshot(workspace: any) {
  const docs = Array.isArray(workspace?.documents_json) ? workspace.documents_json : [];

  return {
    profile:
      workspace?.profile_json && typeof workspace.profile_json === "object"
        ? workspace.profile_json
        : null,
    documents: docs.map((doc: any) => ({
      fileName: asTrimmedString(doc?.fileName) ?? "document",
      kind: asTrimmedString(doc?.kind) ?? "other",
      description: asTrimmedString(doc?.description),
      isPrimary: Boolean(doc?.isPrimary),
      text: typeof doc?.text === "string" ? doc.text : "",
    })),
    meta:
      workspace?.meta_json && typeof workspace.meta_json === "object"
        ? workspace.meta_json
        : {},
    createdAt: workspace?.created_at ?? null,
    updatedAt: workspace?.updated_at ?? null,
  };
}

function buildRunSnapshot(run: any): RunSnapshot {
  const structuredJob =
    run?.structured_job_json && typeof run.structured_job_json === "object"
      ? run.structured_job_json
      : {};

  const recommendation =
    run?.application_recommendation_json &&
    typeof run.application_recommendation_json === "object"
      ? run.application_recommendation_json
      : {};

  const companyContext =
    run?.company_context_json && typeof run.company_context_json === "object"
      ? run.company_context_json
      : {};

  const marketSignals =
    run?.market_signals_json && typeof run.market_signals_json === "object"
      ? run.market_signals_json
      : {};

  const companyResearch =
    run?.company_research_json && typeof run.company_research_json === "object"
      ? run.company_research_json
      : {};

  return {
    id: run?.id ?? null,
    clientRunId: run?.client_run_id ?? null,
    domain: inferDomainLabel(run),
    outcome: run?.run_outcome ?? null,
    inputType: run?.input_type ?? null,
    outputLanguage: run?.output_language ?? null,
    jobGeography: run?.job_geography ?? null,
    jobUrl: run?.job_url ?? null,
    normalizedUrl: run?.normalized_url ?? null,
    extractionSource: run?.extraction_source ?? null,
    warnings: Array.isArray(run?.warnings_json) ? run.warnings_json : [],
    degradedReasons: Array.isArray(run?.degraded_reasons_json)
      ? run.degraded_reasons_json
      : [],
    structuredJob,
    extractedText: typeof run?.extracted_text === "string" ? run.extracted_text : "",
    companyContext,
    marketSignals,
    companyResearch,
    recommendation,
    finalCvText: typeof run?.final_cv_text === "string" ? run.final_cv_text : "",
    finalCoverLetterText:
      typeof run?.final_cover_letter_text === "string" ? run.final_cover_letter_text : "",
    telemetry:
      run?.telemetry_json && typeof run.telemetry_json === "object"
        ? run.telemetry_json
        : {},
    stageStatuses:
      run?.stage_statuses_json && typeof run.stage_statuses_json === "object"
        ? run.stage_statuses_json
        : {},
    stageDurations:
      run?.stage_durations_json && typeof run.stage_durations_json === "object"
        ? run.stage_durations_json
        : {},
    createdAt: run?.created_at ?? null,
    updatedAt: run?.updated_at ?? null,
    quickMetrics: {
      structuredSignals: countStringSignalsDeep(run?.structured_job_json),
      recommendationSignals: countStringSignalsDeep(run?.application_recommendation_json),
      companySignals:
        countStringSignalsDeep(run?.company_context_json) +
        countStringSignalsDeep(run?.company_research_json) +
        countStringSignalsDeep(run?.market_signals_json),
      cvPresent: Boolean(
        typeof run?.final_cv_text === "string" && run.final_cv_text.trim()
      ),
      coverLetterPresent: Boolean(
        typeof run?.final_cover_letter_text === "string" &&
          run.final_cover_letter_text.trim()
      ),
    },
  };
}

function buildFeedbackSnapshot(feedbackRows: any[]) {
  const total = feedbackRows.length;
  const averageStars =
    total > 0
      ? Math.round(
          (feedbackRows.reduce<number>(
            (sum, row) => sum + (typeof row?.stars === "number" ? row.stars : 0),
            0
          ) /
            total) *
            100
        ) / 100
      : null;

  return {
    totalEntries: total,
    averageStars,
    entries: feedbackRows.map((row: any) => ({
      id: row?.id ?? null,
      runId: row?.run_id ?? null,
      stage: row?.stage ?? null,
      stars: row?.stars ?? null,
      comment: row?.comment ?? null,
      page: row?.page ?? null,
      stepTimeMs: row?.step_time_ms ?? null,
      createdAt: row?.created_at ?? null,
    })),
  };
}

function buildSignalAudit(workspace: any, runs: RunSnapshot[]): SignalAudit {
  const profileTexts = flattenText(workspace?.profile);
  const documentTexts = Array.isArray(workspace?.documents)
    ? workspace.documents.flatMap((doc: any) => flattenText(doc?.text))
    : [];

  const sourceTexts = [...profileTexts, ...documentTexts];

  const jobTitleTexts = runs.flatMap((run) =>
    flattenText((run.structuredJob as Record<string, unknown>)?.jobTitle ?? null)
  );

  const jobResponsibilityTexts = runs.flatMap((run) => {
    const structuredJob = run.structuredJob as Record<string, unknown>;
    return [
      ...flattenText(structuredJob?.responsibilities),
      ...flattenText(structuredJob?.tasks),
      ...flattenText(structuredJob?.duties),
    ];
  });

  const jobRequirementTexts = runs.flatMap((run) => {
    const structuredJob = run.structuredJob as Record<string, unknown>;
    return [
      ...flattenText(structuredJob?.requirements),
      ...flattenText(structuredJob?.qualifications),
      ...flattenText(structuredJob?.skills),
      ...flattenText(structuredJob?.summary),
      ...flattenText(run.extractedText),
    ];
  });

  const generationTexts = runs.flatMap((run) => [
    run.finalCvText,
    run.finalCoverLetterText,
    ...flattenText(run.recommendation),
  ]);

  const sourceSignals = buildSignalBucketsFromTexts({
    titleTexts: profileTexts,
    responsibilityTexts: sourceTexts,
    requirementTexts: sourceTexts,
    allTexts: sourceTexts,
  });

  const jobSignals = buildSignalBucketsFromTexts({
    titleTexts: jobTitleTexts,
    responsibilityTexts: jobResponsibilityTexts,
    requirementTexts: jobRequirementTexts,
    allTexts: [...jobTitleTexts, ...jobResponsibilityTexts, ...jobRequirementTexts],
  });

  const generationSignals = buildSignalBucketsFromTexts({
    titleTexts: generationTexts,
    responsibilityTexts: generationTexts,
    requirementTexts: generationTexts,
    allTexts: generationTexts,
  });

  const missingFromGeneration: SignalAudit["missingFromGeneration"] = {
    roleSignals: diffByNormalization(sourceSignals.roleSignals, generationSignals.roleSignals),
    senioritySignals: diffByNormalization(
      sourceSignals.senioritySignals,
      generationSignals.senioritySignals
    ),
    responsibilitySignals: diffByNormalization(
      sourceSignals.responsibilitySignals,
      generationSignals.responsibilitySignals
    ),
    skillToolSignals: diffByNormalization(
      sourceSignals.skillToolSignals,
      generationSignals.skillToolSignals
    ),
    standardsSignals: diffByNormalization(
      sourceSignals.standardsSignals,
      generationSignals.standardsSignals
    ),
    achievementSignals: diffByNormalization(
      sourceSignals.achievementSignals,
      generationSignals.achievementSignals
    ),
    leadershipSignals: diffByNormalization(
      sourceSignals.leadershipSignals,
      generationSignals.leadershipSignals
    ),
    educationCertificationSignals: diffByNormalization(
      sourceSignals.educationCertificationSignals,
      generationSignals.educationCertificationSignals
    ),
    languageSignals: diffByNormalization(
      sourceSignals.languageSignals,
      generationSignals.languageSignals
    ),
    contextSignals: diffByNormalization(
      sourceSignals.contextSignals,
      generationSignals.contextSignals
    ),
  };

  const missingFromJobCoverage: SignalAudit["missingFromJobCoverage"] = {
    roleSignals: diffByNormalization(jobSignals.roleSignals, generationSignals.roleSignals),
    senioritySignals: diffByNormalization(
      jobSignals.senioritySignals,
      generationSignals.senioritySignals
    ),
    responsibilitySignals: diffByNormalization(
      jobSignals.responsibilitySignals,
      generationSignals.responsibilitySignals
    ),
    skillToolSignals: diffByNormalization(
      jobSignals.skillToolSignals,
      generationSignals.skillToolSignals
    ),
    standardsSignals: diffByNormalization(
      jobSignals.standardsSignals,
      generationSignals.standardsSignals
    ),
    achievementSignals: diffByNormalization(
      jobSignals.achievementSignals,
      generationSignals.achievementSignals
    ),
    leadershipSignals: diffByNormalization(
      jobSignals.leadershipSignals,
      generationSignals.leadershipSignals
    ),
    educationCertificationSignals: diffByNormalization(
      jobSignals.educationCertificationSignals,
      generationSignals.educationCertificationSignals
    ),
    languageSignals: diffByNormalization(
      jobSignals.languageSignals,
      generationSignals.languageSignals
    ),
    contextSignals: diffByNormalization(
      jobSignals.contextSignals,
      generationSignals.contextSignals
    ),
  };

  const extraInGeneration: SignalAudit["extraInGeneration"] = {
    roleSignals: diffByNormalization(generationSignals.roleSignals, jobSignals.roleSignals),
    senioritySignals: diffByNormalization(
      generationSignals.senioritySignals,
      jobSignals.senioritySignals
    ),
    responsibilitySignals: diffByNormalization(
      generationSignals.responsibilitySignals,
      jobSignals.responsibilitySignals
    ),
    skillToolSignals: diffByNormalization(
      generationSignals.skillToolSignals,
      jobSignals.skillToolSignals
    ),
    standardsSignals: diffByNormalization(
      generationSignals.standardsSignals,
      jobSignals.standardsSignals
    ),
    achievementSignals: diffByNormalization(
      generationSignals.achievementSignals,
      jobSignals.achievementSignals
    ),
    leadershipSignals: diffByNormalization(
      generationSignals.leadershipSignals,
      jobSignals.leadershipSignals
    ),
    educationCertificationSignals: diffByNormalization(
      generationSignals.educationCertificationSignals,
      jobSignals.educationCertificationSignals
    ),
    languageSignals: diffByNormalization(
      generationSignals.languageSignals,
      jobSignals.languageSignals
    ),
    contextSignals: diffByNormalization(
      generationSignals.contextSignals,
      jobSignals.contextSignals
    ),
  };

  return {
    sourceSignals,
    jobSignals,
    generationSignals,
    missingFromGeneration,
    missingFromJobCoverage,
    extraInGeneration,
  };
}

function buildCompressedRunSummary(run: RunSnapshot, signalAudit: SignalAudit) {
  const jobTitle =
    asTrimmedString((run.structuredJob as Record<string, unknown>)?.jobTitle) ??
    asTrimmedString((run.structuredJob as Record<string, unknown>)?.title) ??
    run.domain ??
    "Untitled role";

  return {
    id: run.id,
    jobTitle,
    outcome: run.outcome,
    language: run.outputLanguage,
    warnings: run.warnings,
    degradedReasons: run.degradedReasons,
    quickMetrics: run.quickMetrics,
    missingFromGeneration: {
      roleSignals: signalAudit.missingFromGeneration.roleSignals.slice(0, 5),
      senioritySignals: signalAudit.missingFromGeneration.senioritySignals.slice(0, 5),
      responsibilitySignals: signalAudit.missingFromGeneration.responsibilitySignals.slice(0, 5),
      skillToolSignals: signalAudit.missingFromGeneration.skillToolSignals.slice(0, 5),
      achievementSignals: signalAudit.missingFromGeneration.achievementSignals.slice(0, 5),
    },
    missingFromJobCoverage: {
      roleSignals: signalAudit.missingFromJobCoverage.roleSignals.slice(0, 5),
      senioritySignals: signalAudit.missingFromJobCoverage.senioritySignals.slice(0, 5),
      responsibilitySignals: signalAudit.missingFromJobCoverage.responsibilitySignals.slice(0, 5),
      skillToolSignals: signalAudit.missingFromJobCoverage.skillToolSignals.slice(0, 5),
    },
  };
}

function buildPrompt() {
  return `
You are auditing an AI job application system.

Your job is to compare:
1. candidate source material
2. job requirements and job signals
3. system outputs and final drafts
4. user feedback when available

The signal model is multi-dimensional and domain-agnostic.
You must assess at least:
- role signals
- seniority signals
- responsibility signals
- skill/tool signals
- standards/domain signals
- achievement signals
- leadership signals
- education/certification signals
- language signals
- context signals

Important:
- do not assume any fixed profession
- do not flatter
- be conservative
- penalize missing role alignment
- penalize missing seniority alignment
- penalize missed strong source signals
- penalize final drafts that do not address job requirements
- separate extraction quality, evidence quality, and generation quality

Return STRICT JSON only in this exact shape:

{
  "summary": {
    "scope": "individual | collective | mixed",
    "domain": "string or null",
    "overallAssessment": "string"
  },
  "scores": {
    "overall": 0,
    "extraction": 0,
    "evidence": 0,
    "generation": 0
  },
  "sourceCoverage": {
    "capturedWell": [],
    "missedOrWeak": []
  },
  "signalAudit": {
    "strongSourceSignals": [],
    "missedRoleSignals": [],
    "missedSenioritySignals": [],
    "missedResponsibilitySignals": [],
    "missedSkillSignals": [],
    "missedAchievementSignals": [],
    "extraOrIrrelevantSignals": []
  },
  "stageAssessment": [
    {
      "runId": "",
      "domain": "",
      "strengths": [],
      "weaknesses": [],
      "lostSignals": []
    }
  ],
  "feedbackComparison": {
    "feedbackAvailable": false,
    "averageUserStars": null,
    "alignment": "high | medium | low | unknown",
    "alignmentNotes": []
  },
  "priorityFixes": []
}

Scoring rules:
- use 0 to 100 only
- if job signals are missing already in structured extraction, penalize extraction
- if strong candidate source signals are not selected or not carried forward, penalize evidence
- if final CV or cover letter miss important job or seniority signals, penalize generation
- if feedback is low and the weaknesses support it, note alignment
- if feedback is absent, set alignment to unknown
`;
}

function extractJsonObject(text: string): string {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("AI did not return valid JSON.");
  }
  return text.slice(start, end + 1);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as EvaluationRequest;

    const scope: EvaluationScope =
      body.scope === "collective" || body.scope === "mixed" ? body.scope : "individual";

    const requestedRunId = asTrimmedString(body.runId);
    const requestedRunIds = asStringArray(body.runIds);
    const requestedLastN =
      typeof body.lastN === "number" && Number.isInteger(body.lastN) && body.lastN > 0
        ? Math.min(body.lastN, 10)
        : scope === "collective"
          ? 5
          : 1;

    const requestedDomain = asTrimmedString(body.domain);

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      return NextResponse.json(
        { ok: false, error: authError.message },
        { status: 401 }
      );
    }

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "User not authenticated." },
        { status: 401 }
      );
    }
    const startOfDay = new Date();
startOfDay.setHours(0, 0, 0, 0);

const { count: dailyEvaluationCount, error: dailyEvaluationCountError } =
  await supabaseAdmin
    .from("run_performance_evaluations")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", startOfDay.toISOString());

if (dailyEvaluationCountError) {
  return NextResponse.json(
    { ok: false, error: dailyEvaluationCountError.message },
    { status: 500 }
  );
}

if ((dailyEvaluationCount ?? 0) >= 20) {
  return NextResponse.json(
    {
      ok: false,
      error: "You've used all your evaluation runs for today. Your allowance resets at midnight — come back tomorrow and we'll keep going.",
    },
    { status: 429 }
  );
}

    const workspaceResponse: any = await supabaseAdmin
      .from("candidate_workspaces")
      .select("user_id, profile_json, documents_json, meta_json, created_at, updated_at")
      .eq("user_id", user.id)
      .maybeSingle();

    if (workspaceResponse.error) {
      return NextResponse.json(
        { ok: false, error: workspaceResponse.error.message },
        { status: 500 }
      );
    }

    const workspaceSnapshot = buildWorkspaceSnapshot(workspaceResponse.data ?? null);

    let runsQuery: any = supabaseAdmin
      .from("tailoring_runs")
      .select(
        [
          "id",
          "user_id",
          "client_run_id",
          "structured_job_json",
          "extracted_text",
          "extraction_source",
          "company_context_json",
          "market_signals_json",
          "company_research_json",
          "application_recommendation_json",
          "final_cv_text",
          "final_cover_letter_text",
          "output_language",
          "warnings_json",
          "run_outcome",
          "degraded_reasons_json",
          "telemetry_json",
          "stage_statuses_json",
          "stage_durations_json",
          "job_url",
          "normalized_url",
          "input_type",
          "job_geography",
          "created_at",
          "updated_at",
        ].join(", ")
      )
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    if (scope === "individual") {
      if (!requestedRunId) {
        return NextResponse.json(
          { ok: false, error: "runId is required for individual evaluation." },
          { status: 400 }
        );
      }
      runsQuery = runsQuery.eq("id", requestedRunId);
    } else if (requestedRunIds.length > 0) {
      runsQuery = runsQuery.in("id", requestedRunIds);
    } else {
      runsQuery = runsQuery.limit(requestedLastN);
    }

    const runsResponse: any = await runsQuery;

    if (runsResponse.error) {
      return NextResponse.json(
        { ok: false, error: runsResponse.error.message },
        { status: 500 }
      );
    }

    const rawRuns = Array.isArray(runsResponse.data) ? runsResponse.data : [];

    const runs: RunSnapshot[] = rawRuns
      .filter((run: any) => Boolean(run?.id && run?.user_id))
      .map((run: any) => buildRunSnapshot(run))
      .filter((run: RunSnapshot) => {
        if (!requestedDomain) return true;
        const domain = (run.domain ?? "").toLowerCase();
        return domain.includes(requestedDomain.toLowerCase());
      });

    if (!runs.length) {
      return NextResponse.json(
        { ok: false, error: "No tailoring runs found for evaluation." },
        { status: 404 }
      );
    }

    const runIds: string[] = [];
    for (const run of runs) {
      if (run.id) {
        runIds.push(run.id);
      }
    }

    const feedbackResponse: any = await supabaseAdmin
      .from("user_feedback")
      .select("id, run_id, stage, stars, comment, page, step_time_ms, created_at")
      .eq("user_id", user.id)
      .in("run_id", runIds);

    if (feedbackResponse.error) {
      return NextResponse.json(
        { ok: false, error: feedbackResponse.error.message },
        { status: 500 }
      );
    }

    const feedbackRows = Array.isArray(feedbackResponse.data) ? feedbackResponse.data : [];
    const feedbackSnapshot = buildFeedbackSnapshot(feedbackRows);
    const signalAudit = buildSignalAudit(workspaceSnapshot, runs);

    const evaluationPayload =
      scope === "individual"
        ? {
            scope,
            domain: requestedDomain,
            workspace: workspaceSnapshot,
            runs,
            feedback: feedbackSnapshot,
            signalAudit,
          }
        : {
            scope,
            domain: requestedDomain,
            workspace: {
              createdAt: workspaceSnapshot.createdAt,
              updatedAt: workspaceSnapshot.updatedAt,
              profilePresent: Boolean(workspaceSnapshot.profile),
              documentCount: Array.isArray(workspaceSnapshot.documents)
                ? workspaceSnapshot.documents.length
                : 0,
            },
            runs: runs.map((run: RunSnapshot) => buildCompressedRunSummary(run, signalAudit)),
            feedback: {
              totalEntries: feedbackSnapshot.totalEntries,
              averageStars: feedbackSnapshot.averageStars,
            },
            signalAudit,
          };

    const completion: any = await Promise.race([
      openai.chat.completions.create({
        model: "gpt-4.1",
        temperature: 0,
        messages: [
          {
            role: "system",
            content: buildPrompt(),
          },
          {
            role: "user",
            content: JSON.stringify(evaluationPayload),
          },
        ],
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Evaluation timeout")), 20000)
      ),
    ]);

    const content = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(extractJsonObject(content)) as any;

    const overallScore = clampScore(parsed?.scores?.overall);
    const extractionScore = clampScore(parsed?.scores?.extraction);
    const evidenceScore = clampScore(parsed?.scores?.evidence);
    const generationScore = clampScore(parsed?.scores?.generation);

    const storeResponse: any = await supabaseAdmin
      .from("run_performance_evaluations")
      .insert({
        user_id: user.id,
        evaluation_scope: scope,
        run_ids_json: runIds,
        domain_label: requestedDomain,
        evaluation_json: parsed,
        overall_score: overallScore,
        extraction_score: extractionScore,
        evidence_score: evidenceScore,
        generation_score: generationScore,
      })
      .select(
        "id, evaluation_scope, run_ids_json, domain_label, overall_score, extraction_score, evidence_score, generation_score, created_at"
      )
      .single();

    if (storeResponse.error) {
      return NextResponse.json(
        { ok: false, error: storeResponse.error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      evaluation: parsed,
      record: storeResponse.data,
      meta: {
        evaluatedRunCount: runIds.length,
        feedbackEntries: feedbackSnapshot.totalEntries,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unexpected error.",
      },
      { status: 500 }
    );
  }
}