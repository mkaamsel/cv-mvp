import { saveTailoringRun } from "@/lib/tailoring/tailoring-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type StructuredJob = {
  companyName: string;
  jobTitle: string;
  location: string;
  responsibilities: string[];
  requirements: string[];
  summary: string;
};

type CompanyContext = {
  industry: string[];
  financeEnvironment: string[];
  reportingEnvironment: string[];
  leadershipScope: string[];
  operatingSignals: string[];
  cultureSignals: string[];
  summary: string;
};

type RequirementAnalysisItem = {
  requirement: string;
  importance: "blocker" | "core" | "supporting" | "preferred";
  matchStatus: "matched" | "adjacent" | "weak" | "missing";
  notes: string;
};

type ApplicationRecommendation =
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

type SaveTailoringRequest = {
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

type SaveTailoringSuccess = {
  ok: true;
  run: Awaited<ReturnType<typeof saveTailoringRun>>;
};

type SaveTailoringError = {
  ok: false;
  error: string;
};

function jsonResponse(
  body: SaveTailoringSuccess | SaveTailoringError,
  status = 200
): Response {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

export async function POST(request: Request): Promise<Response> {
  try {
    const body = (await request.json()) as SaveTailoringRequest;

    const run = await saveTailoringRun({
      jobUrl: body.jobUrl,
      jobDescriptionInput: body.jobDescriptionInput,
      normalizedUrl: body.normalizedUrl,
      outputLanguage: body.outputLanguage,
      structuredJob: body.structuredJob,
      extractedText: body.extractedText,
      extractionSource: body.extractionSource,
      warnings: body.warnings ?? [],
      companyContext: body.companyContext,
      applicationRecommendation: body.applicationRecommendation,
    });

    return jsonResponse({
      ok: true,
      run,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown server error.";

    return jsonResponse(
      {
        ok: false,
        error: message,
      },
      500
    );
  }
}