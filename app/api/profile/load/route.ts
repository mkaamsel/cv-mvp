import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { loadOrCreateCandidateWorkspace } from "@/lib/profile/profile-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type LoadProfileSuccess = {
  ok: true;
  workspace: {
    profile: unknown;
    capabilityInventory?: unknown;
    documents: unknown[];
    meta: Record<string, unknown>;
    createdAt: string | null;
    updatedAt: string | null;
  } | null;
};

type LoadProfileError = {
  ok: false;
  error: string;
};

export async function GET(): Promise<Response> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      const response: LoadProfileError = {
        ok: false,
        error: authError.message,
      };

      return NextResponse.json(response, {
        status: 401,
        headers: {
          "Cache-Control": "no-store",
        },
      });
    }

    if (!user) {
      const response: LoadProfileError = {
        ok: false,
        error: "User not authenticated.",
      };

      return NextResponse.json(response, {
        status: 401,
        headers: {
          "Cache-Control": "no-store",
        },
      });
    }

    const workspace = await loadOrCreateCandidateWorkspace(user.id);

    const response: LoadProfileSuccess = {
      ok: true,
      workspace: workspace
        ? {
            profile: workspace.profile ?? null,
            capabilityInventory: workspace.capabilityInventory ?? null,
            documents: Array.isArray(workspace.documents) ? workspace.documents : [],
            meta:
              workspace.meta &&
              typeof workspace.meta === "object" &&
              !Array.isArray(workspace.meta)
                ? workspace.meta
                : {},
            createdAt:
              typeof workspace.createdAt === "string" ? workspace.createdAt : null,
            updatedAt:
              typeof workspace.updatedAt === "string" ? workspace.updatedAt : null,
          }
        : null,
    };

    return NextResponse.json(response, {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown server error.";

    const response: LoadProfileError = {
      ok: false,
      error: message,
    };

    return NextResponse.json(response, {
      status: 500,
      headers: {
        "Cache-Control": "no-store",
      },
    });
  }
}
