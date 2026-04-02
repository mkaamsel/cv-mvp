import { NextResponse } from "next/server";
import {
  requiredProfileModule,
  type StructuredJob,
} from "@/lib/engine/required-profile/requiredProfileModule";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RequiredProfileRequest = {
  locale?: "en" | "de";
  structuredJob?: StructuredJob;
  extractedText?: string;
  companyContextSummary?: string;
  marketSignalsSummary?: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as RequiredProfileRequest;

    if (!body.structuredJob) {
      return NextResponse.json(
        { ok: false, error: "structuredJob is required." },
        { status: 400 }
      );
    }

    const locale = body.locale === "de" ? "de" : "en";

    const result = await requiredProfileModule({
      locale,
      structuredJob: body.structuredJob,
      extractedText: body.extractedText || "",
      companyContextSummary: body.companyContextSummary || "",
      marketSignalsSummary: body.marketSignalsSummary || "",
    });

    return NextResponse.json({
      ok: true,
      requiredProfile: result.requiredProfile,
      meta: result.meta,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown server error.";

    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    );
  }
}