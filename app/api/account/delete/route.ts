import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Tables to clear in order (children before parents where FK exists)
// Each entry is the table name and the column that holds the user reference.
// Errors on individual tables are non-fatal — we proceed and always attempt
// auth user deletion last.
const USER_TABLES: Array<{ table: string; column: string }> = [
  { table: "candidate_satisfaction", column: "user_id" },
  { table: "application_clarification_items", column: "user_id" },
  { table: "application_clarification_sessions", column: "user_id" },
  { table: "application_module_logs", column: "user_id" },
  { table: "application_inputs", column: "user_id" },
  { table: "application_outputs", column: "user_id" },
  { table: "application_runs", column: "user_id" },
  { table: "run_performance_evaluations", column: "user_id" },
  { table: "user_feedback", column: "user_id" },
  { table: "tailoring_runs", column: "user_id" },
  { table: "profile_onboarding_sessions", column: "user_id" },
  { table: "candidate_profiles", column: "user_id" },
  { table: "candidate_workspaces", column: "user_id" },
];

export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { ok: false, message: "Not authenticated." },
        { status: 401 }
      );
    }

    // Parse body — require explicit confirmation flag
    const body = (await req.json().catch(() => ({}))) as { confirmed?: boolean };
    if (!body.confirmed) {
      return NextResponse.json(
        { ok: false, message: "Confirmation required." },
        { status: 400 }
      );
    }

    const userId = user.id;
    const tableErrors: string[] = [];

    // Delete user data from all tables — non-fatal per table
    for (const { table, column } of USER_TABLES) {
      const { error } = await supabaseAdmin
        .from(table)
        .delete()
        .eq(column, userId);

      if (error) {
        // Log but continue — table may not exist or column may differ
        tableErrors.push(`${table}: ${error.message}`);
      }
    }

    // Delete the auth user — this is the critical step
    const { error: deleteUserError } =
      await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteUserError) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "We ran into a problem deleting your account. Please contact us and we will complete the deletion manually.",
          details: deleteUserError.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Account deletion failed:", error);
    return NextResponse.json(
      {
        ok: false,
        message:
          "Something went wrong. Please contact us and we will complete the deletion manually.",
      },
      { status: 500 }
    );
  }
}
