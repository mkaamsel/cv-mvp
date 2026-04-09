import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { normalizeArray } from "@/lib/profile/onboarding";

function mergeValue(existing: unknown, incoming: unknown) {
  if (Array.isArray(existing) || Array.isArray(incoming)) {
    const existingArray = Array.isArray(existing) ? existing : [];
    const incomingArray = Array.isArray(incoming) ? incoming : [incoming];
    return normalizeArray([...existingArray, ...incomingArray]);
  }

  if (typeof incoming === "string" && incoming.trim()) {
    return incoming.trim();
  }

  return existing ?? null;
}

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = await req.json();
    const sessionId = String(body.sessionId || "");
    const answers =
      body.answers && typeof body.answers === "object" ? body.answers : {};

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required." },
        { status: 400 },
      );
    }

    const { data: session, error: sessionError } = await supabase
      .from("profile_onboarding_sessions")
      .select("*")
      .eq("id", sessionId)
      .eq("user_id", user.id)
      .single();

    if (sessionError || !session) {
      console.error("Session fetch error:", sessionError);
      return NextResponse.json(
        { error: "Onboarding session not found." },
        { status: 404 },
      );
    }

    const extractedProfile =
      session.extracted_profile && typeof session.extracted_profile === "object"
        ? { ...session.extracted_profile }
        : {};

    for (const [key, value] of Object.entries(answers)) {
      extractedProfile[key] = mergeValue(extractedProfile[key], value);
    }

    const { error: profileUpdateError } = await supabase
      .from("candidate_profiles")
      .update({
        ...extractedProfile,
        profile_status: "complete",
        updated_at: new Date().toISOString(),
      })
      .eq("id", session.candidate_profile_id)
      .eq("user_id", user.id);

    if (profileUpdateError) {
      console.error("Profile update error:", profileUpdateError);
      return NextResponse.json(
        { error: "Failed to update candidate profile." },
        { status: 500 },
      );
    }

    const { error: sessionUpdateError } = await supabase
      .from("profile_onboarding_sessions")
      .update({
        answers,
        extracted_profile: extractedProfile,
        missing_fields: [],
        questions: [],
        status: "complete",
        updated_at: new Date().toISOString(),
      })
      .eq("id", sessionId)
      .eq("user_id", user.id);

    if (sessionUpdateError) {
      console.error("Session update error:", sessionUpdateError);
      return NextResponse.json(
        { error: "Failed to update onboarding session." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      profile: extractedProfile,
      message: "Your canonical profile has been saved.",
    });
  } catch (error) {
    console.error("Complete onboarding route error:", error);
    return NextResponse.json(
      { error: "Failed to complete profile onboarding." },
      { status: 500 },
    );
  }
}
