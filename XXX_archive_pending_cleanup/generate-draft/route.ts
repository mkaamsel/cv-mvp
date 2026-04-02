import { NextRequest, NextResponse } from "next/server";
import { runApplicationPipeline } from "@/lib/orchestration/runApplicationPipeline";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const { cvText, jobDescription, outputLanguage } = body;

    if (!cvText || !jobDescription) {
      return NextResponse.json(
        { error: "Missing CV or job description." },
        { status: 400 }
      );
    }

    const result = await runApplicationPipeline({
      candidateInput: { rawText: cvText },
      jobInput: { rawText: jobDescription },
      outputLanguage: outputLanguage === "de" ? "de" : "en",
    });

    return NextResponse.json({
      ok: true,
      bundle: result.bundle,
      cvDraft: result.drafts.cv,
      coverLetterDraft: result.drafts.coverLetter,
      warning:
        "This route is deprecated. Migrate UI calls to the canonical tailoring route.",
    });
  } catch (error) {
    console.error("Draft generation failed", error);
    return NextResponse.json(
      { error: "Server error generating draft." },
      { status: 500 }
    );
  }
}