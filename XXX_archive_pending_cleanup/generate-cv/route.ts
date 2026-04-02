import { NextResponse } from "next/server";
import { buildGenerateCvInstructions } from "../../../../lib/prompts/generateCvPrompt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type OutputLanguage = "English" | "German";
type WritingLevel =
  | "Simple professional"
  | "B2 professional"
  | "C1 professional"
  | "Strong polished professional";

type OpenAIMessage = {
  role: "system" | "user";
  content: string;
};

type CandidateRole = {
  title: string;
  company: string | null;
  startDate: string | null;
  endDate: string | null;
  isCurrent: boolean;
  location: string | null;
  achievements: string[];
};

type CandidateLanguage = {
  language: string;
  proficiency: string | null;
};

type CandidateEducation = {
  degree: string;
  field: string | null;
  institution: string | null;
  endDate: string | null;
};

type CandidateCertification = {
  name: string;
  issuer: string | null;
  date: string | null;
};

type VerifiedClaim = {
  claim: string;
  evidence: string[];
  confidence: "high" | "medium";
};

type CandidateProfile = {
  fullName: string | null;
  headline: string | null;
  summary: string | null;
  roles: CandidateRole[];
  coreSkills: string[];
  tools: string[];
  standards: string[];
  industries: string[];
  languages: CandidateLanguage[];
  education: CandidateEducation[];
  certifications: CandidateCertification[];
  leadershipSignals: string[];
  strengths: string[];
  constraints: string[];
  verifiedClaims: VerifiedClaim[];
  openQuestions: string[];
};

type StructuredJob = {
  companyName: string;
  jobTitle: string;
  location: string;
  responsibilities: string[];
  requirements: string[];
  summary: string;
};

type RecommendationShape = {
  applicationRecommendation?: string;
  reasoningSummary?: string;
  advisorMessage?: string;
  strongMatches?: string[];
  stretchMatches?: string[];
  riskAreas?: string[];
  blockers?: string[];
  positioningStrategy?: string;
};

type GenerateCvRequest = {
  cvText?: string;
  jobText?: string;
  outputLanguage?: OutputLanguage;
  writingLevel?: WritingLevel;
  targetLanguage?: string;
  candidateProfile?: CandidateProfile;
  structuredJob?: StructuredJob;
  recommendation?: RecommendationShape;
};

async function callOpenAI(messages: OpenAIMessage[], temperature = 0.2) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("Missing OPENAI_API_KEY environment variable.");
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature,
      messages,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error: ${errorText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? "";
}

function normalizeOutputLanguage(value: unknown): OutputLanguage {
  if (value === "German") return "German";
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "german" || normalized === "de" || normalized === "deutsch") {
      return "German";
    }
  }
  return "English";
}

function normalizeWritingLevel(value: unknown): WritingLevel {
  if (
    value === "Simple professional" ||
    value === "B2 professional" ||
    value === "C1 professional" ||
    value === "Strong polished professional"
  ) {
    return value;
  }

  return "Strong polished professional";
}

function normalizeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
    )
  );
}

function formatCandidateProfile(profile: CandidateProfile): string {
  const sections: string[] = [];

  if (profile.fullName) sections.push(`Full name: ${profile.fullName}`);
  if (profile.headline) sections.push(`Headline: ${profile.headline}`);
  if (profile.summary) sections.push(`Summary: ${profile.summary}`);

  if (profile.roles?.length) {
    const rolesText = profile.roles
      .map((role, index) => {
        const lines: string[] = [];
        lines.push(`Role ${index + 1}:`);
        lines.push(`- Title: ${role.title}`);
        if (role.company) lines.push(`- Company: ${role.company}`);
        if (role.location) lines.push(`- Location: ${role.location}`);
        if (role.startDate || role.endDate || role.isCurrent) {
          lines.push(
            `- Period: ${role.startDate ?? "?"} to ${
              role.isCurrent ? "Present" : role.endDate ?? "?"
            }`
          );
        }
        if (role.achievements?.length) {
          lines.push(`- Achievements: ${role.achievements.filter(Boolean).join("; ")}`);
        }
        return lines.join("\n");
      })
      .join("\n\n");

    sections.push(`Roles:\n${rolesText}`);
  }

  if (profile.coreSkills?.length) {
    sections.push(`Core skills: ${profile.coreSkills.join(", ")}`);
  }

  if (profile.tools?.length) {
    sections.push(`Tools: ${profile.tools.join(", ")}`);
  }

  if (profile.standards?.length) {
    sections.push(`Standards: ${profile.standards.join(", ")}`);
  }

  if (profile.industries?.length) {
    sections.push(`Industries: ${profile.industries.join(", ")}`);
  }

  if (profile.languages?.length) {
    sections.push(
      `Languages: ${profile.languages
        .map((item) =>
          item.proficiency ? `${item.language} (${item.proficiency})` : item.language
        )
        .join(", ")}`
    );
  }

  if (profile.education?.length) {
    sections.push(
      `Education: ${profile.education
        .map((item) =>
          [item.degree, item.field, item.institution, item.endDate]
            .filter(Boolean)
            .join(" | ")
        )
        .join("; ")}`
    );
  }

  if (profile.certifications?.length) {
    sections.push(
      `Certifications: ${profile.certifications
        .map((item) => [item.name, item.issuer, item.date].filter(Boolean).join(" | "))
        .join("; ")}`
    );
  }

  if (profile.leadershipSignals?.length) {
    sections.push(`Leadership signals: ${profile.leadershipSignals.join("; ")}`);
  }

  if (profile.strengths?.length) {
    sections.push(`Strengths: ${profile.strengths.join("; ")}`);
  }

  if (profile.constraints?.length) {
    sections.push(`Constraints: ${profile.constraints.join("; ")}`);
  }

  if (profile.verifiedClaims?.length) {
    sections.push(
      `Verified claims: ${profile.verifiedClaims
        .map(
          (item) =>
            `${item.claim} [${item.confidence}] Evidence: ${item.evidence.join("; ")}`
        )
        .join(" | ")}`
    );
  }

  if (profile.openQuestions?.length) {
    sections.push(`Open questions: ${profile.openQuestions.join("; ")}`);
  }

  return sections.join("\n\n").trim();
}

function formatStructuredJob(job: StructuredJob): string {
  return [
    `Company: ${job.companyName || ""}`,
    `Job title: ${job.jobTitle || ""}`,
    `Location: ${job.location || ""}`,
    job.summary ? `Summary: ${job.summary}` : "",
    job.responsibilities?.length
      ? `Responsibilities:\n- ${job.responsibilities.join("\n- ")}`
      : "",
    job.requirements?.length
      ? `Requirements:\n- ${job.requirements.join("\n- ")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n")
    .trim();
}

function formatRecommendation(recommendation: RecommendationShape | undefined): string {
  if (!recommendation) return "";

  const lines: string[] = [];

  if (recommendation.applicationRecommendation) {
    lines.push(`Application recommendation: ${recommendation.applicationRecommendation}`);
  }
  if (recommendation.reasoningSummary) {
    lines.push(`Reasoning summary: ${recommendation.reasoningSummary}`);
  }
  if (recommendation.advisorMessage) {
    lines.push(`Advisor message: ${recommendation.advisorMessage}`);
  }

  const strongMatches = normalizeStringArray(recommendation.strongMatches);
  const stretchMatches = normalizeStringArray(recommendation.stretchMatches);
  const riskAreas = normalizeStringArray(recommendation.riskAreas);
  const blockers = normalizeStringArray(recommendation.blockers);

  if (strongMatches.length) {
    lines.push(`Strong matches: ${strongMatches.join("; ")}`);
  }
  if (stretchMatches.length) {
    lines.push(`Stretch matches: ${stretchMatches.join("; ")}`);
  }
  if (riskAreas.length) {
    lines.push(`Risk areas: ${riskAreas.join("; ")}`);
  }
  if (blockers.length) {
    lines.push(`Blockers: ${blockers.join("; ")}`);
  }
  if (recommendation.positioningStrategy) {
    lines.push(`Positioning strategy: ${recommendation.positioningStrategy}`);
  }

  return lines.join("\n").trim();
}

function buildLegacyInputs(body: GenerateCvRequest): {
  cvText: string;
  jobText: string;
  outputLanguage: OutputLanguage;
  writingLevel: WritingLevel;
} {
  const outputLanguage = normalizeOutputLanguage(
    body.outputLanguage ?? body.targetLanguage
  );
  const writingLevel = normalizeWritingLevel(body.writingLevel);

  const directCvText = typeof body.cvText === "string" ? body.cvText.trim() : "";
  const directJobText = typeof body.jobText === "string" ? body.jobText.trim() : "";

  const profileText = body.candidateProfile
    ? formatCandidateProfile(body.candidateProfile)
    : "";
  const structuredJobText = body.structuredJob
    ? formatStructuredJob(body.structuredJob)
    : "";
  const recommendationText = formatRecommendation(body.recommendation);

  const cvText = directCvText || profileText;
  const jobText = [structuredJobText, recommendationText].filter(Boolean).join("\n\n");

  return {
    cvText,
    jobText: directJobText || jobText,
    outputLanguage,
    writingLevel,
  };
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as GenerateCvRequest;

    const { cvText, jobText, outputLanguage, writingLevel } =
      buildLegacyInputs(body);

    if (!cvText || !jobText) {
      return NextResponse.json(
        {
          error:
            "CV generation requires either (cvText + jobText) or (candidateProfile + structuredJob).",
        },
        { status: 400 }
      );
    }

    const CV_LIMIT = 14000;
    const JD_LIMIT = 14000;

    if (cvText.length > CV_LIMIT) {
      return NextResponse.json(
        { error: "CV source content is too long. Please keep it under 14,000 characters." },
        { status: 400 }
      );
    }

    if (jobText.length > JD_LIMIT) {
      return NextResponse.json(
        {
          error:
            "Job source content is too long. Please keep it under 14,000 characters.",
        },
        { status: 400 }
      );
    }

    const locale = outputLanguage === "German" ? "de" : "en";
    const systemPrompt = buildGenerateCvInstructions(locale, writingLevel);

    const userPrompt = `
CANDIDATE SOURCE
${cvText}

TARGET ROLE SOURCE
${jobText}

Write the final tailored CV draft now.
`.trim();

    const result = await callOpenAI(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      0.2
    );

    const cleanedResult = normalizeString(result);

    return NextResponse.json({
      ok: true,
      cvDraft: cleanedResult,
      result: cleanedResult,
      meta: {
        outputLanguage,
        writingLevel,
      },
    });
  } catch (error) {
    console.error("Generate CV error:", error);

    return NextResponse.json(
      { error: "Something went wrong while generating the CV." },
      { status: 500 }
    );
  }
}