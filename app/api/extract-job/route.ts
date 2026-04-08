/**
 * extract-job — AI extraction of a job posting into StructuredJob.
 *
 * Accepts:
 *   - `url`: fetch and clean the HTML, then extract
 *   - `jobDescriptionText`: use pasted text directly
 *
 * Returns a StructuredJob with the new rich field schema:
 *   aufgaben, anforderungsprofil (muss/soll/kann), companyContext,
 *   hiddenBlockers, atsKeywords, salary, location, hoursPerWeek,
 *   workModel, employmentType
 *
 * Also returns backward-compatible pipeline fields (responsibilities,
 * requirements, summary, companyName, jobTitle) so the tailoring pipeline
 * continues to work without changes.
 *
 * Display fields (aufgaben, anforderungsprofil) carry verbatim text from
 * the posting. All other StructuredJob fields are internal — not shown to
 * the user.
 */

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import {
  FETCH_HEADERS,
  removeNoise,
  extractMainBlock,
  htmlToText,
  isBlockedOrThin,
} from "@/lib/utils/cleanJobHtml";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ── Types ─────────────────────────────────────────────────────────────────────

type ExtractJobRequest = {
  url?: string;
  jobDescriptionText?: string;
  outputLanguage?: string;
};

export type StructuredJob = {
  // ── Display fields — verbatim from the posting ───────────────────────────
  aufgaben: string[];
  anforderungsprofil: {
    muss: string[];
    soll: string[];
    kann: string[];
  };

  // ── Internal fields — used by the pipeline, not shown to user ───────────
  companyContext: string;
  hiddenBlockers: string[];
  atsKeywords: string[];
  salary: string | null;
  location: string | null;
  hoursPerWeek: string | null;
  workModel: "remote" | "hybrid" | "onsite" | null;
  employmentType: "permanent" | "temporary" | "freelance" | "internship" | null;

  // ── Pipeline-compatible backward-compat fields ────────────────────────────
  // These are derived from the new fields and kept so the tailoring pipeline
  // continues to work without modification.
  companyName: string;
  jobTitle: string;
  responsibilities: string[]; // = aufgaben
  requirements: string[];     // = muss + soll
  summary: string;            // = companyContext
};

// TODO: deleted — consolidated into lib/utils/cleanJobHtml.ts

// ── OpenAI setup ──────────────────────────────────────────────────────────────

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL = process.env.OPENAI_MODEL_EXTRACT_JOB ?? "gpt-4o-mini";
const MAX_TEXT = 20000;

function normalizeUrl(raw: string): string {
  try {
    const u = new URL(raw.trim());
    u.hash = "";
    ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "trk", "ref"].forEach(
      (k) => u.searchParams.delete(k),
    );
    return u.toString();
  } catch {
    return raw.trim();
  }
}

async function fetchCleanText(url: string): Promise<{ text: string; source: string }> {
  // Direct fetch
  let text = "";
  try {
    const res = await fetch(url, { headers: FETCH_HEADERS, redirect: "follow" });
    if (res.ok) {
      const html = await res.text();
      text = htmlToText(extractMainBlock(removeNoise(html)));
    }
  } catch { /* fall through */ }

  if (isBlockedOrThin(text)) {
    // Jina readable fallback
    try {
      const res = await fetch(`https://r.jina.ai/${url}`, { headers: FETCH_HEADERS });
      if (res.ok) {
        const fallback = await res.text();
        if (fallback.length > text.length) return { text: fallback, source: "readable-fallback" };
      }
    } catch { /* fall through */ }
  }

  if (isBlockedOrThin(text)) {
    throw new Error(
      "This job page could not be extracted — it may require a login or block automated access. Please paste the job text directly.",
    );
  }

  return { text, source: "direct-fetch" };
}

// ── AI extraction ─────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a job posting extraction engine. Extract structured content from a job posting in any language.

FIELD INSTRUCTIONS:

aufgaben
  All responsibilities and day-to-day tasks described in the posting.
  Find the section describing what the person will actually do in the role — regardless of how it is titled or what language the posting is in.
  Extract each item as a separate string. Copy verbatim. Do not rephrase, summarise, or translate.

anforderungsprofil.muss
  Requirements the posting treats as non-negotiable — no flexibility implied.
  Identify by meaning and context: hard qualifications, required certifications or degrees, minimum years of experience stated as a floor, language fluency stated as required, direct factual statements about what the candidate must have.
  Do not rely on specific signal words — reason from meaning in context across any language.

anforderungsprofil.soll
  Expected requirements — what a typical successful candidate is assumed to have, stated without softening or qualification.
  These are not hard blockers but are clearly expected. Identify by context: skills and experience the posting lists as standard expectations without marking them as optional.
  Default rule for flat requirement sections: when the posting uses a recognisable requirements section (e.g. "Ihr Profil", "Was Sie mitbringen", "Your Profile", "Requirements", "Anforderungen", or equivalent heading in any language) and lists items without explicit qualification markers, classify all items in that section as soll. Do not leave soll empty when such a section exists and its items carry no softening language such as "ideally", "a plus", "preferred", "advantageous", or equivalent in any language.

anforderungsprofil.kann
  Nice-to-have additions — items the posting explicitly marks as optional, advantageous, or preferred but not required.
  Identify by meaning: phrases that soften a requirement ("ideally", "a plus", "preferred", "advantageous", or equivalent phrasing in any language).

companyContext
  One paragraph summarising the company type, size, industry, and work environment from the posting.

hiddenBlockers
  Implicit requirements that would disqualify most candidates even if not explicitly stated.
  Examples: requiring a nationally-specific qualification, requiring a particular industry background, implying on-site only, citizenship or work permit assumptions.
  State what they imply, not just what they say.

atsKeywords
  Skill, tool, and system keywords likely used in ATS filtering.
  Include both the local-language variant and English equivalent where both appear or are obvious equivalents.

salary
  Salary or compensation range exactly as written, or null if not mentioned.

location
  Work location exactly as written, or null if not found.

hoursPerWeek
  Hours per week exactly as written, or null if not stated.

workModel
  One of: "remote", "hybrid", "onsite", or null if not stated.

employmentType
  One of: "permanent", "temporary", "freelance", "internship", or null if not stated.

companyName
  Name of the hiring company. Infer from context if not explicitly stated.

jobTitle
  Exact job title as posted.

Return JSON only. No markdown. No commentary.`;

async function extractWithAI(text: string): Promise<Partial<StructuredJob>> {
  const truncated = text.length > MAX_TEXT ? text.slice(0, MAX_TEXT) : text;

  const response = await openai.chat.completions.create({
    model: MODEL,
    temperature: 0.1,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: `Extract the structured job profile from this posting:\n\n${truncated}` },
    ],
  });

  const raw = response.choices[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(raw) as Partial<StructuredJob>;

  // ── TEMPORARY DIAGNOSTICS — remove before beta ────────────────────────────
  const anf = (parsed as Record<string, unknown>).anforderungsprofil;
  if (anf === undefined) {
    console.log("[extract-job][raw-anforderungsprofil] MISSING — full raw:", JSON.stringify(parsed, null, 2));
  } else {
    console.log("[extract-job][raw-anforderungsprofil] typeof:", typeof anf);
    console.log("[extract-job][raw-anforderungsprofil] isArray:", Array.isArray(anf));
    if (anf !== null && typeof anf === "object" && !Array.isArray(anf)) {
      console.log("[extract-job][raw-anforderungsprofil] keys:", Object.keys(anf as object));
    }
    console.log("[extract-job][raw-anforderungsprofil] value:", JSON.stringify(anf, null, 2));
  }
  // ── END TEMPORARY DIAGNOSTICS ─────────────────────────────────────────────

  return parsed;
}

// ── Normalisation helpers ──────────────────────────────────────────────────────

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string" && x.trim().length > 0).map((x) => x.trim());
}

function asString(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function asNullableString(v: unknown): string | null {
  const s = asString(v);
  return s.length > 0 ? s : null;
}

function asWorkModel(v: unknown): StructuredJob["workModel"] {
  const s = asString(v).toLowerCase();
  if (s === "remote" || s === "hybrid" || s === "onsite") return s;
  return null;
}

function asEmploymentType(v: unknown): StructuredJob["employmentType"] {
  const s = asString(v).toLowerCase();
  if (s === "permanent" || s === "temporary" || s === "freelance" || s === "internship") return s;
  return null;
}

function normalizeStructuredJob(raw: Partial<StructuredJob>): StructuredJob {
  const aufgaben = asStringArray(raw.aufgaben);

  const profil = raw.anforderungsprofil as
    | { muss?: unknown; soll?: unknown; kann?: unknown }
    | undefined;

  // Support both nested shape { anforderungsprofil: { muss, soll, kann } }
  // and flattened dotted-key shape { "anforderungsprofil.muss": [...], ... }
  const rawFlat = raw as Record<string, unknown>;
  const muss = asStringArray(profil?.muss ?? rawFlat["anforderungsprofil.muss"]);
  const soll = asStringArray(profil?.soll ?? rawFlat["anforderungsprofil.soll"]);
  const kann = asStringArray(profil?.kann ?? rawFlat["anforderungsprofil.kann"]);

  // Defensive fallback: if the model returned anforderungsprofil as a flat
  // string array instead of the nested muss/soll/kann object, all three buckets
  // above will be empty even though requirement content was extracted.
  // asStringArray returns [] for objects/undefined and the items for flat arrays,
  // so passing raw.anforderungsprofil directly detects the flat-array case.
  // Only fires when all three buckets are simultaneously empty.
  const flatAnforderungen = asStringArray(raw.anforderungsprofil);
  const effectiveSoll = (() => {
    // Normal case: soll has content from correct model classification
    if (soll.length > 0) return soll;
    // Flat-array shape: model returned anforderungsprofil as a string array
    if (muss.length === 0 && kann.length === 0 && flatAnforderungen.length > 0)
      return flatAnforderungen;
    // All-in-kann shape: model classified unqualified requirements as optional
    if (muss.length === 0 && kann.length > 0)
      return kann;
    return soll;
  })();

  const companyContext = asString(raw.companyContext ?? raw.summary);
  const companyName = asString(raw.companyName);

  const canonicalizeText = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
  const classifiedLines = new Set(
    [...aufgaben, ...muss, ...soll, ...kann, ...effectiveSoll].map(canonicalizeText),
  );
  const rawTitle = asString(raw.jobTitle);
  const canonicalTitle = canonicalizeText(rawTitle);
  const titleWordCount = canonicalTitle ? canonicalTitle.split(" ").length : 0;
  const jobTitle =
    canonicalTitle.length > 0 &&
    titleWordCount <= 16 &&
    !classifiedLines.has(canonicalTitle)
      ? rawTitle.trim()
      : "";

  return {
    aufgaben,
    anforderungsprofil: { muss, soll: effectiveSoll, kann },
    companyContext,
    hiddenBlockers: asStringArray(raw.hiddenBlockers),
    atsKeywords: asStringArray(raw.atsKeywords),
    salary: asNullableString(raw.salary),
    location: asNullableString(raw.location),
    hoursPerWeek: asNullableString(raw.hoursPerWeek),
    workModel: asWorkModel(raw.workModel),
    employmentType: asEmploymentType(raw.employmentType),
    // Backward-compat pipeline fields
    companyName,
    jobTitle,
    responsibilities: aufgaben,
    requirements: [...muss, ...effectiveSoll],
    summary: companyContext,
  };
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as ExtractJobRequest;

    const url = typeof body.url === "string" ? normalizeUrl(body.url) : "";
    const pastedText = typeof body.jobDescriptionText === "string" ? body.jobDescriptionText.trim() : "";

    if (!url && !pastedText) {
      return NextResponse.json(
        { error: "Provide either 'url' or 'jobDescriptionText'." },
        { status: 422 },
      );
    }

    let extractedText = "";
    let source = "pasted-text";

    if (pastedText) {
      extractedText = pastedText;
      source = "pasted-text";
    } else {
      const fetched = await fetchCleanText(url).catch((err: unknown) => {
        throw err;
      });
      extractedText = fetched.text;
      source = fetched.source;
    }

    const rawExtracted = await extractWithAI(extractedText);
    const structuredJob = normalizeStructuredJob(rawExtracted);

    const isUsable =
      structuredJob.aufgaben.length > 0 ||
      structuredJob.anforderungsprofil.muss.length > 0 ||
      structuredJob.anforderungsprofil.soll.length > 0;

    if (!isUsable) {
      return NextResponse.json(
        {
          error:
            "The job content was extracted but no responsibilities or requirements were found. Please paste the full job description text for a cleaner result.",
          extractedText,
          structuredJob,
          source,
          normalizedUrl: url || "",
          warnings: ["No structured content could be extracted."],
        },
        { status: 422 },
      );
    }

    return NextResponse.json({
      extractedText,
      structuredJob,
      detectedCompany: structuredJob.companyName,
      detectedRole: structuredJob.jobTitle,
      source,
      normalizedUrl: url || "",
      warnings: [],
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not extract job description.";
    console.error("[extract-job]", message);
    return NextResponse.json({ error: message }, { status: err instanceof Error && err.message.includes("page could not be extracted") ? 422 : 500 });
  }
}
