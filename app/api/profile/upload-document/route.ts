import { NextRequest, NextResponse } from "next/server";
import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";
import OpenAI from "openai";
import {
  clampText,
  guardUploadedFile,
  normalizeWhitespace,
} from "@/lib/engine/core/routeGuards";
import { withTimeout } from "@/lib/engine/core/withTimeout";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
];

const IMAGE_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
]);

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_EXTRACTED_TEXT_CHARS = 60000;

// PDFs below this char count after pdf-parse are treated as scanned documents
// and automatically re-processed via OpenAI Vision. Matches tournament threshold.
const SCANNED_PDF_CHAR_THRESHOLD = 500;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function extractFromImage(
  buffer: Buffer,
  mimeType: string,
): Promise<string> {
  const base64 = buffer.toString("base64");
  const dataUrl = `data:${mimeType};base64,${base64}`;

  const response = await withTimeout(
    openai.responses.create({
      model: "gpt-4o",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_image",
              image_url: dataUrl,
              detail: "high",
            } as unknown as { type: "input_text"; text: string },
            {
              type: "input_text",
              text: "Extract all text from this document image exactly as it appears. Return only the extracted text — no commentary, no explanation, no markdown formatting.",
            },
          ],
        },
      ],
    }),
    60000,
  );

  return response.output_text ?? "";
}

// Vision fallback for scanned PDFs — sends raw PDF bytes to gpt-4o as a file
// content part. Same approach as the tournament runner. Cast via any to satisfy
// strict TS (OpenAI SDK v6 supports this content part type at runtime).
async function extractFromPdfVision(
  buffer: Buffer,
  fileName: string,
): Promise<string> {
  const base64 = buffer.toString("base64");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filePart: any = {
    type: "file",
    file: {
      file_data: `data:application/pdf;base64,${base64}`,
      filename: fileName,
    },
  };

  const response = await withTimeout(
    openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 4000,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Extract all text from this document. Return only the extracted text, preserving structure where possible. Do not add any commentary.",
            },
            filePart,
          ],
        },
      ],
    }),
    60000,
  );

  return (response.choices[0]?.message?.content ?? "").trim();
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
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
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let text = "";
    const warnings: string[] = [...fileGuard.warnings];

    if (file.type === "application/pdf") {
      const parser = new PDFParse({ data: buffer });
      const result = await parser.getText();
      text = (result.text ?? "").trim();
      await parser.destroy();

      if (text.length < SCANNED_PDF_CHAR_THRESHOLD) {
        // Scanned PDF — pdf-parse returned too little text.
        // Fall back to OpenAI Vision silently. Never surface an error to the user.
        console.log(
          `[vision-fallback] ${file.name}: pdf-parse returned ${text.length} chars — re-processing via vision`,
        );
        text = await extractFromPdfVision(buffer, file.name);
      }
    } else if (
      file.type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      const result = await mammoth.extractRawText({ buffer });
      text = result.value ?? "";
    } else if (IMAGE_MIME_TYPES.has(file.type)) {
      text = await extractFromImage(buffer, file.type);
    } else {
      return NextResponse.json(
        {
          error:
            "Unsupported file format. Please upload a PDF, DOCX, or image file (PNG, JPG).",
        },
        { status: 400 },
      );
    }

    text = normalizeWhitespace(text);

    if (!text.trim()) {
      return NextResponse.json(
        {
          error:
            "No text could be read from the uploaded file. Try a different format or check that the file isn't blank.",
        },
        { status: 400 },
      );
    }

    const clamped = clampText(text, MAX_EXTRACTED_TEXT_CHARS);

    if (clamped.truncated) {
      warnings.push(
        "The document is very long — only the first part was extracted. The most important information is likely captured.",
      );
    }

    return NextResponse.json({
      extractedText: clamped.text,
      fileName: file.name,
      mimeType: file.type,
      warnings,
      metrics: {
        ...fileGuard.metrics,
        extractedChars: clamped.text.length,
      },
    });
  } catch (error) {
    const detail = error instanceof Error
      ? `${error.constructor.name}: ${error.message}`
      : String(error);
    console.error("[upload-document] extraction failed:", detail);

    return NextResponse.json(
      {
        error: "Something went wrong reading the file. Please try again.",
        ...(process.env.NODE_ENV === "development" ? { _debug: detail } : {}),
      },
      { status: 500 },
    );
  }
}
