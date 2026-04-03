import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
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

function normalizeDocuments(value: unknown): StoredDocument[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;

      const doc = item as Record<string, unknown>;

      return {
        fileName:
          typeof doc.fileName === "string"
            ? doc.fileName.trim()
            : typeof doc.name === "string"
              ? doc.name.trim()
              : "document",
        kind:
          typeof doc.kind === "string" && doc.kind.trim()
            ? doc.kind.trim()
            : "other",
        text: typeof doc.text === "string" ? doc.text : "",
        description:
          typeof doc.description === "string" ? doc.description : "",
        isPrimary: Boolean(doc.isPrimary),
      } satisfies StoredDocument;
    })
    .filter((doc): doc is StoredDocument => Boolean(doc));
}

function normalizeMeta(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

export async function POST(request: Request): Promise<Response> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      const response: SaveProfileError = {
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
      const response: SaveProfileError = {
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

    const body = (await request.json()) as SaveProfileRequest;

    const profile =
      body.profile && typeof body.profile === "object" ? body.profile : null;

    const documents = normalizeDocuments(body.documents);
    const meta = normalizeMeta(body.meta);

    const workspace = await saveCandidateWorkspace({
      profile,
      documents,
      meta,
    });

    const response: SaveProfileSuccess = {
      ok: true,
      workspace: {
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
      },
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

    const response: SaveProfileError = {
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