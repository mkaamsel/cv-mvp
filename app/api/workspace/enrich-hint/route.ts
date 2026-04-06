import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

type EnrichHintRequest = {
  fieldId: string;
  page: string;
  currentLength: number;
  charsTyped: number;
  focusDurationMs: number;
  profileSummary?: string | null;
  hasExistingProfile?: boolean;
  profileRoleCount?: number;
  profileClaimCount?: number;
};

type EnrichHintResponse =
  | { ok: true; hint: string }
  | { ok: false; hint: null };

// ─── Fallback hints (no API call needed) ──────────────────────────────────────
// These are also the baseline if the AI call fails.

function getFallbackHint(req: EnrichHintRequest): string {
  const { fieldId, hasExistingProfile, profileRoleCount } = req;

  if (fieldId === "primary-cv") {
    if (hasExistingProfile && (profileRoleCount ?? 0) > 0) {
      return "You can paste an updated CV here to refresh the profile, or add an Arbeitszeugnis in the supporting notes below to enrich your existing one.";
    }
    return "Paste your CV here — any format works. LinkedIn exports, Word copies, or plain text all give the system enough to build your profile.";
  }

  if (fieldId === "supporting-docs") {
    if (hasExistingProfile) {
      return "An Arbeitszeugnis or certificate pasted here adds verified claims that strengthen your existing profile.";
    }
    return "Add an Arbeitszeugnis, reference letter, or certificate here. Any evidence that supports or expands your CV will be extracted.";
  }

  if (fieldId === "job-description") {
    return "Paste the full job posting here — including the company overview if available. More context gives the analysis stronger results.";
  }

  if (fieldId === "job-url") {
    return "Paste a direct link to the job posting. LinkedIn, XING, and company career pages all work.";
  }

  return "Keep going — every detail you add here makes the final output stronger.";
}

// ─── AI-generated contextual hint ─────────────────────────────────────────────

function buildSystemPrompt(): string {
  return `You are a supportive mentor inside an AI job application system. A candidate is hesitating on a specific input field.

Your role: write one short, practical, friendly hint (1–2 sentences, max 35 words) that helps them understand what to put in this field and why it matters for their application.

Rules:
- Never sound like a gatekeeper, judge, or authority
- Be a trusted friend giving honest, practical advice
- Never start with "You should", "I", or "Make sure"
- No jargon, no generic encouragement like "Keep going!"
- Be specific to the field and the candidate's current state`;
}

function buildUserPrompt(req: EnrichHintRequest): string {
  const {
    fieldId,
    hasExistingProfile,
    profileSummary,
    profileRoleCount,
    profileClaimCount,
    currentLength,
    charsTyped,
    focusDurationMs,
  } = req;

  const fieldLabel =
    fieldId === "primary-cv"
      ? "the Primary CV text area (used to build the candidate profile)"
      : fieldId === "supporting-docs"
        ? "the Supporting Documents text area (for Arbeitszeugnisse, certificates, additional context)"
        : fieldId === "job-description"
          ? "the Job Description text area (pasted job posting)"
          : fieldId === "job-url"
            ? "the Job URL field"
            : `the ${fieldId} field`;

  const profileState = hasExistingProfile
    ? `The candidate already has a profile with ${profileRoleCount ?? 0} roles and ${profileClaimCount ?? 0} verified claims.${profileSummary ? ` Profile summary: "${profileSummary.slice(0, 120)}…"` : ""}`
    : "The candidate has not built a profile yet.";

  const fieldState =
    currentLength === 0
      ? "The field is completely empty."
      : charsTyped < 20
        ? `The field has ${currentLength} characters but the candidate has barely typed anything — they may have pasted partial content or are hesitating.`
        : `The field has ${currentLength} characters. The candidate has been focused for ${Math.round(focusDurationMs / 1000)}s but has paused.`;

  return `The candidate is stuck on ${fieldLabel}.

${profileState}
${fieldState}

Write a single hint for this specific situation.`;
}

// ─── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<Response> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ ok: false, hint: null } as EnrichHintResponse, {
        status: 401,
      });
    }

    const body = (await req.json().catch(() => ({}))) as EnrichHintRequest;

    if (!body.fieldId) {
      return NextResponse.json(
        { ok: false, hint: null } as EnrichHintResponse,
        { status: 400 },
      );
    }

    if (!openai) {
      const hint = getFallbackHint(body);
      return NextResponse.json({ ok: true, hint } satisfies EnrichHintResponse);
    }

    let hint: string | null = null;

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: buildSystemPrompt() },
          { role: "user", content: buildUserPrompt(body) },
        ],
        max_tokens: 80,
        temperature: 0.65,
      });

      hint = completion.choices[0]?.message?.content?.trim() ?? null;
    } catch {
      // AI call failed — fall through to fallback
    }

    if (!hint) {
      hint = getFallbackHint(body);
    }

    return NextResponse.json({ ok: true, hint } satisfies EnrichHintResponse);
  } catch {
    return NextResponse.json(
      { ok: false, hint: null } as EnrichHintResponse,
      { status: 500 },
    );
  }
}
