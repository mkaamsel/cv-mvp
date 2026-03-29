import { loadCandidateWorkspace } from "@/lib/profile/profile-store";

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

function jsonResponse(body: LoadProfileSuccess | LoadProfileError, status = 200): Response {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

export async function GET(): Promise<Response> {
  try {
    const workspace = await loadCandidateWorkspace();

    return jsonResponse({
      ok: true,
      workspace: workspace
        ? {
            profile: workspace.profile,
            documents: workspace.documents,
            meta: workspace.meta,
            createdAt: workspace.createdAt,
            updatedAt: workspace.updatedAt,
          }
        : null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown server error.";

    return jsonResponse(
      {
        ok: false,
        error: message,
      },
      500
    );
  }
}