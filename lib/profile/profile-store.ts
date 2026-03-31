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

export type CandidateProfile = {
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

function mapWorkspaceRow(data: CandidateWorkspaceRow): CandidateWorkspace {
  return {
    userId: data.user_id,
    profile: data.profile_json ?? null,
    documents: data.documents_json ?? [],
    meta: data.meta_json ?? {},
    createdAt: data.created_at ?? null,
    updatedAt: data.updated_at ?? null,
  };
}

function buildInitialWorkspace(userId: string): Omit<CandidateWorkspaceRow, "created_at" | "updated_at"> {
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
    input.profile !== undefined ? input.profile : existing.profile ?? null;

  const documents =
    input.documents !== undefined ? input.documents : existing.documents ?? [];

  const meta = {
    ...(existing.meta ?? {}),
    ...(input.meta ?? {}),
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