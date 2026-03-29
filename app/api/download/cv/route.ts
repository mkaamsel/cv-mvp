import { NextRequest, NextResponse } from "next/server";
import { renderCvDocx } from "@/lib/documents/render-cv";
import type { CvDocumentInput } from "@/lib/documents/types";

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
    const body = (await req.json()) as CvDocumentInput;

    if (!body.fullName || !Array.isArray(body.sections)) {
      return NextResponse.json(
        { error: "Invalid CV payload." },
        { status: 400 }
      );
    }

    const buffer = await renderCvDocx(body);
    const safeName = sanitizeFilename(body.fullName || "candidate");
    const fileName = `${safeName}-cv.docx`;

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    console.error("CV download generation failed:", error);
    return NextResponse.json(
      { error: "Failed to generate CV document." },
      { status: 500 }
    );
  }
}