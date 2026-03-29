import OpenAI from "openai";
import { buildTestGeneratePrompt } from "@/lib/prompts/testGeneratePrompt";
import { reviewModule } from "@/lib/intelligence/modules/reviewModule";
import {
  competencyProfileModule,
  type CompetencyProfileOutput,
} from "@/lib/intelligence/modules/competencyProfileModule";
import {
  selectedEvidenceModule,
  type SelectedEvidenceOutput,
} from "@/lib/intelligence/modules/selectedEvidenceModule";
import {
  positioningBriefModule,
  type PositioningBriefOutput,
} from "@/lib/intelligence/modules/positioningBriefModule";
import {
  createRun,
  updateRunStage,
  completeRun,
  failRun,
} from "@/lib/supabase/runLogger";
import { saveInputs } from "@/lib/supabase/saveInputs";
import { saveOutputs } from "@/lib/supabase/saveOutputs";
import { safeParseJSON } from "@/lib/intelligence/core/safeParseJSON";
import { executeModuleSafely } from "@/lib/intelligence/core/executeModuleSafely";
import { withTimeout } from "@/lib/intelligence/core/withTimeout";
import { guardGenerationInputs } from "@/lib/intelligence/core/inputGuard";
import {
  createClarificationSession,
  saveClarificationItems,
} from "@/lib/supabase/clarificationLogger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type OutputLanguage = "English" | "German";
type GenerationMode = "fast" | "reviewed";

type TestGenerateRequest = {
  candidateText?: string;
  jobDescriptionText?: string;
  outputLanguage?: OutputLanguage;
  mode?: GenerationMode;
  userId?: string;
};

type TestGenerateModelOutput = {
  cvDraft: string;
  coverLetterDraft: string;
  generationNotes?: string[];
};

type ReviewFinding = {
  severity: "high" | "medium" | "low";
  area: "cv" | "cover_letter" | "both";
  issue: string;
  recommendation: string;
};

type ReviewOutput = {
  reviewFindings: ReviewFinding[];
  finalCv: string;
  finalCoverLetter: string;
  profileDiscoverySignals: string[];
};

type ClarificationCandidate = {
  itemKey: string;
  itemGroup: string;
  prompt: string;
  detectedFrom: string;
  importance: "high" | "medium" | "low";
  suggestedValue?: string;
  mapsToProfileKey?: string;
};

function normalizeForDedup(value: string) {
  return value.trim().toLowerCase();
}

function buildClarificationCandidates(params: {
  selectedEvidence: SelectedEvidenceOutput;
  positioningBrief: PositioningBriefOutput;
  review: ReviewOutput | null;
}): ClarificationCandidate[] {
  const candidates: ClarificationCandidate[] = [];

  const push = (candidate: ClarificationCandidate) => {
    candidates.push(candidate);
  };

  const evidenceGaps = params.selectedEvidence.evidenceGaps ?? [];
  const positioningRisks = params.positioningBrief.positioningRisks ?? [];
  const discoverySignals = params.review?.profileDiscoverySignals ?? [];
  const reviewFindings = params.review?.reviewFindings ?? [];

  const allSignals = [
    ...evidenceGaps.map((text) => ({ text, source: "evidence_gap" })),
    ...positioningRisks.map((text) => ({ text, source: "positioning_risk" })),
    ...discoverySignals.map((text) => ({ text, source: "profile_discovery_signal" })),
    ...reviewFindings.map((item) => ({
      text: `${item.issue} ${item.recommendation}`,
      source: "review_finding",
    })),
  ];

  for (const signal of allSignals) {
    const text = signal.text.toLowerCase();

    if (
      text.includes("education") ||
      text.includes("qualification") ||
      text.includes("studium") ||
      text.includes("bilanzbuchhalter")
    ) {
      push({
        itemKey: "education.qualification",
        itemGroup: "education",
        prompt:
          "I did not find your education or formal qualification clearly stated. What degree, qualification, or relevant certification should be added, if accurate?",
        detectedFrom: signal.source,
        importance: "high",
        mapsToProfileKey: "education.degree",
      });
    }

    if (
      text.includes("language") ||
      text.includes("sprach") ||
      text.includes("german") ||
      text.includes("english")
    ) {
      push({
        itemKey: "languages.levels",
        itemGroup: "languages",
        prompt:
          "I did not find your language levels clearly stated. How should German and English be described in your profile?",
        detectedFrom: signal.source,
        importance: "high",
        mapsToProfileKey: "languages.german",
      });
    }

    if (text.includes("excel")) {
      push({
        itemKey: "tools.excel",
        itemGroup: "tools",
        prompt:
          "Excel is not clearly evidenced. How would you like your Excel proficiency described, if accurate (for example: advanced pivots, lookups, reporting, reconciliations)?",
        detectedFrom: signal.source,
        importance: "high",
        mapsToProfileKey: "tools.excel",
      });
    }

    if (text.includes("sap fi")) {
      push({
        itemKey: "systems.sap_fi",
        itemGroup: "systems",
        prompt:
          "SAP FI is not explicitly stated. Did your SAP-based closing work include SAP FI scope, and if so how would you describe it accurately?",
        detectedFrom: signal.source,
        importance: "high",
        mapsToProfileKey: "systems.sap_fi",
      });
    }

    if (
      text.includes("treasury") ||
      text.includes("consolidation") ||
      text.includes("central functions") ||
      text.includes("zentral")
    ) {
      push({
        itemKey: "reporting.central_functions",
        itemGroup: "reporting",
        prompt:
          "I found limited explicit detail on reporting to central functions such as consolidation, treasury, or finance. Did you prepare or support such submissions, and how should that be stated accurately?",
        detectedFrom: signal.source,
        importance: "medium",
        mapsToProfileKey: "reporting.consolidation_submissions",
      });
    }

    if (
      text.includes("tax") ||
      text.includes("vat") ||
      text.includes("cit") ||
      text.includes("zm")
    ) {
      push({
        itemKey: "tax.filings",
        itemGroup: "tax",
        prompt:
          "I did not find clear evidence of tax filings. Did you directly prepare VAT, corporate tax, or ZM filings, support them, or only work with related provisions and records?",
        detectedFrom: signal.source,
        importance: "medium",
        mapsToProfileKey: "tax.vat_filings",
      });
    }

    if (
      text.includes("betriebsprüfer") ||
      text.includes("tax audit") ||
      text.includes("wirtschaftsprüfer") ||
      text.includes("external auditors")
    ) {
      push({
        itemKey: "audit.scope",
        itemGroup: "audit",
        prompt:
          "Would you like to clarify your audit interaction more precisely, for example with external auditors or tax auditors, if this is accurate?",
        detectedFrom: signal.source,
        importance: "medium",
        mapsToProfileKey: "audit.external_audit",
      });
    }

    if (
      text.includes("leadership") ||
      text.includes("team size") ||
      text.includes("span")
    ) {
      push({
        itemKey: "leadership.scope",
        itemGroup: "leadership",
        prompt:
          "Your leadership scope may be undercaptured. If accurate, what team size, locations, or coordination scope should be added?",
        detectedFrom: signal.source,
        importance: "low",
        mapsToProfileKey: "leadership.scope",
      });
    }
  }

  const deduped = new Map<string, ClarificationCandidate>();

  for (const candidate of candidates) {
    const key = normalizeForDedup(candidate.itemKey);
    if (!deduped.has(key)) {
      deduped.set(key, candidate);
    }
  }

  return Array.from(deduped.values()).slice(0, 8);
}

export async function POST(req: Request) {
  const startedAt = Date.now();

  let runId: string | null = null;
  let accumulatedWarnings: string[] = [];

  try {
    const body = (await req.json()) as TestGenerateRequest;

    const candidateText = body.candidateText?.trim() || "";
    const jobDescriptionText = body.jobDescriptionText?.trim() || "";
    const outputLanguage: OutputLanguage =
      body.outputLanguage === "German" ? "German" : "English";
    const mode: GenerationMode = body.mode === "fast" ? "fast" : "reviewed";
    const userId = body.userId?.trim() || "";

    const guardResult = guardGenerationInputs({
      candidateText,
      jobDescriptionText,
    });

    if (!guardResult.ok) {
      return Response.json(
        {
          error: guardResult.errors[0] ?? "Input validation failed.",
          details: guardResult.errors,
          warnings: guardResult.warnings,
          metrics: guardResult.metrics,
        },
        { status: 400 }
      );
    }

    accumulatedWarnings = [...guardResult.warnings];

    runId = await createRun({
      mode,
      outputLanguage,
      modelName: "gpt-5",
    });

    await saveInputs({
      runId,
      cvSourceType: "pasted-text",
      cvFileName: null,
      cvOriginalText: candidateText,
      cvProcessedText: candidateText,
      jobSourceType: "pasted-text",
      jobUrl: null,
      jobOriginalText: jobDescriptionText,
      jobProcessedText: jobDescriptionText,
      extractionWarnings: [],
    });

    await updateRunStage({
      runId,
      currentStage: "competencies_mapped",
      status: "running",
      warnings: accumulatedWarnings,
    });

    const [competencyResult, selectedEvidenceResult] = await Promise.all([
      executeModuleSafely("competencyProfileModule", () =>
        competencyProfileModule({
          candidateText,
          jobDescriptionText,
        })
      ),
      executeModuleSafely("selectedEvidenceModule", () =>
        selectedEvidenceModule({
          candidateText,
          jobDescriptionText,
        })
      ),
    ]);

    if (!competencyResult.ok || !competencyResult.data) {
      accumulatedWarnings.push(
        competencyResult.error ?? "competencyProfileModule failed."
      );
    }

    const competencyProfile: CompetencyProfileOutput =
      competencyResult.data ?? {
        competencies: [],
        competencySummary: "",
        underEvidencedButRelevant: [],
      };

    await updateRunStage({
      runId,
      currentStage: "evidence_selected",
      status: "running",
      warnings: accumulatedWarnings,
    });

    if (!selectedEvidenceResult.ok || !selectedEvidenceResult.data) {
      accumulatedWarnings.push(
        selectedEvidenceResult.error ?? "selectedEvidenceModule failed."
      );
    }

    const selectedEvidence: SelectedEvidenceOutput =
      selectedEvidenceResult.data ?? {
        selectedEvidence: [],
        evidenceGaps: [],
        evidenceSummary: "",
      };

    await updateRunStage({
      runId,
      currentStage: "positioning_built",
      status: "running",
      warnings: accumulatedWarnings,
    });

    const positioningBriefResult = await executeModuleSafely(
      "positioningBriefModule",
      () =>
        positioningBriefModule({
          candidateText,
          jobDescriptionText,
          selectedEvidence,
          competencyProfile,
        })
    );

    if (!positioningBriefResult.ok || !positioningBriefResult.data) {
      accumulatedWarnings.push(
        positioningBriefResult.error ?? "positioningBriefModule failed."
      );
    }

    const positioningBrief: PositioningBriefOutput =
      positioningBriefResult.data ?? {
        positioningStrength: "measured",
        positioningTone: "specialist",
        coreWhyFit: [],
        positioningRisks: [],
        positioningStrategy: "",
        coverLetterAngle: "",
        cvEmphasis: [],
      };

    const prompt = buildTestGeneratePrompt({
      candidateText,
      jobDescriptionText,
      outputLanguage,
      competencyProfileJson: JSON.stringify(competencyProfile, null, 2),
      selectedEvidenceJson: JSON.stringify(selectedEvidence, null, 2),
      positioningBriefJson: JSON.stringify(positioningBrief, null, 2),
    });

    await updateRunStage({
      runId,
      currentStage: "cv_drafted",
      status: "running",
      warnings: accumulatedWarnings,
    });

    const generationResponse = await withTimeout(
      openai.responses.create({
        model: "gpt-5",
        input: prompt,
        text: {
          format: {
            type: "json_schema",
            name: "test_generate_output",
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                cvDraft: { type: "string" },
                coverLetterDraft: { type: "string" },
                generationNotes: {
                  type: "array",
                  items: { type: "string" },
                },
              },
              required: ["cvDraft", "coverLetterDraft", "generationNotes"],
            },
          },
        },
      }),
      120000
    );

    const parsedGeneration =
      safeParseJSON<TestGenerateModelOutput>(generationResponse.output_text);

    if (!parsedGeneration) {
      throw new Error("Draft generator returned invalid JSON.");
    }

    const draftCv = parsedGeneration.cvDraft ?? "";
    const draftCoverLetter = parsedGeneration.coverLetterDraft ?? "";
    const generationNotes = Array.isArray(parsedGeneration.generationNotes)
      ? parsedGeneration.generationNotes
      : [];

    const systemWarningsBeforeNotes = [...accumulatedWarnings];

    if (generationNotes.length > 0) {
      accumulatedWarnings = [...accumulatedWarnings, ...generationNotes];
    }

    const finalStatus =
      systemWarningsBeforeNotes.length > 0 ? "partial" : "success";

    if (mode === "fast") {
      await saveOutputs({
        runId,
        draftCv,
        draftCoverLetter,
        finalCv: draftCv,
        finalCoverLetter: draftCoverLetter,
        reviewFindings: [],
        discoverySignals: [],
      });

      await completeRun({
        runId,
        durationMs: Date.now() - startedAt,
        warnings: accumulatedWarnings,
      });

      return Response.json({
        ok: true,
        status: finalStatus,
        warnings: accumulatedWarnings,
        inputMetrics: guardResult.metrics,
        runId,
        mode,
        outputLanguage,
        intelligence: {
          competencyProfile,
          selectedEvidence,
          positioningBrief,
        },
        draft: {
          cvDraft: draftCv,
          coverLetterDraft: draftCoverLetter,
          generationNotes,
        },
        review: null,
        clarification: {
          sessionId: null,
          items: [],
        },
      });
    }

    await updateRunStage({
      runId,
      currentStage: "cover_letter_drafted",
      status: "running",
      warnings: accumulatedWarnings,
    });

    await updateRunStage({
      runId,
      currentStage: "review_completed",
      status: "running",
      warnings: accumulatedWarnings,
    });

    const reviewResult = await executeModuleSafely("reviewModule", () =>
      reviewModule({
        candidateText,
        jobDescriptionText,
        outputLanguage,
        cvDraft: draftCv,
        coverLetterDraft: draftCoverLetter,
      })
    );

    if (!reviewResult.ok || !reviewResult.data) {
      accumulatedWarnings.push(reviewResult.error ?? "reviewModule failed.");
    }

    const reviewPayload: ReviewOutput = reviewResult.data ?? {
      reviewFindings: [],
      finalCv: draftCv,
      finalCoverLetter: draftCoverLetter,
      profileDiscoverySignals: [],
    };

    const finalCv = reviewPayload.finalCv || draftCv;
    const finalCoverLetter =
      reviewPayload.finalCoverLetter || draftCoverLetter;
    const reviewFindings = reviewPayload.reviewFindings || [];
    const discoverySignals = reviewPayload.profileDiscoverySignals || [];

    await saveOutputs({
      runId,
      draftCv,
      draftCoverLetter,
      finalCv,
      finalCoverLetter,
      reviewFindings,
      discoverySignals,
    });

    let clarificationSessionId: string | null = null;
    let clarificationItems = buildClarificationCandidates({
      selectedEvidence,
      positioningBrief,
      review: reviewPayload,
    });

    if (userId && clarificationItems.length > 0) {
      const clarificationPayload = {
        sourceRunId: runId,
        generatedAt: new Date().toISOString(),
        itemCount: clarificationItems.length,
      };

      clarificationSessionId = await createClarificationSession({
        userId,
        runId,
        clarificationPayload,
      });

      await saveClarificationItems({
        sessionId: clarificationSessionId,
        userId,
        runId,
        items: clarificationItems,
      });
    }

    await completeRun({
      runId,
      durationMs: Date.now() - startedAt,
      warnings: accumulatedWarnings,
    });

    return Response.json({
      ok: true,
      status: finalStatus,
      warnings: accumulatedWarnings,
      inputMetrics: guardResult.metrics,
      runId,
      mode,
      outputLanguage,
      intelligence: {
        competencyProfile,
        selectedEvidence,
        positioningBrief,
      },
      draft: {
        cvDraft: draftCv,
        coverLetterDraft: draftCoverLetter,
        generationNotes,
      },
      review: reviewPayload,
      clarification: {
        sessionId: clarificationSessionId,
        items: clarificationItems,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";

    console.error("test-generate route error:", error);

    if (runId) {
      try {
        await failRun({
          runId,
          errorText: message,
          warnings: accumulatedWarnings,
        });
      } catch (loggingError) {
        console.error("Failed to log failed run:", loggingError);
      }
    }

    return Response.json(
      {
        error: "Failed to generate application drafts.",
      },
      { status: 500 }
    );
  }
}