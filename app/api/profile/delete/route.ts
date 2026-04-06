import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type DeleteProfileSuccess = { ok: true };
type DeleteProfileError = { ok: false; error: string };

export async function POST(): Promise<Response> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      const response: DeleteProfileError = { ok: false, error: authError.message };
      return NextResponse.json(response, { status: 401, headers: { "Cache-Control": "no-store" } });
    }

    if (!user) {
      const response: DeleteProfileError = { ok: false, error: "User not authenticated." };
      return NextResponse.json(response, { status: 401, headers: { "Cache-Control": "no-store" } });
    }

    const { error: deleteError } = await supabase
      .from("candidate_workspaces")
      .delete()
      .eq("user_id", user.id);

    if (deleteError) {
      const response: DeleteProfileError = { ok: false, error: deleteError.message };
      return NextResponse.json(response, { status: 500, headers: { "Cache-Control": "no-store" } });
    }

    const response: DeleteProfileSuccess = { ok: true };
    return NextResponse.json(response, { status: 200, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown server error.";
    const response: DeleteProfileError = { ok: false, error: message };
    return NextResponse.json(response, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
