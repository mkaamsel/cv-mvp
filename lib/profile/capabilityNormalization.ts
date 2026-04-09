import type { CandidateProfile } from "@/lib/profile/profile-store";

export type CapabilityEvidence = {
  sourceType:
    | "role_achievement"
    | "core_skill"
    | "tool"
    | "standard"
    | "industry"
    | "verified_claim"
    | "language"
    | "certification"
    | "education";
  roleIndex?: number;
  rawText: string;
  normalizedText: string;
};

export type CandidateCapability = {
  capabilityId: string;
  label: string;
  category:
    | "responsibility"
    | "skill"
    | "tool"
    | "standard"
    | "domain"
    | "leadership"
    | "process"
    | "compliance";
  strength: "core" | "supporting";
  confidence: "high" | "medium" | "weak";
  evidenceCount: number;
  evidence: CapabilityEvidence[];
  aliases: string[];
};

export type CandidateLanguageCapability = {
  language: string;
  proficiency: string | null;
  normalizedLanguage: string;
};

export type CandidateCertificationCapability = {
  name: string;
  issuer: string | null;
  date: string | null;
  normalizedName: string;
};

export type CandidateEducationCapability = {
  degree: string;
  field: string | null;
  institution: string | null;
  endDate: string | null;
  normalizedDegree: string;
};

export type CandidateIndustryCapability = {
  label: string;
  normalizedLabel: string;
};

export type CandidateCapabilityInventory = {
  capabilities: CandidateCapability[];
  facets: {
    language: CandidateLanguageCapability[];
    certification: CandidateCertificationCapability[];
    education: CandidateEducationCapability[];
    industry: CandidateIndustryCapability[];
  };
  provenance: {
    generatedAt: string;
  };
};

type CapabilityTemplate = {
  capabilityId: string;
  label: string;
  category: CandidateCapability["category"];
  strength: CandidateCapability["strength"];
  confidence: CandidateCapability["confidence"];
};

type ResponsibilityRule = {
  template: CapabilityTemplate;
  all?: string[];
  any?: string[];
};

const RESPONSIBILITY_RULES: ResponsibilityRule[] = [
  {
    template: {
      capabilityId: "financial_statement_preparation",
      label: "Financial statement preparation",
      category: "process",
      strength: "core",
      confidence: "high",
    },
    any: [
      "financial statement",
      "financial statements",
      "abschluss",
      "abschluesse",
      "abschlusse",
      "abschlussarbeiten",
      "jahresabschluss",
      "monatsabschluss",
      "quartalsabschluss",
      "reporting package",
    ],
  },
  {
    template: {
      capabilityId: "month_end_close_management",
      label: "Month-end and period close management",
      category: "process",
      strength: "core",
      confidence: "high",
    },
    any: [
      "month end close",
      "month-end close",
      "period close",
      "closing process",
      "abschlussprozess",
      "abschluss",
    ],
  },
  {
    template: {
      capabilityId: "account_reconciliation",
      label: "Account reconciliation",
      category: "process",
      strength: "core",
      confidence: "high",
    },
    any: [
      "reconciliation",
      "reconciliations",
      "kontoabstimmung",
      "kontenabstimmung",
      "account reconciliation",
      "balance sheet reconciliation",
    ],
  },
  {
    template: {
      capabilityId: "audit_support_coordination",
      label: "Audit support and coordination",
      category: "compliance",
      strength: "supporting",
      confidence: "medium",
    },
    any: [
      "audit",
      "auditor",
      "abschlusspruefung",
      "abschlussprufung",
      "wirtschaftspruefer",
      "wirtschaftsprufer",
    ],
  },
  {
    template: {
      capabilityId: "tax_reporting_coordination",
      label: "Tax reporting and coordination",
      category: "compliance",
      strength: "supporting",
      confidence: "medium",
    },
    any: [
      "tax",
      "steuer",
      "vat",
      "ust",
      "mwst",
      "tax reporting",
      "steuererklaerung",
      "steuererklarung",
    ],
  },
  {
    template: {
      capabilityId: "process_improvement_digitalization",
      label: "Process improvement and digitalization",
      category: "process",
      strength: "supporting",
      confidence: "medium",
    },
    any: [
      "process improvement",
      "continuous improvement",
      "digitalization",
      "automatisierung",
      "automation",
      "optimierung",
    ],
  },
];

const EMPTY_PROFILE: CandidateProfile = {
  fullName: null,
  headline: null,
  summary: null,
  roles: [],
  coreSkills: [],
  tools: [],
  standards: [],
  industries: [],
  languages: [],
  education: [],
  certifications: [],
  leadershipSignals: [],
  strengths: [],
  constraints: [],
  verifiedClaims: [],
  openQuestions: [],
};

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stemToken(token: string): string {
  if (token.length > 5 && token.endsWith("ing")) return token.slice(0, -3);
  if (token.length > 4 && token.endsWith("ed")) return token.slice(0, -2);
  if (token.length > 4 && token.endsWith("es")) return token.slice(0, -2);
  if (token.length > 3 && token.endsWith("s")) return token.slice(0, -1);
  return token;
}

function normalizeTextForMatching(value: string): string {
  const normalized = normalizeText(value);
  if (!normalized) return "";
  return normalized
    .split(" ")
    .map((token) => stemToken(token.trim()))
    .filter(Boolean)
    .join(" ");
}

function slugify(value: string): string {
  return normalizeText(value)
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function buildFallbackResponsibilityTemplate(text: string): CapabilityTemplate {
  const tokens = normalizeText(text).split(" ").filter(Boolean).slice(0, 6);
  const fallback = tokens.length > 0 ? tokens.join("_") : "unspecified";
  return {
    capabilityId: `responsibility_${fallback}`,
    label: text.trim() || "Role responsibility",
    category: "responsibility",
    strength: "supporting",
    confidence: "weak",
  };
}

function matchResponsibilityTemplates(text: string): CapabilityTemplate[] {
  const normalized = normalizeTextForMatching(text);
  if (!normalized) return [];

  const matches = RESPONSIBILITY_RULES.filter((rule) => {
    const allOk = (rule.all ?? []).every((item) =>
      normalized.includes(normalizeTextForMatching(item)),
    );
    const anyOk =
      !rule.any || rule.any.some((item) => normalized.includes(normalizeTextForMatching(item)));
    return allOk && anyOk;
  }).map((rule) => rule.template);

  if (matches.length > 0) return matches;
  return [buildFallbackResponsibilityTemplate(text)];
}

function createCapabilityFromTemplate(
  template: CapabilityTemplate,
  evidence: CapabilityEvidence,
  alias: string,
): CandidateCapability {
  return {
    capabilityId: template.capabilityId,
    label: template.label,
    category: template.category,
    strength: template.strength,
    confidence: template.confidence,
    evidenceCount: 1,
    evidence: [evidence],
    aliases: alias ? [alias] : [],
  };
}

function addCapabilityEvidence(
  map: Map<string, CandidateCapability>,
  template: CapabilityTemplate,
  evidence: CapabilityEvidence,
  alias: string,
): void {
  const existing = map.get(template.capabilityId);
  if (!existing) {
    map.set(
      template.capabilityId,
      createCapabilityFromTemplate(template, evidence, alias),
    );
    return;
  }

  existing.evidence.push(evidence);
  existing.evidenceCount = existing.evidence.length;
  if (alias && !existing.aliases.includes(alias)) {
    existing.aliases.push(alias);
  }

  if (template.confidence === "high" && existing.confidence !== "high") {
    existing.confidence = "high";
  } else if (
    template.confidence === "medium" &&
    existing.confidence === "weak"
  ) {
    existing.confidence = "medium";
  }

  if (template.strength === "core") {
    existing.strength = "core";
  }
}

function addSimpleSignal(
  map: Map<string, CandidateCapability>,
  input: {
    rawText: string;
    sourceType: CapabilityEvidence["sourceType"];
    category: CandidateCapability["category"];
    strength: CandidateCapability["strength"];
    confidence: CandidateCapability["confidence"];
    labelPrefix?: string;
  },
): void {
  const raw = input.rawText.trim();
  if (!raw) return;
  const normalized = normalizeTextForMatching(raw);
  if (!normalized) return;

  const baseSlug = slugify(normalized);
  const capabilityId =
    input.labelPrefix && input.labelPrefix.trim()
      ? `${slugify(input.labelPrefix)}_${baseSlug}`
      : baseSlug;

  const label =
    input.labelPrefix && input.labelPrefix.trim()
      ? `${input.labelPrefix}: ${raw}`
      : raw;

  const template: CapabilityTemplate = {
    capabilityId,
    label,
    category: input.category,
    strength: input.strength,
    confidence: input.confidence,
  };

  const evidence: CapabilityEvidence = {
    sourceType: input.sourceType,
    rawText: raw,
    normalizedText: normalized,
  };

  addCapabilityEvidence(map, template, evidence, raw);
}

function dedupeBy<T>(
  items: T[],
  getKey: (item: T) => string,
): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const item of items) {
    const key = getKey(item);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }
  return result;
}

export function normalizeCandidateCapabilities(
  profile: CandidateProfile,
): CandidateCapabilityInventory {
  const safeProfile = profile ?? EMPTY_PROFILE;
  const capabilityMap = new Map<string, CandidateCapability>();

  safeProfile.roles.forEach((role, roleIndex) => {
    role.achievements.forEach((achievement) => {
      const raw = achievement.trim();
      if (!raw) return;
      const normalized = normalizeTextForMatching(raw);
      if (!normalized) return;
      const evidence: CapabilityEvidence = {
        sourceType: "role_achievement",
        roleIndex,
        rawText: raw,
        normalizedText: normalized,
      };

      const templates = matchResponsibilityTemplates(raw);
      templates.forEach((template) => {
        addCapabilityEvidence(capabilityMap, template, evidence, raw);
      });
    });
  });

  safeProfile.coreSkills.forEach((skill) => {
    addSimpleSignal(capabilityMap, {
      rawText: skill,
      sourceType: "core_skill",
      category: "skill",
      strength: "core",
      confidence: "high",
      labelPrefix: "Skill",
    });
  });

  safeProfile.tools.forEach((tool) => {
    addSimpleSignal(capabilityMap, {
      rawText: tool,
      sourceType: "tool",
      category: "tool",
      strength: "supporting",
      confidence: "high",
      labelPrefix: "Tool",
    });
  });

  safeProfile.standards.forEach((standard) => {
    addSimpleSignal(capabilityMap, {
      rawText: standard,
      sourceType: "standard",
      category: "standard",
      strength: "supporting",
      confidence: "medium",
      labelPrefix: "Standard",
    });
  });

  safeProfile.industries.forEach((industry) => {
    addSimpleSignal(capabilityMap, {
      rawText: industry,
      sourceType: "industry",
      category: "domain",
      strength: "supporting",
      confidence: "medium",
      labelPrefix: "Industry",
    });
  });

  safeProfile.languages.forEach((language) => {
    const raw = language.proficiency
      ? `${language.language} (${language.proficiency})`
      : language.language;
    addSimpleSignal(capabilityMap, {
      rawText: raw,
      sourceType: "language",
      category: "skill",
      strength: "supporting",
      confidence: "high",
      labelPrefix: "Language",
    });
  });

  safeProfile.certifications.forEach((certification) => {
    const raw = [certification.name, certification.issuer, certification.date]
      .filter(Boolean)
      .join(" ");
    addSimpleSignal(capabilityMap, {
      rawText: raw || certification.name,
      sourceType: "certification",
      category: "compliance",
      strength: "supporting",
      confidence: "medium",
      labelPrefix: "Certification",
    });
  });

  safeProfile.education.forEach((education) => {
    const raw = [education.degree, education.field, education.institution]
      .filter(Boolean)
      .join(" ");
    addSimpleSignal(capabilityMap, {
      rawText: raw || education.degree,
      sourceType: "education",
      category: "domain",
      strength: "supporting",
      confidence: "medium",
      labelPrefix: "Education",
    });
  });

  const capabilities = Array.from(capabilityMap.values()).sort((a, b) =>
    a.capabilityId.localeCompare(b.capabilityId),
  );

  const languageFacets = dedupeBy(
    safeProfile.languages.map((language) => ({
      language: language.language,
      proficiency: language.proficiency,
      normalizedLanguage: normalizeText(language.language),
    })),
    (item) => `${item.normalizedLanguage}:${item.proficiency ?? ""}`,
  );

  const certificationFacets = dedupeBy(
    safeProfile.certifications.map((certification) => ({
      name: certification.name,
      issuer: certification.issuer,
      date: certification.date,
      normalizedName: normalizeText(certification.name),
    })),
    (item) => `${item.normalizedName}:${normalizeText(item.issuer ?? "")}:${item.date ?? ""}`,
  );

  const educationFacets = dedupeBy(
    safeProfile.education.map((education) => ({
      degree: education.degree,
      field: education.field,
      institution: education.institution,
      endDate: education.endDate,
      normalizedDegree: normalizeText(education.degree),
    })),
    (item) =>
      `${item.normalizedDegree}:${normalizeText(item.field ?? "")}:${normalizeText(item.institution ?? "")}:${item.endDate ?? ""}`,
  );

  const industryFacets = dedupeBy(
    safeProfile.industries.map((industry) => ({
      label: industry,
      normalizedLabel: normalizeText(industry),
    })),
    (item) => item.normalizedLabel,
  );

  return {
    capabilities,
    facets: {
      language: languageFacets,
      certification: certificationFacets,
      education: educationFacets,
      industry: industryFacets,
    },
    provenance: {
      generatedAt: new Date().toISOString(),
    },
  };
}
