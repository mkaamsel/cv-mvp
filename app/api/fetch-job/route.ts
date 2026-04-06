/**
 * fetch-job — HTML fetcher and noise stripper.
 *
 * Fetches a job posting URL, removes all noise (navigation, banners, footers,
 * cookie prompts, sidebars) using HTML structure anchors, and returns clean
 * text containing only the real job content.
 *
 * No AI. No extraction. Pure signal stripping.
 *
 * HTML cleaning logic lives in lib/utils/cleanJobHtml.ts.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  FETCH_HEADERS,
  removeNoise,
  extractMainBlock,
  htmlToText,
  isBlockedOrThin,
} from "@/lib/utils/cleanJobHtml";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ── Readable fallback (Jina AI) ───────────────────────────────────────────────

async function fetchReadableFallback(url: string): Promise<string> {
  const readableUrl = `https://r.jina.ai/${url}`;
  const res = await fetch(readableUrl, { headers: FETCH_HEADERS });
  if (!res.ok) throw new Error(`Readable fallback ${res.status}`);
  return res.text();
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { url?: string };

    if (!body.url?.trim()) {
      return NextResponse.json({ ok: false, error: "No URL provided." }, { status: 400 });
    }

    const url = body.url.trim();

    // Attempt 1: direct fetch
    let cleanText = "";
    let source: "direct" | "readable-fallback" = "direct";

    try {
      const res = await fetch(url, { headers: FETCH_HEADERS, redirect: "follow" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const html = await res.text();
      const noiseStripped = removeNoise(html);
      const mainBlock = extractMainBlock(noiseStripped);
      cleanText = htmlToText(mainBlock);
    } catch {
      // fall through to readable fallback
    }

    // Attempt 2: Jina readable fallback
    if (isBlockedOrThin(cleanText)) {
      try {
        const fallback = await fetchReadableFallback(url);
        if (fallback.length > cleanText.length) {
          cleanText = fallback;
          source = "readable-fallback";
        }
      } catch {
        // fallback also failed
      }
    }

    if (isBlockedOrThin(cleanText)) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "This page could not be extracted cleanly — it may be behind a login or blocking automated access. Please paste the job text directly.",
          source: "blocked",
        },
        { status: 422 },
      );
    }

    return NextResponse.json({ ok: true, cleanText, source });
  } catch (err) {
    console.error("[fetch-job]", err);
    return NextResponse.json(
      { ok: false, error: "Unexpected error fetching job page." },
      { status: 500 },
    );
  }
}
