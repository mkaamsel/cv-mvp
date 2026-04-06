import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SatisfactionPayload = {
  runId?: unknown;
  cvRepresentsAccurately?: unknown;
  coverLetterSoundsLikeMe?: unknown;
  wouldSendAsIs?: unknown;
};

function asOptionalBoolean(value: unknown): boolean | null {
  if (value === true || value === false) return value;
  return null;
}

function asTrimmedString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
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

    const body = (await req.json()) as SatisfactionPayload;

    const runId = asTrimmedString(body.runId);

    if (!runId) {
      return NextResponse.json(
        { ok: false, error: "runId is required." },
        { status: 400 }
      );
    }

    // Verify run belongs to this user
    const { data: run, error: runError } = await supabaseAdmin
      .from("tailoring_runs")
      .select("id, user_id")
      .eq("client_run_id", runId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (runError) {
      return NextResponse.json(
        { ok: false, error: runError.message },
        { status: 500 }
      );
    }

    if (!run) {
      return NextResponse.json(
        { ok: false, error: "Invalid runId for this user." },
        { status: 403 }
      );
    }

    const cvRepresentsAccurately = asOptionalBoolean(body.cvRepresentsAccurately);
    const coverLetterSoundsLikeMe = asOptionalBoolean(body.coverLetterSoundsLikeMe);
    const wouldSendAsIs = asOptionalBoolean(body.wouldSendAsIs);

    const { data, error: insertError } = await supabaseAdmin
      .from("candidate_satisfaction")
      .insert({
        user_id: user.id,
        client_run_id: runId,
        cv_represents_accurately: cvRepresentsAccurately,
        cover_letter_sounds_like_me: coverLetterSoundsLikeMe,
        would_send_as_is: wouldSendAsIs,
        created_at: new Date().toISOString(),
      })
      .select("id, client_run_id, cv_represents_accurately, cover_letter_sounds_like_me, would_send_as_is, created_at")
      .single();

    if (insertError) {
      return NextResponse.json(
        { ok: false, error: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Satisfaction signals stored.",
      data,
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
