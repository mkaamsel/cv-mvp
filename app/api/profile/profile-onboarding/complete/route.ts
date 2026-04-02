import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { normalizeArray } from "@/lib/profile/onboarding";

function mergeValue(existing: unknown, incoming: unknown) {
  if (Array.isArray(existing) || Array.isArray(incoming)) {
    return normalizeArray([...(Array.isArray(existing) ? existing : []), ...(Array.isArray(incoming) ? incoming : [incoming])]);
  }

  if (typeof incoming === "string" && incoming.trim()) {
    return incoming.trim();
  }

  return existing ?? null;
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = await req.json();
    const sessionId = String(body.sessionId || "");
    const answers = body.answers ?? {};

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required." },
        { status: 400 }
      );
    }

    const { data: session, error: sessionError } = await supabase
      .from("profile_onboarding_sessions")
      .select("*")
      .eq("id", sessionId)
      .eq("user_id", user.id)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: "Onboarding session not found." },
        { status: 404 }
      );
    }

    const extractedProfile = session.extracted_profile ?? {};
    const mergedProfile = { ...extractedProfile };

    for (const [key, value] of Object.entries(answers)) {
      mergedProfile[key] = mergeValue(mergedProfile[key], value);
    }

    const { error: updateProfileError } = await supabase
      .from("candidate_profiles")
      .update({
        ...mergedProfile,
        profile_status: "complete",
        updated_at: new Date().toISOString(),
      })
      .eq("id", session.candidate_profile_id)
      .eq("user_id", user.id);

    if (updateProfileError) {
      throw updateProfileError;
    }

    const { error: updateSessionError } = await supabase
      .from("profile_onboarding_sessions")
      .update({
        answers,
        extracted_profile: mergedProfile,
        missing_fields: [],
        questions: [],
        status: "complete",
        updated_at: new Date().toISOString(),
      })
      .eq("id", sessionId)
      .eq("user_id", user.id);

    if (updateSessionError) {
      throw updateSessionError;
    }

    return NextResponse.json({
      success: true,
      profile: mergedProfile,
    });
  } catch (error) {
    console.error("Complete onboarding error:", error);

    return NextResponse.json(
      { error: "Failed to complete canonical profile." },
      { status: 500 }
    );
  }
}