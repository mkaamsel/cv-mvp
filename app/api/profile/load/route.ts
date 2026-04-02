import { NextResponse } from "next/server";
import { loadOrCreateCandidateWorkspace } from "@/lib/profile/profile-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type LoadProfileSuccess = {
  ok: true;
  workspace: {
    profile: unknown;
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
    const workspace = await loadOrCreateCandidateWorkspace();

    const response: LoadProfileSuccess = {
      ok: true,
      workspace: workspace
        ? {
            profile: workspace.profile ?? null,
            documents: Array.isArray(workspace.documents)
              ? workspace.documents
              : [],
            meta:
              workspace.meta && typeof workspace.meta === "object"
                ? workspace.meta
                : {},
            createdAt:
              typeof workspace.createdAt === "string"
                ? workspace.createdAt
                : null,
            updatedAt:
              typeof workspace.updatedAt === "string"
                ? workspace.updatedAt
                : null,
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