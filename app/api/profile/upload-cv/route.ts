import { NextRequest, NextResponse } from "next/server";
import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";
import {
  clampText,
  guardUploadedFile,
  normalizeWhitespace,
} from "@/lib/intelligence/core/routeGuards";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_EXTRACTED_TEXT_CHARS = 60000;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file uploaded." },
        { status: 400 }
      );
    }

    const fileGuard = guardUploadedFile({
      file,
      allowedMimeTypes: ALLOWED_MIME_TYPES,
      maxBytes: MAX_FILE_BYTES,
    });

    if (!fileGuard.ok) {
      return NextResponse.json(
        {
          error: fileGuard.errors[0] ?? "File validation failed.",
          details: {
            errors: fileGuard.errors,
            warnings: fileGuard.warnings,
            metrics: fileGuard.metrics,
          },
        },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let text = "";

    if (file.type === "application/pdf") {
      const parser = new PDFParse({ data: buffer });
      const result = await parser.getText();
      text = result.text ?? "";
      await parser.destroy();
    } else if (
      file.type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      const result = await mammoth.extractRawText({ buffer });
      text = result.value ?? "";
    } else {
      return NextResponse.json(
        { error: "Unsupported file format. Please upload PDF or DOCX." },
        { status: 400 }
      );
    }

    text = normalizeWhitespace(text);

    if (!text) {
      return NextResponse.json(
        { error: "The uploaded file could not be read." },
        { status: 400 }
      );
    }

    const clamped = clampText(text, MAX_EXTRACTED_TEXT_CHARS);
    const warnings = [...fileGuard.warnings];

    if (clamped.truncated) {
      warnings.push(
        `Extracted text exceeded ${MAX_EXTRACTED_TEXT_CHARS} characters and was truncated for safety.`
      );
    }

    return NextResponse.json({
      extractedText: clamped.text,
      warnings,
      metrics: {
        ...fileGuard.metrics,
        extractedChars: clamped.text.length,
      },
    });
  } catch (error) {
    console.error("CV parsing failed:", error);

    return NextResponse.json(
      { error: "CV parsing failed." },
      { status: 500 }
    );
  }
}