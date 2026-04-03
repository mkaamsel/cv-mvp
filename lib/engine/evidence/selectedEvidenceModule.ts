type Primitive = string | number | boolean | null | undefined;

type CandidateRecord = Record<string, unknown>;

type EvidenceItem = {
  id: string;
  sourceType:
    | "experience"
    | "project"
    | "certification"
    | "education"
    | "skill"
    | "other";
  sourceLabel: string;
  title?: string;
  organization?: string;
  dateFrom?: string;
  dateTo?: string;
  isCurrent?: boolean;
  summary: string;
  bullets: string[];
  raw: CandidateRecord;
};

type RequiredCompetency = {
  competency: string;
  category?:
    | "domain"
    | "technical"
    | "tool"
    | "education"
    | "language"
    | "behavioural"
    | "stakeholder";
  importance?: "core" | "supporting" | "preferred";
  interpretation?: string;
};

type JobSignals = {
  jobTitle: string;
  responsibilities: string[];
  requirements: string[];
  summarySignals: string[];
  requiredTools: string[];
  requiredLanguages: string[];
  requiredEducation: string[];
  behaviouralSignals: string[];
  stakeholderSignals: string[];
  competencies: RequiredCompetency[];
};

type EvidenceScoreBreakdown = {
  coreCompetencyScore: number;
  supportingCompetencyScore: number;
  responsibilityScore: number;
  requirementScore: number;
  toolScore: number;
  languageScore: number;
  educationScore: number;
  behaviouralScore: number;
  stakeholderScore: number;
  titleAlignmentScore: number;
  recencyScore: number;
  specificityScore: number;
  weakEvidencePenalty: number;
  adjacencyPenalty: number;
  genericPenalty: number;
  finalScore: number;
};

export type SelectedEvidenceItem = {
  id: string;
  sourceType: EvidenceItem["sourceType"];
  sourceLabel: string;
  title?: string;
  organization?: string;
  dateFrom?: string;
  dateTo?: string;
  isCurrent?: boolean;
  summary: string;
  bullets: string[];
  matchedResponsibilities: string[];
  matchedRequirements: string[];
  matchedCoreCompetencies: string[];
  matchedSupportingCompetencies: string[];
  matchedTools: string[];
  matchedLanguages: string[];
  matchedEducation: string[];
  matchedBehaviouralSignals: string[];
  matchedStakeholderSignals: string[];
  score: number;
  scoreBreakdown: EvidenceScoreBreakdown;
};

export type SelectedEvidenceOutput = {
  selectedEvidence: SelectedEvidenceItem[];
  diagnostics: {
    evidencePoolSize: number;
    selectedCount: number;
    droppedLowScoreCount: number;
    deduplicatedCount: number;
  };
};

type RunEvidenceModuleInput = {
  candidateProfile: unknown;
  structuredJob: unknown;
  requiredProfile?: unknown;
  maxEvidenceItems?: number;
};

const STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "been",
  "being",
  "by",
  "for",
  "from",
  "in",
  "into",
  "is",
  "it",
  "its",
  "of",
  "on",
  "or",
  "that",
  "the",
  "their",
  "this",
  "to",
  "was",
  "were",
  "with",
  "within",
  "across",
  "through",
  "using",
  "use",
  "used",
  "work",
  "worked",
  "working",
  "support",
  "supported",
  "responsible",
  "responsibility",
  "experience",
  "experienced",
  "knowledge",
  "skills",
  "skill",
  "ability",
  "good",
  "strong",
  "team",
  "teams",
  "role",
  "roles",
  "und",
  "der",
  "die",
  "das",
  "ein",
  "eine",
  "mit",
  "von",
  "im",
  "in",
  "auf",
  "zu",
  "für",
  "den",
  "dem",
  "des",
  "ist",
  "als",
  "bei",
  "oder",
  "auch",
  "durch",
  "über",
  "unter",
]);

const MIN_TOKEN_LENGTH = 3;
const DEFAULT_MAX_EVIDENCE_ITEMS = 8;

export async function runEvidenceModule({
  candidateProfile,
  structuredJob,
  requiredProfile,
  maxEvidenceItems = DEFAULT_MAX_EVIDENCE_ITEMS,
}: RunEvidenceModuleInput): Promise<SelectedEvidenceOutput> {
  const evidencePool = extractEvidencePool(candidateProfile);
  const jobSignals = extractJobSignals(structuredJob, requiredProfile);

  const scored = evidencePool.map((item) => scoreEvidenceItem(item, jobSignals));

  const filtered = scored.filter((item) => item.score > 0);

  const sorted = filtered.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;

    const bDirect =
      b.matchedCoreCompetencies.length +
      b.matchedResponsibilities.length +
      b.matchedRequirements.length;
    const aDirect =
      a.matchedCoreCompetencies.length +
      a.matchedResponsibilities.length +
      a.matchedRequirements.length;

    if (bDirect !== aDirect) return bDirect - aDirect;

    if (b.scoreBreakdown.specificityScore !== a.scoreBreakdown.specificityScore) {
      return b.scoreBreakdown.specificityScore - a.scoreBreakdown.specificityScore;
    }

    return b.scoreBreakdown.recencyScore - a.scoreBreakdown.recencyScore;
  });

  const deduped = dedupeEvidence(sorted);
  const selectedEvidence = deduped.slice(0, Math.max(1, maxEvidenceItems));

  return {
    selectedEvidence,
    diagnostics: {
      evidencePoolSize: evidencePool.length,
      selectedCount: selectedEvidence.length,
      droppedLowScoreCount: scored.length - filtered.length,
      deduplicatedCount: filtered.length - deduped.length,
    },
  };
}

function scoreEvidenceItem(
  item: EvidenceItem,
  jobSignals: JobSignals
): SelectedEvidenceItem {
  const combinedText = buildCombinedEvidenceText(item);
  const evidenceTokens = tokenize(combinedText);

  const matchedResponsibilities = findStrongMatches(
    combinedText,
    jobSignals.responsibilities
  );
  const matchedRequirements = findStrongMatches(
    combinedText,
    jobSignals.requirements
  );

  const matchedCoreCompetencies = jobSignals.competencies
    .filter((c) => c.importance === "core")
    .map((c) => c.competency)
    .filter((competency) => phraseSimilarity(combinedText, competency) >= 0.62);

  const matchedSupportingCompetencies = jobSignals.competencies
    .filter((c) => c.importance !== "core")
    .map((c) => c.competency)
    .filter((competency) => phraseSimilarity(combinedText, competency) >= 0.62);

  const matchedTools = findStrongMatches(combinedText, jobSignals.requiredTools);
  const matchedLanguages = findStrongMatches(
    combinedText,
    jobSignals.requiredLanguages
  );
  const matchedEducation = findStrongMatches(
    combinedText,
    jobSignals.requiredEducation
  );
  const matchedBehaviouralSignals = findStrongMatches(
    combinedText,
    jobSignals.behaviouralSignals
  );
  const matchedStakeholderSignals = findStrongMatches(
    combinedText,
    jobSignals.stakeholderSignals
  );

  const coreCompetencyScore = weightedCompetencyScore(
    combinedText,
    jobSignals.competencies.filter((c) => c.importance === "core"),
    6
  );

  const supportingCompetencyScore = weightedCompetencyScore(
    combinedText,
    jobSignals.competencies.filter((c) => c.importance !== "core"),
    3
  );

  const responsibilityScore = phraseGroupScore(
    combinedText,
    jobSignals.responsibilities,
    5
  );

  const requirementScore = phraseGroupScore(
    combinedText,
    jobSignals.requirements,
    4
  );

  const toolScore = phraseGroupScore(combinedText, jobSignals.requiredTools, 3.5);
  const languageScore = phraseGroupScore(
    combinedText,
    jobSignals.requiredLanguages,
    2.5
  );
  const educationScore = phraseGroupScore(
    combinedText,
    jobSignals.requiredEducation,
    2
  );
  const behaviouralScore = phraseGroupScore(
    combinedText,
    jobSignals.behaviouralSignals,
    2
  );
  const stakeholderScore = phraseGroupScore(
    combinedText,
    jobSignals.stakeholderSignals,
    2.5
  );

  const titleAlignmentScore = titleAlignment(item, jobSignals.jobTitle);
  const recencyScore = computeRecencyScore(item);
  const specificityScore = computeSpecificityScore(item, evidenceTokens.size);

  const weakEvidencePenalty = computeWeakEvidencePenalty({
    item,
    matchedResponsibilitiesCount: matchedResponsibilities.length,
    matchedRequirementsCount: matchedRequirements.length,
    matchedCoreCompetenciesCount: matchedCoreCompetencies.length,
    evidenceTokenCount: evidenceTokens.size,
  });

  const adjacencyPenalty = computeAdjacencyPenalty({
    coreCompetencyScore,
    responsibilityScore,
    requirementScore,
    titleAlignmentScore,
    toolScore,
    behaviouralScore,
    stakeholderScore,
  });

  const genericPenalty = computeGenericPenalty(item, evidenceTokens.size);

  const rawScore =
    coreCompetencyScore +
    supportingCompetencyScore +
    responsibilityScore +
    requirementScore +
    toolScore +
    languageScore +
    educationScore +
    behaviouralScore +
    stakeholderScore +
    titleAlignmentScore +
    recencyScore +
    specificityScore -
    weakEvidencePenalty -
    adjacencyPenalty -
    genericPenalty;

  const finalScore = round2(Math.max(0, rawScore));

  return {
    id: item.id,
    sourceType: item.sourceType,
    sourceLabel: item.sourceLabel,
    title: item.title,
    organization: item.organization,
    dateFrom: item.dateFrom,
    dateTo: item.dateTo,
    isCurrent: item.isCurrent,
    summary: item.summary,
    bullets: item.bullets,
    matchedResponsibilities,
    matchedRequirements,
    matchedCoreCompetencies,
    matchedSupportingCompetencies,
    matchedTools,
    matchedLanguages,
    matchedEducation,
    matchedBehaviouralSignals,
    matchedStakeholderSignals,
    score: finalScore,
    scoreBreakdown: {
      coreCompetencyScore: round2(coreCompetencyScore),
      supportingCompetencyScore: round2(supportingCompetencyScore),
      responsibilityScore: round2(responsibilityScore),
      requirementScore: round2(requirementScore),
      toolScore: round2(toolScore),
      languageScore: round2(languageScore),
      educationScore: round2(educationScore),
      behaviouralScore: round2(behaviouralScore),
      stakeholderScore: round2(stakeholderScore),
      titleAlignmentScore: round2(titleAlignmentScore),
      recencyScore: round2(recencyScore),
      specificityScore: round2(specificityScore),
      weakEvidencePenalty: round2(weakEvidencePenalty),
      adjacencyPenalty: round2(adjacencyPenalty),
      genericPenalty: round2(genericPenalty),
      finalScore,
    },
  };
}

function extractEvidencePool(candidateProfile: unknown): EvidenceItem[] {
  const profile = asRecord(candidateProfile) ?? {};
  const items: EvidenceItem[] = [];

  const experiences = asArray(profile.experience);
  experiences.forEach((value, index) => {
    const record = asRecord(value);
    if (!record) return;

    const title = firstString(
      record.roleTitle,
      record.title,
      record.position,
      record.jobTitle,
      record.headline
    );
    const organization = firstString(
      record.organization,
      record.company,
      record.employer,
      record.client
    );

    const bullets = collectStrings(
      record.bullets,
      record.highlights,
      record.responsibilities,
      record.achievements,
      record.tasks
    );

    const summary = joinParts(
      firstString(record.summary, record.description, record.overview),
      bullets.join(" ")
    );

    if (!hasSubstance(title, organization, summary, bullets)) return;

    items.push({
      id: `experience-${index}`,
      sourceType: "experience",
      sourceLabel: buildSourceLabel(title, organization, index + 1),
      title,
      organization,
      dateFrom: firstString(record.dateFrom, record.startDate, record.from),
      dateTo: firstString(record.dateTo, record.endDate, record.to),
      isCurrent: Boolean(record.isCurrent),
      summary,
      bullets,
      raw: record,
    });
  });

  const projects = asArray(profile.projects);
  projects.forEach((value, index) => {
    const record = asRecord(value);
    if (!record) return;

    const title = firstString(record.title, record.name, record.projectTitle);
    const organization = firstString(
      record.organization,
      record.company,
      record.client
    );
    const bullets = collectStrings(
      record.bullets,
      record.highlights,
      record.responsibilities,
      record.outcomes
    );
    const summary = joinParts(
      firstString(record.summary, record.description, record.overview),
      bullets.join(" ")
    );

    if (!hasSubstance(title, organization, summary, bullets)) return;

    items.push({
      id: `project-${index}`,
      sourceType: "project",
      sourceLabel: buildSourceLabel(title, organization, index + 1),
      title,
      organization,
      dateFrom: firstString(record.dateFrom, record.startDate, record.from),
      dateTo: firstString(record.dateTo, record.endDate, record.to),
      isCurrent: Boolean(record.isCurrent),
      summary,
      bullets,
      raw: record,
    });
  });

  const certifications = asArray(profile.certifications);
  certifications.forEach((value, index) => {
    const record = asRecord(value);
    if (!record) return;

    const title = firstString(record.title, record.name, record.certification);
    const organization = firstString(
      record.organization,
      record.issuer,
      record.provider
    );
    const bullets = collectStrings(record.skills, record.topics, record.highlights);
    const summary = joinParts(
      firstString(record.summary, record.description),
      bullets.join(" ")
    );

    if (!hasSubstance(title, organization, summary, bullets)) return;

    items.push({
      id: `certification-${index}`,
      sourceType: "certification",
      sourceLabel: buildSourceLabel(title, organization, index + 1),
      title,
      organization,
      dateFrom: firstString(record.date, record.issuedAt, record.dateFrom),
      dateTo: firstString(record.expiryDate, record.dateTo),
      summary,
      bullets,
      raw: record,
    });
  });

  const education = asArray(profile.education);
  education.forEach((value, index) => {
    const record = asRecord(value);
    if (!record) return;

    const title = firstString(record.degree, record.title, record.program);
    const organization = firstString(
      record.institution,
      record.school,
      record.organization
    );
    const bullets = collectStrings(
      record.coursework,
      record.highlights,
      record.skills
    );
    const summary = joinParts(
      firstString(record.summary, record.description),
      bullets.join(" ")
    );

    if (!hasSubstance(title, organization, summary, bullets)) return;

    items.push({
      id: `education-${index}`,
      sourceType: "education",
      sourceLabel: buildSourceLabel(title, organization, index + 1),
      title,
      organization,
      dateFrom: firstString(record.dateFrom, record.startDate, record.from),
      dateTo: firstString(record.dateTo, record.endDate, record.to),
      summary,
      bullets,
      raw: record,
    });
  });

  const skills = collectStrings(
    profile.skills,
    profile.keySkills,
    profile.competencies,
    profile.tools
  );

  if (skills.length > 0) {
    items.push({
      id: "skills-0",
      sourceType: "skill",
      sourceLabel: "Skills",
      title: "Skills",
      summary: skills.join(" "),
      bullets: skills,
      raw: { skills },
    });
  }

  return items;
}

function extractJobSignals(
  structuredJob: unknown,
  requiredProfile: unknown
): JobSignals {
  const job = asRecord(structuredJob) ?? {};
  const required = asRecord(requiredProfile) ?? {};

  const requiredCompetencies = asArray(required.requiredCompetencies)
    .map((item) => asRecord(item))
    .filter(Boolean)
    .map((item) => ({
      competency: firstString(
        item!.competency,
        item!.name,
        item!.title,
        item!.label
      ) ?? "",
      category: firstString(item!.category) as RequiredCompetency["category"],
      importance: firstString(
        item!.importance
      ) as RequiredCompetency["importance"],
      interpretation: firstString(item!.interpretation, item!.summary),
    }))
    .filter((item) => item.competency.trim().length > 0);

  return {
    jobTitle: firstString(job.jobTitle, job.title, required.targetTitle, required.jobTitle) ?? "",
    responsibilities: uniqueStrings(
      collectStrings(
        job.responsibilities,
        job.keyResponsibilities,
        job.tasks,
        required.requiredExperienceSignals,
        required.responsibilities,
        required.coreResponsibilities
      )
    ),
    requirements: uniqueStrings(
      collectStrings(
        job.requirements,
        job.mustHaves,
        job.qualifications,
        required.requirements,
        required.summary,
        job.summary
      )
    ),
    summarySignals: uniqueStrings(
      collectStrings(job.summary, job.description, required.summary)
    ),
    requiredTools: uniqueStrings(
      collectStrings(required.requiredTools, job.tools, job.systems)
    ),
    requiredLanguages: uniqueStrings(
      collectStrings(required.requiredLanguages, job.languages)
    ),
    requiredEducation: uniqueStrings(
      collectStrings(required.requiredEducation, job.education)
    ),
    behaviouralSignals: uniqueStrings(
      collectStrings(required.behaviouralSignals)
    ),
    stakeholderSignals: uniqueStrings(
      collectStrings(required.stakeholderSignals)
    ),
    competencies: requiredCompetencies,
  };
}

function weightedCompetencyScore(
  evidenceText: string,
  competencies: RequiredCompetency[],
  weightPerStrongMatch: number
): number {
  if (competencies.length === 0) return 0;

  let score = 0;

  for (const competency of competencies) {
    const phrases = uniqueStrings(
      collectStrings(competency.competency, competency.interpretation)
    );

    let best = 0;
    for (const phrase of phrases) {
      best = Math.max(best, phraseSimilarity(evidenceText, phrase));
    }

    if (best >= 0.82) {
      score += weightPerStrongMatch;
    } else if (best >= 0.62) {
      score += weightPerStrongMatch * 0.6;
    } else if (best >= 0.48) {
      score += weightPerStrongMatch * 0.25;
    }
  }

  return Math.min(score, competencies.length * weightPerStrongMatch);
}

function phraseGroupScore(
  evidenceText: string,
  phrases: string[],
  weightPerStrongMatch: number
): number {
  if (phrases.length === 0) return 0;

  let score = 0;

  for (const phrase of phrases) {
    const similarity = phraseSimilarity(evidenceText, phrase);

    if (similarity >= 0.82) {
      score += weightPerStrongMatch;
    } else if (similarity >= 0.62) {
      score += weightPerStrongMatch * 0.55;
    } else if (similarity >= 0.48) {
      score += weightPerStrongMatch * 0.2;
    }
  }

  return Math.min(score, phrases.length * weightPerStrongMatch);
}

function titleAlignment(item: EvidenceItem, jobTitle: string): number {
  if (!jobTitle.trim()) return 0;
  const itemTitleTokens = tokenize(joinParts(item.title, item.organization));
  const jobTitleTokens = tokenize(jobTitle);
  return round2(tokenOverlapRatio(itemTitleTokens, jobTitleTokens) * 3);
}

function computeRecencyScore(item: EvidenceItem): number {
  if (item.isCurrent) return 3;

  if (item.sourceType === "skill") return 0.75;
  if (item.sourceType === "certification") return 1.1;
  if (item.sourceType === "education") return 0.7;

  const endDate = parseDate(item.dateTo) ?? parseDate(item.dateFrom);
  if (!endDate) return 0.8;

  const months = monthDiff(endDate, new Date());

  if (months <= 12) return 2.5;
  if (months <= 36) return 1.8;
  if (months <= 72) return 1.0;
  return 0.4;
}

function computeSpecificityScore(
  item: EvidenceItem,
  uniqueTokenCount: number
): number {
  let score = 0;

  if (item.bullets.length >= 2) score += 1.25;
  if (item.bullets.length >= 4) score += 0.75;
  if (uniqueTokenCount >= 12) score += 0.75;
  if (uniqueTokenCount >= 24) score += 0.75;
  if ((item.title ?? "").trim()) score += 0.5;
  if ((item.organization ?? "").trim()) score += 0.5;

  if (item.sourceType === "experience" || item.sourceType === "project") {
    score += 0.5;
  }

  return Math.min(score, 5);
}

function computeWeakEvidencePenalty(input: {
  item: EvidenceItem;
  matchedResponsibilitiesCount: number;
  matchedRequirementsCount: number;
  matchedCoreCompetenciesCount: number;
  evidenceTokenCount: number;
}): number {
  const {
    item,
    matchedResponsibilitiesCount,
    matchedRequirementsCount,
    matchedCoreCompetenciesCount,
    evidenceTokenCount,
  } = input;

  const directMatchCount =
    matchedResponsibilitiesCount +
    matchedRequirementsCount +
    matchedCoreCompetenciesCount;

  if (directMatchCount >= 2) return 0;

  let penalty = 0;

  if (item.sourceType === "skill") penalty += 1.75;
  if (item.sourceType === "education") penalty += 0.75;
  if (item.sourceType === "certification") penalty += 0.35;

  if (evidenceTokenCount < 8) penalty += 0.8;
  if (!item.summary.trim() && item.bullets.length === 0) penalty += 1.2;
  if (item.summary.trim().length < 60 && item.bullets.length === 0) penalty += 0.7;

  return penalty;
}

function computeAdjacencyPenalty(input: {
  coreCompetencyScore: number;
  responsibilityScore: number;
  requirementScore: number;
  titleAlignmentScore: number;
  toolScore: number;
  behaviouralScore: number;
  stakeholderScore: number;
}): number {
  const {
    coreCompetencyScore,
    responsibilityScore,
    requirementScore,
    titleAlignmentScore,
    toolScore,
    behaviouralScore,
    stakeholderScore,
  } = input;

  const directStrength = coreCompetencyScore + responsibilityScore + requirementScore;
  const indirectStrength = titleAlignmentScore + toolScore + behaviouralScore + stakeholderScore;

  if (directStrength > 0) return 0;
  if (indirectStrength <= 0) return 0;

  if (indirectStrength >= 6) return 2.5;
  if (indirectStrength >= 3) return 1.5;
  return 0.75;
}

function computeGenericPenalty(
  item: EvidenceItem,
  uniqueTokenCount: number
): number {
  let penalty = 0;

  if (uniqueTokenCount < 6) penalty += 0.75;
  if (item.bullets.length === 1) penalty += 0.25;
  if (item.sourceType === "skill" && item.bullets.length > 10) penalty += 0.75;

  return penalty;
}

function findStrongMatches(evidenceText: string, phrases: string[]): string[] {
  return phrases.filter((phrase) => phraseSimilarity(evidenceText, phrase) >= 0.62);
}

function buildCombinedEvidenceText(item: EvidenceItem): string {
  return joinParts(item.title, item.organization, item.summary, item.bullets.join(" "));
}

function dedupeEvidence(items: SelectedEvidenceItem[]): SelectedEvidenceItem[] {
  const kept: SelectedEvidenceItem[] = [];

  for (const candidate of items) {
    const candidateTokens = tokenize(
      joinParts(
        candidate.title,
        candidate.organization,
        candidate.summary,
        candidate.bullets.join(" ")
      )
    );

    const isDuplicate = kept.some((existing) => {
      if (existing.sourceType !== candidate.sourceType) return false;

      const existingTokens = tokenize(
        joinParts(
          existing.title,
          existing.organization,
          existing.summary,
          existing.bullets.join(" ")
        )
      );

      return jaccard(candidateTokens, existingTokens) >= 0.82;
    });

    if (!isDuplicate) kept.push(candidate);
  }

  return kept;
}

function phraseSimilarity(evidenceText: string, phrase: string): number {
  const evidenceTokens = tokenize(evidenceText);
  const phraseTokens = tokenize(phrase);

  if (evidenceTokens.size === 0 || phraseTokens.size === 0) return 0;

  let overlap = 0;
  for (const token of phraseTokens) {
    if (evidenceTokens.has(token)) overlap += 1;
  }

  const tokenRatio = overlap / phraseTokens.size;
  const fullPhraseMatch = normalizeText(evidenceText).includes(normalizeText(phrase))
    ? 1
    : 0;

  return Math.max(tokenRatio, fullPhraseMatch);
}

function tokenOverlapRatio(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;

  let overlap = 0;
  for (const token of b) {
    if (a.has(token)) overlap += 1;
  }

  return overlap / Math.max(1, b.size);
}

function tokenize(text: string): Set<string> {
  const normalized = normalizeText(text);
  if (!normalized) return new Set();

  const tokens = normalized
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(
      (token) =>
        token.length >= MIN_TOKEN_LENGTH &&
        !STOPWORDS.has(token) &&
        !/^\d+$/.test(token)
    );

  return new Set(tokens);
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s/+.-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function uniqueStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const output: string[] = [];

  for (const value of values) {
    const normalized = normalizeText(value);
    if (!normalized) continue;
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    output.push(value.trim());
  }

  return output;
}

function collectStrings(...values: unknown[]): string[] {
  const output: string[] = [];

  for (const value of values) {
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed) output.push(trimmed);
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === "string" && item.trim()) {
          output.push(item.trim());
          continue;
        }

        if (isPrimitive(item)) {
          const stringified = String(item).trim();
          if (stringified) output.push(stringified);
          continue;
        }

        const record = asRecord(item);
        if (!record) continue;

        const picked = firstString(
          record.text,
          record.label,
          record.title,
          record.name,
          record.value,
          record.competency,
          record.interpretation
        );

        if (picked) output.push(picked);
      }
    }
  }

  return output;
}

function buildSourceLabel(
  primary?: string,
  secondary?: string,
  fallbackIndex?: number
): string {
  const value = [primary, secondary].filter(Boolean).join(" — ").trim();
  if (value) return value;
  return `Evidence ${fallbackIndex ?? 1}`;
}

function joinParts(...parts: Array<string | undefined>): string {
  return parts.filter((part) => typeof part === "string" && part.trim()).join(" ").trim();
}

function hasSubstance(
  title?: string,
  organization?: string,
  summary?: string,
  bullets?: string[]
): boolean {
  return Boolean(
    (title && title.trim()) ||
      (organization && organization.trim()) ||
      (summary && summary.trim()) ||
      (bullets && bullets.length > 0)
  );
}

function parseDate(value?: string): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function monthDiff(a: Date, b: Date): number {
  return Math.max(
    0,
    (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth())
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;

  let intersection = 0;
  for (const token of a) {
    if (b.has(token)) intersection += 1;
  }

  const union = new Set([...a, ...b]).size;
  return intersection / Math.max(1, union);
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function firstString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return undefined;
}

function asRecord(value: unknown): CandidateRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as CandidateRecord;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function isPrimitive(value: unknown): value is Primitive {
  return (
    value === null ||
    value === undefined ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  );
}