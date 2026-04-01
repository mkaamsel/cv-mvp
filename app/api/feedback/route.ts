import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

type FeedbackPayload = {
  runId?: string | null;
  stage?: string;
  stars?: number;
  comment?: string | null;
  page?: string | null;
  stepTimeMs?: number | null;
};

function asTrimmedString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function asOptionalInteger(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) ? value : null;
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    route: "feedback",
    method: "GET",
    message: "Feedback route is live. Use POST to submit feedback.",
  });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as FeedbackPayload;

    const stage = asTrimmedString(body.stage);
    const runId = asTrimmedString(body.runId);
    const comment = asTrimmedString(body.comment);
    const page = asTrimmedString(body.page);
    const stepTimeMs = asOptionalInteger(body.stepTimeMs);

    const stars =
      typeof body.stars === "number" && Number.isInteger(body.stars) ? body.stars : null;

    if (!stage) {
      return NextResponse.json(
        { ok: false, error: "Missing feedback stage." },
        { status: 400 }
      );
    }

    if (!stars || stars < 1 || stars > 10) {
      return NextResponse.json(
        { ok: false, error: "Stars must be an integer from 1 to 10." },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      return NextResponse.json(
        { ok: false, error: authError.message },
        { status: 401 }
      );
    }

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "User not authenticated." },
        { status: 401 }
      );
    }

    const insertPayload = {
      run_id: runId,
      user_id: user.id,
      stage,
      stars,
      comment,
      page,
      step_time_ms: stepTimeMs,
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabaseAdmin
      .from("user_feedback")
      .insert(insertPayload)
      .select("id, run_id, stage, stars, created_at")
      .single();

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Feedback stored successfully.",
      feedback: data,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unexpected error.",
      },
      { status: 500 }
    );
  }
}