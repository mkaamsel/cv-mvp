import { NextRequest, NextResponse } from "next/server";
import { renderCoverLetterDocx } from "@/lib/documents/render-cover-letter";
import type { CoverLetterDocumentInput } from "@/lib/documents/types";

export const runtime = "nodejs";

function sanitizeFilename(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as CoverLetterDocumentInput;

    if (!body.fullName || !Array.isArray(body.bodyParagraphs)) {
      return NextResponse.json(
        { error: "Invalid cover letter payload." },
        { status: 400 }
      );
    }

    const buffer = await renderCoverLetterDocx(body);
    const safeName = sanitizeFilename(body.fullName || "candidate");
    const company = sanitizeFilename(body.companyName || "company");
    const fileName = `${safeName}-cover-letter-${company}.docx`;

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    console.error("Cover letter download generation failed:", error);
    return NextResponse.json(
      { error: "Failed to generate cover letter document." },
      { status: 500 }
    );
  }
}