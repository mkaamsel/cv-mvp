import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUserId } from "@/lib/profile/profile-store";

export type StructuredJob = {
  companyName: string;
  jobTitle: string;
  location: string;
  responsibilities: string[];
  requirements: string[];
  summary: string;
};

export type CompanyContext = {
  industry: string[];
  financeEnvironment: string[];
  reportingEnvironment: string[];
  leadershipScope: string[];
  operatingSignals: string[];
  cultureSignals: string[];
  summary: string;
};

export type RequirementAnalysisItem = {
  requirement: string;
  importance: "blocker" | "core" | "supporting" | "preferred";
  matchStatus: "matched" | "adjacent" | "weak" | "missing";
  notes: string;
};

export type ApplicationRecommendation =
  | {
      ok: true;
      applicationRecommendation:
        | "apply_confidently"
        | "apply_with_care"
        | "borderline"
        | "not_recommended";
      reasoningSummary: string;
      advisorMessage: string;
      strongMatches: string[];
      stretchMatches: string[];
      riskAreas: string[];
      blockers: string[];
      positioningStrategy: string;
      requirementsAnalysis: RequirementAnalysisItem[];
      meta: {
        model: string;
        locale: "en" | "de";
      };
    }
  | {
      ok: false;
      error: string;
    };

export type TailoringRun = {
  id: string;
  userId: string;
  jobUrl: string | null;
  jobDescriptionInput: string | null;
  normalizedUrl: string | null;
  outputLanguage: string | null;
  structuredJob: StructuredJob | null;
  extractedText: string | null;
  extractionSource: string | null;
  warnings: string[];
  companyContext: CompanyContext | null;
  applicationRecommendation: ApplicationRecommendation | null;
  createdAt: string | null;
  updatedAt: string | null;
};

type TailoringRunRow = {
  id: string;
  user_id: string;
  job_url: string | null;
  job_description_input: string | null;
  normalized_url: string | null;
  output_language: string | null;
  structured_job_json: StructuredJob | null;
  extracted_text: string | null;
  extraction_source: string | null;
  warnings_json: string[] | null;
  company_context_json: CompanyContext | null;
  application_recommendation_json: ApplicationRecommendation | null;
  created_at: string | null;
  updated_at: string | null;
};

export type SaveTailoringRunInput = {
  jobUrl?: string | null;
  jobDescriptionInput?: string | null;
  normalizedUrl?: string | null;
  outputLanguage?: string | null;
  structuredJob?: StructuredJob | null;
  extractedText?: string | null;
  extractionSource?: string | null;
  warnings?: string[];
  companyContext?: CompanyContext | null;
  applicationRecommendation?: ApplicationRecommendation | null;
};

function mapTailoringRunRow(row: TailoringRunRow): TailoringRun {
  return {
    id: row.id,
    userId: row.user_id,
    jobUrl: row.job_url,
    jobDescriptionInput: row.job_description_input,
    normalizedUrl: row.normalized_url,
    outputLanguage: row.output_language,
    structuredJob: row.structured_job_json,
    extractedText: row.extracted_text,
    extractionSource: row.extraction_source,
    warnings: row.warnings_json ?? [],
    companyContext: row.company_context_json,
    applicationRecommendation: row.application_recommendation_json,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function saveTailoringRun(
  input: SaveTailoringRunInput
): Promise<TailoringRun> {
  const supabase = await createSupabaseServerClient();
  const userId = await getCurrentUserId();

  const { data, error } = await supabase
    .from("tailoring_runs")
    .insert({
      user_id: userId,
      job_url: input.jobUrl ?? null,
      job_description_input: input.jobDescriptionInput ?? null,
      normalized_url: input.normalizedUrl ?? null,
      output_language: input.outputLanguage ?? null,
      structured_job_json: input.structuredJob ?? null,
      extracted_text: input.extractedText ?? null,
      extraction_source: input.extractionSource ?? null,
      warnings_json: input.warnings ?? [],
      company_context_json: input.companyContext ?? null,
      application_recommendation_json: input.applicationRecommendation ?? null,
    })
    .select(
      "id, user_id, job_url, job_description_input, normalized_url, output_language, structured_job_json, extracted_text, extraction_source, warnings_json, company_context_json, application_recommendation_json, created_at, updated_at"
    )
    .single<TailoringRunRow>();

  if (error) {
    throw new Error(error.message);
  }

  return mapTailoringRunRow(data);
}

export async function loadTailoringRun(id: string): Promise<TailoringRun | null> {
  const supabase = await createSupabaseServerClient();
  const userId = await getCurrentUserId();

  const { data, error } = await supabase
    .from("tailoring_runs")
    .select(
      "id, user_id, job_url, job_description_input, normalized_url, output_language, structured_job_json, extracted_text, extraction_source, warnings_json, company_context_json, application_recommendation_json, created_at, updated_at"
    )
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle<TailoringRunRow>();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  return mapTailoringRunRow(data);
}

export async function listTailoringRuns(limit = 20): Promise<TailoringRun[]> {
  const supabase = await createSupabaseServerClient();
  const userId = await getCurrentUserId();

  const { data, error } = await supabase
    .from("tailoring_runs")
    .select(
      "id, user_id, job_url, job_description_input, normalized_url, output_language, structured_job_json, extracted_text, extraction_source, warnings_json, company_context_json, application_recommendation_json, created_at, updated_at"
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<TailoringRunRow[]>();

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapTailoringRunRow);
}