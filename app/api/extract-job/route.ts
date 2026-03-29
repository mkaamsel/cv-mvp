import { NextRequest, NextResponse } from "next/server";

function decodeHtmlEntities(text: string) {
  return text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function stripHtml(html: string) {
  return decodeHtmlEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<\/(p|div|section|article|li|ul|ol|br|h1|h2|h3|h4|h5|h6|tr)>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/\r/g, "")
      .replace(/[ \t]+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );
}

function cleanText(text: string) {
  return text
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function safeSlice(text: string, max = 18000) {
  return text.length > max ? text.slice(0, max) : text;
}

function detectBlockedOrThinContent(text: string) {
  const lower = text.toLowerCase();

  const blockedSignals = [
    "captcha",
    "verify you are human",
    "access denied",
    "unusual traffic",
    "robot or human",
    "security check",
    "enable javascript",
    "sign in to continue",
    "cloudflare",
    "please enable cookies",
  ];

  const hasBlockedSignal = blockedSignals.some((signal) =>
    lower.includes(signal)
  );

  return hasBlockedSignal || text.length < 800;
}

async function fetchHtml(url: string) {
  const res = await fetch(url, {
    redirect: "follow",
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0 Safari/537.36",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9,de;q=0.8",
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
    },
  });

  if (!res.ok) {
    throw new Error(`Could not fetch job page (${res.status})`);
  }

  return await res.text();
}

async function fetchReadableFallback(url: string) {
  const readableUrl = `https://r.jina.ai/http://${url.replace(/^https?:\/\//, "")}`;

  const res = await fetch(readableUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0 Safari/537.36",
    },
  });

  if (!res.ok) {
    throw new Error(`Readable fallback failed (${res.status})`);
  }

  return await res.text();
}

function detectCompany(text: string) {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 40);

  const companyHints = lines.find(
    (line) =>
      /gmbh|ag|se|kg|mbh|inc|ltd|llc|company|unternehmen/i.test(line) &&
      line.length < 120
  );

  return companyHints || "";
}

function detectRole(text: string) {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 30);

  const roleLine = lines.find(
    (line) =>
      /account|finance|controller|buchhalter|accountant|reporting|manager|lead|specialist|analyst/i.test(
        line
      ) && line.length < 140
  );

  return roleLine || "";
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url } = body ?? {};

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "No URL provided." },
        { status: 400 }
      );
    }

    let extractedText = "";
    let source = "direct";

    try {
      const html = await fetchHtml(url);
      extractedText = safeSlice(cleanText(stripHtml(html)));
    } catch {
      extractedText = "";
    }

    if (!extractedText || detectBlockedOrThinContent(extractedText)) {
      try {
        const fallbackText = await fetchReadableFallback(url);
        const cleanedFallback = safeSlice(cleanText(fallbackText));

        if (cleanedFallback.length > extractedText.length) {
          extractedText = cleanedFallback;
          source = "readable-fallback";
        }
      } catch {
        // keep current result
      }
    }

    if (!extractedText || detectBlockedOrThinContent(extractedText)) {
      return NextResponse.json(
        {
          error:
            "The job page could not be extracted cleanly. This site may be blocking automated reading or loading the content dynamically. Please paste the job text manually or use the company career page URL.",
          extractedText: "",
          detectedCompany: "",
          detectedRole: "",
          source: "blocked-or-thin-content",
        },
        { status: 422 }
      );
    }

    const detectedCompany = detectCompany(extractedText);
    const detectedRole = detectRole(extractedText);

    return NextResponse.json({
      extractedText,
      detectedCompany,
      detectedRole,
      source,
    });
  } catch (error) {
    console.error("Job extraction failed:", error);

    return NextResponse.json(
      { error: "Could not extract job description." },
      { status: 500 }
    );
  }
}