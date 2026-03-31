import { NextRequest, NextResponse } from "next/server";

type ExtractJobRequestBody = {
  url?: string;
  jobDescriptionText?: string;
  outputLanguage?: "en" | "de";
};

type StructuredJob = {
  companyName: string;
  jobTitle: string;
  location: string;
  responsibilities: string[];
  requirements: string[];
  summary: string;
};

type ExtractionSource =
  | "pasted-text"
  | "direct"
  | "readable-fallback"
  | "blocked-or-thin-content";

type ValidationResult = {
  structuredJob: StructuredJob;
  warnings: string[];
  isUsable: boolean;
};

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
      .replace(
        /<\/(p|div|section|article|li|ul|ol|br|h1|h2|h3|h4|h5|h6|tr)>/gi,
        "\n"
      )
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

function normalizeUrl(input: string): string {
  try {
    const url = new URL(input.trim());
    url.hash = "";

    const trackingParams = [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
      "trk",
      "trkInfo",
      "originalSubdomain",
      "refId",
      "ref",
    ];

    for (const key of trackingParams) {
      url.searchParams.delete(key);
    }

    return url.toString();
  } catch {
    return input.trim();
  }
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

  const thinSignals = [
    "job alert",
    "create alert",
    "sign up",
    "log in",
    "register now",
  ];

  const hasBlockedSignal = blockedSignals.some((signal) =>
    lower.includes(signal)
  );

  const hasMostlyChromeNoise =
    thinSignals.filter((signal) => lower.includes(signal)).length >= 2 &&
    text.length < 1400;

  return hasBlockedSignal || hasMostlyChromeNoise || text.length < 800;
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
  const readableUrl = `https://r.jina.ai/http://${url.replace(
    /^https?:\/\//,
    ""
  )}`;

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

function getLines(text: string, limit?: number) {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return typeof limit === "number" ? lines.slice(0, limit) : lines;
}

function dedupeStrings(items: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const item of items) {
    const key = item.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      result.push(item);
    }
  }

  return result;
}

function normalizeBullet(line: string) {
  return line
    .replace(/^[•\-*]\s*/, "")
    .replace(/^\d+\.\s*/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isLikelyNoiseLine(line: string) {
  const lower = line.toLowerCase();

  const noisePatterns = [
    /^apply now$/,
    /^bewerben$/,
    /^jetzt bewerben$/,
    /^learn more$/,
    /^mehr erfahren$/,
    /^about us$/,
    /^über uns$/,
    /^benefits$/,
    /^was wir bieten$/,
    /^contact$/,
    /^kontakt$/,
    /^imprint$/,
    /^impressum$/,
    /^privacy$/,
    /^datenschutz$/,
    /^cookie/,
    /^cookies/,
    /^job alert$/,
    /^sign in$/,
    /^log in$/,
    /^register$/,
  ];

  return noisePatterns.some((pattern) => pattern.test(lower));
}

function isWeakLine(line: string) {
  return line.length < 12 || isLikelyNoiseLine(line);
}

function detectCompany(text: string) {
  const lines = getLines(text, 50);

  const companyHints = lines.find(
    (line) =>
      /gmbh|ag|se|kg|mbh|inc|ltd|llc|company|unternehmen|group|holding/i.test(
        line
      ) && line.length < 120
  );

  return companyHints || "";
}

function detectRole(text: string) {
  const lines = getLines(text, 40);

  const rolePatterns =
    /account|finance|controller|buchhalter|accountant|reporting|manager|lead|specialist|analyst|leiter|head|director|referent|bilanzbuchhalter|controlling/i;

  const roleLine = lines.find(
    (line) => rolePatterns.test(line) && line.length < 140
  );

  return roleLine || "";
}

function detectLocation(text: string) {
  const lines = getLines(text, 50);

  const locationLine = lines.find(
    (line) =>
      /remote|hybrid|onsite|deutschland|germany|düsseldorf|duesseldorf|berlin|münchen|munich|hamburg|köln|cologne|frankfurt|neuss|essen|stuttgart/i.test(
        line
      ) && line.length < 120
  );

  return locationLine || "";
}

function collectBulletsFromSection(
  text: string,
  sectionPatterns: RegExp[]
): string[] {
  const lines = getLines(text);
  const results: string[] = [];
  let collecting = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    const lower = line.toLowerCase();

    const startsSection = sectionPatterns.some((pattern) => pattern.test(lower));
    const startsOtherSection =
      /^(benefits|about us|über uns|was wir bieten|your profile|ihr profil|requirements|anforderungen|qualifications|responsibilities|aufgaben|tasks|contact|bewerbung|application|why join|wir bieten|what we offer|offer|angebote)$/i.test(
        lower
      );

    if (startsSection) {
      collecting = true;
      continue;
    }

    if (collecting && startsOtherSection) {
      break;
    }

    if (!collecting) continue;

    const isBulletLike =
      /^[•\-*]/.test(line) || /^\d+\./.test(line) || line.length > 45;

    if (!isBulletLike) continue;

    const cleaned = normalizeBullet(line);

    if (
      cleaned &&
      cleaned.length >= 18 &&
      cleaned.length <= 280 &&
      !isLikelyNoiseLine(cleaned)
    ) {
      results.push(cleaned);
    }

    if (results.length >= 10) {
      break;
    }
  }

  return dedupeStrings(results).slice(0, 8);
}

function deriveSummary(text: string) {
  const lines = getLines(text, 80).filter(
    (line) =>
      !isLikelyNoiseLine(line) &&
      line.length >= 40 &&
      line.length <= 240 &&
      !/^(responsibilities|tasks|aufgaben|requirements|qualifications|your profile|ihr profil)$/i.test(
        line
      )
  );

  const summaryLines = dedupeStrings(lines).slice(0, 4);
  return summaryLines.join(" ").slice(0, 900).trim();
}

function filterArray(items: string[]) {
  return dedupeStrings(
    items
      .map(normalizeBullet)
      .filter((item) => !isWeakLine(item))
      .filter((item) => item.length <= 280)
  ).slice(0, 8);
}

function buildStructuredJob(extractedText: string): StructuredJob {
  const companyName = detectCompany(extractedText);
  const jobTitle = detectRole(extractedText);
  const location = detectLocation(extractedText);

  const responsibilities = filterArray(
    collectBulletsFromSection(extractedText, [
      /^responsibilities$/,
      /^tasks$/,
      /^your tasks$/,
      /^your responsibilities$/,
      /^aufgaben$/,
      /^ihre aufgaben$/,
      /^tätigkeiten$/,
    ])
  );

  const requirements = filterArray(
    collectBulletsFromSection(extractedText, [
      /^requirements$/,
      /^qualifications$/,
      /^your profile$/,
      /^ihr profil$/,
      /^anforderungen$/,
      /^qualifikation$/,
      /^what you bring$/,
    ])
  );

  const summary = deriveSummary(extractedText);

  return {
    companyName,
    jobTitle,
    location,
    responsibilities,
    requirements,
    summary,
  };
}

function validateStructuredJob(structuredJob: StructuredJob): ValidationResult {
  const warnings: string[] = [];

  const normalized: StructuredJob = {
    companyName: structuredJob.companyName.trim(),
    jobTitle: structuredJob.jobTitle.trim(),
    location: structuredJob.location.trim(),
    responsibilities: filterArray(structuredJob.responsibilities),
    requirements: filterArray(structuredJob.requirements),
    summary: structuredJob.summary.trim(),
  };

  if (!normalized.companyName) {
    warnings.push("company-name-missing");
  }

  if (!normalized.jobTitle) {
    warnings.push("job-title-missing");
  }

  if (!normalized.location) {
    warnings.push("location-missing");
  }

  if (normalized.responsibilities.length === 0) {
    warnings.push("responsibilities-missing");
  } else if (normalized.responsibilities.length < 2) {
    warnings.push("responsibilities-sparse");
  }

  if (normalized.requirements.length === 0) {
    warnings.push("requirements-missing");
  } else if (normalized.requirements.length < 2) {
    warnings.push("requirements-sparse");
  }

  if (!normalized.summary) {
    warnings.push("summary-missing");
  } else if (normalized.summary.length < 140) {
    warnings.push("summary-thin");
  }

  const hasCoreIdentity = Boolean(normalized.companyName || normalized.jobTitle);
  const hasSubstance =
    normalized.responsibilities.length > 0 ||
    normalized.requirements.length > 0 ||
    normalized.summary.length >= 140;

  const isUsable = hasCoreIdentity && hasSubstance;

  return {
    structuredJob: normalized,
    warnings,
    isUsable,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as ExtractJobRequestBody;

    const url =
      typeof body.url === "string" && body.url.trim()
        ? normalizeUrl(body.url)
        : "";

    const jobDescriptionText =
      typeof body.jobDescriptionText === "string" &&
      body.jobDescriptionText.trim()
        ? body.jobDescriptionText.trim()
        : "";

    if (!url && !jobDescriptionText) {
      return NextResponse.json(
        {
          error:
            "Provide either 'url' or 'jobDescriptionText' to extract the job.",
        },
        { status: 422 }
      );
    }

    let extractedText = "";
    let source: ExtractionSource = "pasted-text";
    const warnings: string[] = [];

    if (jobDescriptionText) {
      extractedText = safeSlice(cleanText(jobDescriptionText));
      source = "pasted-text";
    } else if (url) {
      source = "direct";

      try {
        const html = await fetchHtml(url);
        extractedText = safeSlice(cleanText(stripHtml(html)));
      } catch {
        warnings.push("direct-fetch-failed");
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
          warnings.push("readable-fallback-failed");
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
            structuredJob: null,
            source: "blocked-or-thin-content",
            normalizedUrl: url || "",
            warnings: dedupeStrings(warnings),
          },
          { status: 422 }
        );
      }
    }

    const initialStructuredJob = buildStructuredJob(extractedText);
    const validation = validateStructuredJob(initialStructuredJob);

    const combinedWarnings = dedupeStrings([
      ...warnings,
      ...validation.warnings,
    ]);

    if (!validation.isUsable) {
      return NextResponse.json(
        {
          error:
            "The job content was extracted, but the structured result is too weak for reliable downstream analysis. Please paste the job description text manually for a cleaner run.",
          extractedText,
          detectedCompany: validation.structuredJob.companyName,
          detectedRole: validation.structuredJob.jobTitle,
          structuredJob: validation.structuredJob,
          source,
          normalizedUrl: url || "",
          warnings: combinedWarnings,
        },
        { status: 422 }
      );
    }

    return NextResponse.json({
      extractedText,
      detectedCompany: validation.structuredJob.companyName,
      detectedRole: validation.structuredJob.jobTitle,
      structuredJob: validation.structuredJob,
      source,
      normalizedUrl: url || "",
      warnings: combinedWarnings,
    });
  } catch (error) {
    console.error("Job extraction failed:", error);

    return NextResponse.json(
      { error: "Could not extract job description." },
      { status: 500 }
    );
  }
}