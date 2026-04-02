import { NextRequest, NextResponse } from "next/server";
import {
  buildEvidenceSelectionPrompt,
  parseEvidenceSelectionResponse,
} from "@/lib/ai/selectEvidence";

import type {
  CandidateProfile,
  JobProfile,
  RequiredProfile,
  CompanyContext,
  EvidencePackage,
  SelectEvidenceRequestBody,
} from "@/types/evidence";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as SelectEvidenceRequestBody;

    if (!body?.candidateProfile) {
      return NextResponse.json(
        { error: "Missing candidateProfile." },
        { status: 400 }
      );
    }

    if (!body?.jobProfile) {
      return NextResponse.json(
        { error: "Missing jobProfile." },
        { status: 400 }
      );
    }

    if (!body?.requiredProfile) {
      return NextResponse.json(
        { error: "Missing requiredProfile." },
        { status: 400 }
      );
    }

    const prompt = buildEvidenceSelectionPrompt({
      candidateProfile: body.candidateProfile,
      jobProfile: body.jobProfile,
      requiredProfile: body.requiredProfile,
      companyContext: body.companyContext,
      outputLanguage: body.outputLanguage || "de",
    });

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-5-mini",
        input: prompt,
      }),
    });

    if (!response.ok) {
      const err = await response.text();

      return NextResponse.json(
        { error: "OpenAI request failed", details: err },
        { status: 500 }
      );
    }

    const data = await response.json();

    const evidencePackage: EvidencePackage =
      parseEvidenceSelectionResponse(data);

    return NextResponse.json({
      success: true,
      evidencePackage,
    });
  } catch (error) {
    console.error("select-evidence error:", error);

    return NextResponse.json(
      {
        error: "Evidence selection failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}