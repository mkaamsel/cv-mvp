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

export async function loadCandidateWorkspace(): Promise<CandidateWorkspace | null> {
  const supabase = await createSupabaseServerClient();
  const userId = await getCurrentUserId();

  const { data, error } = await supabase
    .from("candidate_workspaces")
    .select("user_id, profile_json, documents_json, meta_json, created_at, updated_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  return {
    userId: data.user_id,
    profile: (data.profile_json as CandidateProfile | null) ?? null,
    documents: (data.documents_json as StoredDocument[] | null) ?? [],
    meta: (data.meta_json as Record<string, unknown> | null) ?? {},
    createdAt: data.created_at ?? null,
    updatedAt: data.updated_at ?? null,
  };
}

export async function saveCandidateWorkspace(input: {
  profile?: CandidateProfile | null;
  documents?: StoredDocument[];
  meta?: Record<string, unknown>;
}): Promise<CandidateWorkspace> {
  const supabase = await createSupabaseServerClient();
  const userId = await getCurrentUserId();

  const existing = await loadCandidateWorkspace();

  const profile =
    input.profile !== undefined ? input.profile : existing?.profile ?? null;

  const documents =
    input.documents !== undefined ? input.documents : existing?.documents ?? [];

  const meta = {
    ...(existing?.meta ?? {}),
    ...(input.meta ?? {}),
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
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return {
    userId: data.user_id,
    profile: (data.profile_json as CandidateProfile | null) ?? null,
    documents: (data.documents_json as StoredDocument[] | null) ?? [],
    meta: (data.meta_json as Record<string, unknown> | null) ?? {},
    createdAt: data.created_at ?? null,
    updatedAt: data.updated_at ?? null,
  };
}