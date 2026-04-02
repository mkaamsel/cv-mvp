import { NextRequest, NextResponse } from "next/server";
import { runTailoringPipeline } from "@/lib/orchestration/tailoring/runTailoringPipeline";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type TailoringRequest = {
  jobUrl?: string;
  url?: string;
  jobDescriptionText?: string;
  jobDescription?: string;
  outputLanguage?: "en" | "de" | string;
  candidateProfile?: Record<string, unknown> | null;
};

function asString(value: unknown): string | null {
  return typeof value === "string" ? value.trim() : null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as TailoringRequest;

    const result = await runTailoringPipeline({
      origin: req.nextUrl.origin,
      cookieHeader: req.headers.get("cookie") ?? "",
      jobUrl: asString(body.jobUrl) ?? asString(body.url) ?? "",
      jobDescriptionText:
        asString(body.jobDescriptionText) ?? asString(body.jobDescription) ?? "",
      outputLanguage: body.outputLanguage,
      candidateProfile: asRecord(body.candidateProfile),
    });

    if (!result.ok) {
      return NextResponse.json(
        {
          message: result.message,
          details: result.details ?? null,
        },
        { status: result.status },
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Tailoring route failed:", error);

    return NextResponse.json(
      {
        message: "The canonical tailoring pipeline failed.",
      },
      { status: 500 },
    );
  }
}