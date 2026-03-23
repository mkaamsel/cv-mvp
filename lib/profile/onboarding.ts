export type CanonicalProfile = {
  headline: string | null;
  professional_summary: string | null;
  highest_education: string | null;
  years_experience_estimate: string | null;
  seniority_level: string | null;
  leadership_experience: string | null;
  location: string | null;
  languages: string[];
  core_skills: string[];
  erp_systems: string[];
  reporting_frameworks: string[];
  industries: string[];
  target_roles: string[];
  certifications: string[];
};

export type MissingQuestion = {
  field: keyof CanonicalProfile;
  question: string;
};

export function dedupeLines(text: string): string {
  const seen = new Set<string>();

  return text
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .filter((line) => {
      const key = line.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .join("\n");
}

export function mergeCvTexts(cvTexts: string[]): string {
  return dedupeLines(cvTexts.join("\n\n"));
}

export function normalizeArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map(String).map((v) => v.trim()).filter(Boolean))];
}

export function normalizeProfile(raw: any): CanonicalProfile {
  return {
    headline: raw?.headline ?? null,
    professional_summary: raw?.professional_summary ?? null,
    highest_education: raw?.highest_education ?? null,
    years_experience_estimate: raw?.years_experience_estimate ?? null,
    seniority_level: raw?.seniority_level ?? null,
    leadership_experience: raw?.leadership_experience ?? null,
    location: raw?.location ?? null,
    languages: normalizeArray(raw?.languages),
    core_skills: normalizeArray(raw?.core_skills),
    erp_systems: normalizeArray(raw?.erp_systems),
    reporting_frameworks: normalizeArray(raw?.reporting_frameworks),
    industries: normalizeArray(raw?.industries),
    target_roles: normalizeArray(raw?.target_roles),
    certifications: normalizeArray(raw?.certifications),
  };
}