import { NextResponse } from "next/server";
import mammoth from "mammoth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ExtractDocxSuccess = {
  ok: true;
  text: string;
  fileName: string;
  warnings: string[];
};

type ExtractDocxError = {
  ok: false;
  error: string;
};

function jsonResponse(body: ExtractDocxSuccess | ExtractDocxError, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return jsonResponse(
        {
          ok: false,
          error: "No DOCX file was uploaded.",
        },
        400
      );
    }

    const fileName = file.name || "uploaded.docx";

    if (!fileName.toLowerCase().endsWith(".docx")) {
      return jsonResponse(
        {
          ok: false,
          error: "Only .docx files are supported in this upload step.",
        },
        400
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const result = await mammoth.extractRawText({ buffer });

    const text = result.value.trim();
    const warnings = (result.messages || []).map((item) => item.message).filter(Boolean);

    if (!text) {
      return jsonResponse(
        {
          ok: false,
          error: "The uploaded DOCX did not contain readable text.",
        },
        422
      );
    }

    return jsonResponse({
      ok: true,
      text,
      fileName,
      warnings,
    });
  } catch (error) {
    return jsonResponse(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "DOCX extraction failed.",
      },
      500
    );
  }
}