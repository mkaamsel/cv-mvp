import {
  saveCandidateWorkspace,
  type CandidateProfile,
  type StoredDocument,
} from "@/lib/profile/profile-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SaveProfileRequest = {
  profile?: CandidateProfile | null;
  documents?: StoredDocument[];
  meta?: Record<string, unknown>;
};

type SaveProfileSuccess = {
  ok: true;
  workspace: {
    profile: CandidateProfile | null;
    documents: StoredDocument[];
    meta: Record<string, unknown>;
    createdAt: string | null;
    updatedAt: string | null;
  };
};

type SaveProfileError = {
  ok: false;
  error: string;
};

function jsonResponse(body: SaveProfileSuccess | SaveProfileError, status = 200): Response {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

export async function POST(request: Request): Promise<Response> {
  try {
    const body = (await request.json()) as SaveProfileRequest;

    const workspace = await saveCandidateWorkspace({
      profile: body.profile,
      documents: body.documents,
      meta: body.meta,
    });

    return jsonResponse({
      ok: true,
      workspace: {
        profile: workspace.profile,
        documents: workspace.documents,
        meta: workspace.meta,
        createdAt: workspace.createdAt,
        updatedAt: workspace.updatedAt,
      },
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