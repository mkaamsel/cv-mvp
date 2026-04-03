import { NextRequest, NextResponse } from "next/server";
import { runTailoringPipeline } from "@/lib/orchestration/tailoring/runTailoringPipeline";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      return NextResponse.json(
        {
          ok: false,
          message: authError.message,
        },
        { status: 401 }
      );
    }

    if (!user) {
      return NextResponse.json(
        {
          ok: false,
          message: "User not authenticated.",
        },
        { status: 401 }
      );
    }

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const { count: dailyRunCount, error: dailyRunError } = await supabase
      .from("tailoring_runs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", startOfDay.toISOString());

    if (dailyRunError) {
      return NextResponse.json(
        {
          ok: false,
          message: dailyRunError.message,
        },
        { status: 500 }
      );
    }

    if ((dailyRunCount ?? 0) >= 10) {
      return NextResponse.json(
        {
          ok: false,
          message: "Daily run limit reached. Please try again tomorrow.",
        },
        { status: 429 }
      );
    }

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
          ok: false,
          message: result.message,
          details: result.details ?? null,
        },
        { status: result.status }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Tailoring route failed:", error);

    return NextResponse.json(
      {
        ok: false,
        message: "The canonical tailoring pipeline failed.",
      },
      { status: 500 }
    );
  }
}