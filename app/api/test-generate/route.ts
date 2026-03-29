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
};

type TestGenerateModelOutput = {
  cvDraft: string;
  coverLetterDraft: string;
  generationNotes?: string[];
};

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

    if (!candidateText) {
      return Response.json(
        { error: "candidateText is required." },
        { status: 400 }
      );
    }

    if (!jobDescriptionText) {
      return Response.json(
        { error: "jobDescriptionText is required." },
        { status: 400 }
      );
    }

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

    const competencyProfile: CompetencyProfileOutput =
      await competencyProfileModule({
        candidateText,
        jobDescriptionText,
      });

    await updateRunStage({
      runId,
      currentStage: "evidence_selected",
      status: "running",
      warnings: accumulatedWarnings,
    });

    const selectedEvidence: SelectedEvidenceOutput =
      await selectedEvidenceModule({
        candidateText,
        jobDescriptionText,
      });

    await updateRunStage({
      runId,
      currentStage: "positioning_built",
      status: "running",
      warnings: accumulatedWarnings,
    });

    const positioningBrief: PositioningBriefOutput =
      await positioningBriefModule({
        candidateText,
        jobDescriptionText,
        selectedEvidence,
        competencyProfile,
      });

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

    const generationResponse = await openai.responses.create({
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
    });

    const parsedGeneration = JSON.parse(
      generationResponse.output_text
    ) as TestGenerateModelOutput;

    const draftCv = parsedGeneration.cvDraft;
    const draftCoverLetter = parsedGeneration.coverLetterDraft;
    const generationNotes = parsedGeneration.generationNotes || [];

    if (generationNotes.length > 0) {
      accumulatedWarnings = generationNotes;
    }

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

    const reviewResult = await reviewModule({
      candidateText,
      jobDescriptionText,
      outputLanguage,
      cvDraft: draftCv,
      coverLetterDraft: draftCoverLetter,
    });

    const finalCv = reviewResult.finalCv || draftCv;
    const finalCoverLetter =
      reviewResult.finalCoverLetter || draftCoverLetter;
    const reviewFindings = reviewResult.reviewFindings || [];
    const discoverySignals = reviewResult.profileDiscoverySignals || [];

    await saveOutputs({
      runId,
      draftCv,
      draftCoverLetter,
      finalCv,
      finalCoverLetter,
      reviewFindings,
      discoverySignals,
    });

    await completeRun({
      runId,
      durationMs: Date.now() - startedAt,
      warnings: accumulatedWarnings,
    });

    return Response.json({
      ok: true,
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
      review: reviewResult,
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