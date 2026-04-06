import { createSupabaseServerClient } from "@/lib/supabase/server";

export type SourceKind =
  | "primary_cv"
  | "additional_cv"
  | "arbeitszeugnis"
  | "certificate"
  | "user_note"
  | "other";

export type StoredDocument = {
  fileName: string;
  kind: SourceKind;
  text: string;
  description?: string;
  isPrimary?: boolean;
};

export type CandidateRole = {
  title: string;
  company: string | null;
  startDate: string | null;
  endDate: string | null;
  isCurrent: boolean;
  location: string | null;
  achievements: string[];
};

export type CandidateLanguage = {
  language: string;
  proficiency: string | null;
};

export type CandidateEducation = {
  degree: string;
  field: string | null;
  institution: string | null;
  endDate: string | null;
};

export type CandidateCertification = {
  name: string;
  issuer: string | null;
  date: string | null;
};

export type VerifiedClaim = {
  claim: string;
  evidence: string[];
  confidence: "high" | "medium";
};

// Correction log — user corrections are the highest authority.
// AI re-extraction must never overwrite entries logged here.
export type CorrectionLogEntry = {
  id: string;
  timestamp: string;
  field: string;
  action: "add" | "remove" | "update";
  value: unknown;
  userInstruction: string;
  sourceType: "user_prompt";
  sourceDetail: string;
  language: string;
};

export type CandidateProfile = {
  // Schema versioning — increment on breaking changes.
  schemaVersion?: number;

  fullName: string | null;
  headline: string | null;
  summary: string | null;
  roles: CandidateRole[];
  coreSkills: string[];
  tools: string[];
  standards: string[];
  industries: string[];
  languages: CandidateLanguage[];
  education: CandidateEducation[];
  certifications: CandidateCertification[];
  leadershipSignals: string[];
  strengths: string[];
  constraints: string[];
  verifiedClaims: VerifiedClaim[];
  openQuestions: string[];

  // Language system (v2)
  detectedInputLanguages?: string[];
  interactionLanguage?: string;
  preferredOutputLanguage?: string;
  outputLanguageLockedByUser?: boolean;

  // Permanent correction history (v2)
  correctionLog?: CorrectionLogEntry[];
};

export type CandidateWorkspace = {
  userId: string;
  profile: CandidateProfile | null;
  documents: StoredDocument[];
  meta: Record<string, unknown>;
  createdAt: string | null;
  updatedAt: string | null;
};

type CandidateWorkspaceRow = {
  user_id: string;
  profile_json: CandidateProfile | null;
  documents_json: StoredDocument[] | null;
  meta_json: Record<string, unknown> | null;
  created_at: string | null;
  updated_at: string | null;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeSourceKind(value: unknown): SourceKind {
  const kind = asString(value);

  switch (kind) {
    case "primary_cv":
    case "additional_cv":
    case "arbeitszeugnis":
    case "certificate":
    case "user_note":
    case "other":
      return kind;
    default:
      return "other";
  }
}

function normalizeStoredDocument(value: unknown): StoredDocument | null {
  const doc = asRecord(value);
  if (!doc) return null;

  const fileName =
    asString(doc.fileName) ??
    asString(doc.name) ??
    asString(doc.title) ??
    "document";

  const text = typeof doc.text === "string" ? doc.text : "";
  const description = typeof doc.description === "string" ? doc.description : "";

  return {
    fileName,
    kind: normalizeSourceKind(doc.kind),
    text,
    description,
    isPrimary: Boolean(doc.isPrimary),
  };
}

function normalizeDocuments(value: unknown): StoredDocument[] {
  if (!Array.isArray(value)) return [];

  return value
    .map(normalizeStoredDocument)
    .filter((doc): doc is StoredDocument => Boolean(doc));
}

function getArrayField(
  profile: Record<string, unknown>,
  primaryKey: string,
  fallbackKey?: string
): string[] {
  const primary = asStringArray(profile[primaryKey]);
  if (primary.length > 0) return primary;

  if (!fallbackKey) return [];
  return asStringArray(profile[fallbackKey]);
}

function normalizeCandidateProfile(value: unknown): CandidateProfile | null {
  const profile = asRecord(value);
  if (!profile) return null;

  const roles = Array.isArray(profile.roles)
    ? profile.roles
        .map((item) => {
          const role = asRecord(item);
          if (!role) return null;

          const title = asString(role.title);
          if (!title) return null;

          return {
            title,
            company: asString(role.company),
            startDate: asString(role.startDate),
            endDate: asString(role.endDate),
            isCurrent: Boolean(role.isCurrent),
            location: asString(role.location),
            achievements: asStringArray(role.achievements),
          };
        })
        .filter((item): item is CandidateRole => Boolean(item))
    : [];

  const languages = Array.isArray(profile.languages)
    ? profile.languages
        .map((item) => {
          const language = asRecord(item);
          if (!language) return null;

          const label = asString(language.language);
          if (!label) return null;

          return {
            language: label,
            proficiency: asString(language.proficiency),
          };
        })
        .filter((item): item is CandidateLanguage => Boolean(item))
    : [];

  const education = Array.isArray(profile.education)
    ? profile.education
        .map((item) => {
          const entry = asRecord(item);
          if (!entry) return null;

          const degree = asString(entry.degree);
          if (!degree) return null;

          return {
            degree,
            field: asString(entry.field),
            institution: asString(entry.institution),
            endDate: asString(entry.endDate),
          };
        })
        .filter((item): item is CandidateEducation => Boolean(item))
    : [];

  const certifications = Array.isArray(profile.certifications)
    ? profile.certifications
        .map((item) => {
          const entry = asRecord(item);
          if (!entry) return null;

          const name = asString(entry.name);
          if (!name) return null;

          return {
            name,
            issuer: asString(entry.issuer),
            date: asString(entry.date) ?? asString(entry.year),
          };
        })
        .filter((item): item is CandidateCertification => Boolean(item))
    : [];

  const verifiedClaims = Array.isArray(profile.verifiedClaims)
    ? profile.verifiedClaims
        .map((item) => {
          const entry = asRecord(item);
          if (!entry) return null;

          const claim = asString(entry.claim);
          if (!claim) return null;

          return {
            claim,
            evidence: asStringArray(entry.evidence),
            confidence: entry.confidence === "medium" ? "medium" : "high",
          };
        })
        .filter((item): item is VerifiedClaim => Boolean(item))
    : [];

  // Pass through v2 optional fields without strict validation — they may not
  // exist in profiles written by older schema versions.
  const correctionLog = Array.isArray(profile.correctionLog)
    ? (profile.correctionLog as CorrectionLogEntry[])
    : undefined;

  return {
    schemaVersion: typeof profile.schemaVersion === "number" ? profile.schemaVersion : 1,
    fullName: asString(profile.fullName),
    headline: asString(profile.headline),
    summary: asString(profile.summary),
    roles,
    coreSkills: getArrayField(profile, "coreSkills", "skills"),
    tools: getArrayField(profile, "tools"),
    standards: getArrayField(profile, "standards", "domains"),
    industries: getArrayField(profile, "industries"),
    languages,
    education,
    certifications,
    leadershipSignals: getArrayField(profile, "leadershipSignals"),
    strengths: getArrayField(profile, "strengths"),
    constraints: getArrayField(profile, "constraints"),
    verifiedClaims,
    openQuestions: getArrayField(profile, "openQuestions"),
    detectedInputLanguages: asStringArray(profile.detectedInputLanguages),
    interactionLanguage: asString(profile.interactionLanguage) ?? undefined,
    preferredOutputLanguage: asString(profile.preferredOutputLanguage) ?? undefined,
    outputLanguageLockedByUser: Boolean(profile.outputLanguageLockedByUser) || undefined,
    ...(correctionLog !== undefined ? { correctionLog } : {}),
  };
}

function mapWorkspaceRow(data: CandidateWorkspaceRow): CandidateWorkspace {
  return {
    userId: data.user_id,
    profile: normalizeCandidateProfile(data.profile_json),
    documents: normalizeDocuments(data.documents_json),
    meta:
      data.meta_json && typeof data.meta_json === "object" && !Array.isArray(data.meta_json)
        ? data.meta_json
        : {},
    createdAt: data.created_at ?? null,
    updatedAt: data.updated_at ?? null,
  };
}

function buildInitialWorkspace(
  userId: string
): Omit<CandidateWorkspaceRow, "created_at" | "updated_at"> {
  return {
    user_id: userId,
    profile_json: null,
    documents_json: [],
    meta_json: {
      locale: "en",
      sourceCount: 0,
      readinessLabel: "Early",
      bootstrapStatus: "created",
    },
  };
}

export async function getCurrentUserId(): Promise<string> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw new Error(error.message);
  }

  if (!user) {
    throw new Error("User not authenticated.");
  }

  return user.id;
}

export async function loadCandidateWorkspace(
  userId?: string
): Promise<CandidateWorkspace | null> {
  const supabase = await createSupabaseServerClient();
  const resolvedUserId = userId ?? (await getCurrentUserId());

  const { data, error } = await supabase
    .from("candidate_workspaces")
    .select("user_id, profile_json, documents_json, meta_json, created_at, updated_at")
    .eq("user_id", resolvedUserId)
    .maybeSingle<CandidateWorkspaceRow>();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  return mapWorkspaceRow(data);
}

export async function createInitialCandidateWorkspace(
  userId?: string
): Promise<CandidateWorkspace> {
  const supabase = await createSupabaseServerClient();
  const resolvedUserId = userId ?? (await getCurrentUserId());

  const starter = buildInitialWorkspace(resolvedUserId);

  const { data, error } = await supabase
    .from("candidate_workspaces")
    .upsert(starter, { onConflict: "user_id" })
    .select("user_id, profile_json, documents_json, meta_json, created_at, updated_at")
    .single<CandidateWorkspaceRow>();

  if (error) {
    throw new Error(error.message);
  }

  return mapWorkspaceRow(data);
}

export async function loadOrCreateCandidateWorkspace(
  userId?: string
): Promise<CandidateWorkspace> {
  const resolvedUserId = userId ?? (await getCurrentUserId());

  const existing = await loadCandidateWorkspace(resolvedUserId);
  if (existing) {
    return existing;
  }

  return createInitialCandidateWorkspace(resolvedUserId);
}

export async function saveCandidateWorkspace(input: {
  profile?: CandidateProfile | null;
  documents?: StoredDocument[];
  meta?: Record<string, unknown>;
}): Promise<CandidateWorkspace> {
  const supabase = await createSupabaseServerClient();
  const userId = await getCurrentUserId();

  const existing = await loadOrCreateCandidateWorkspace(userId);

  const profile =
    input.profile !== undefined ? normalizeCandidateProfile(input.profile) : existing.profile ?? null;

  const documents =
    input.documents !== undefined ? normalizeDocuments(input.documents) : existing.documents ?? [];

  const meta = {
    ...(existing.meta ?? {}),
    ...((input.meta && typeof input.meta === "object" && !Array.isArray(input.meta))
      ? input.meta
      : {}),
    sourceCount: documents.filter((doc) => doc.text.trim()).length,
  };

  const { data, error } = await supabase
    .from("candidate_workspaces")
    .upsert(
      {
        user_id: userId,
        profile_json: profile,
        documents_json: documents,
        meta_json: meta,
      },
      { onConflict: "user_id" }
    )
    .select("user_id, profile_json, documents_json, meta_json, created_at, updated_at")
    .single<CandidateWorkspaceRow>();

  if (error) {
    throw new Error(error.message);
  }

  return mapWorkspaceRow(data);
}