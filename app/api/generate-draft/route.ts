import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      cvText,
      jobDescription,
      outputLanguage,
      languageStyle,
      languageLevel,
      useDin5008,
      motivationNotes,
    } = body;

    if (!cvText || !jobDescription) {
      return NextResponse.json(
        { error: "Missing CV or job description." },
        { status: 400 }
      );
    }

    const systemPrompt = `
You are an experienced recruiting advisor and career positioning consultant specializing in finance and accounting roles in Germany and international environments.

You understand how hiring managers evaluate candidates and how candidates should position their experience credibly for a specific role.

Your task is to analyze a candidate profile and a job opportunity and produce a professional application draft.

CRITICAL RULES

1. Never invent experience the candidate does not have.
2. Do not exaggerate leadership responsibilities.
3. Do not fabricate industry exposure.
4. Only use evidence from the candidate profile.
5. You may intelligently reframe existing experience to show relevance.

Your goal is not only to summarize the candidate profile but to TRANSLATE their experience into the context of the target company and role.

The output must help the candidate understand:

• where their experience aligns strongly
• where there are gaps
• how their experience can still be positioned as relevant

LANGUAGE RULES

Use modern, credible professional language.

Avoid generic phrases such as:
"Mit großem Interesse habe ich..."

Avoid cover letters that could apply to any candidate.

Each paragraph of the cover letter must connect:

Candidate Experience → Role Requirement → Business Value

Do not produce exaggerated marketing language.

If DIN5008 is requested, follow professional German business letter conventions.
`;

    const userPrompt = `
CANDIDATE PROFILE
${cvText}

JOB DESCRIPTION
${jobDescription}

OUTPUT SETTINGS

Language: ${outputLanguage}
Language Style: ${languageStyle}
Language Level: ${languageLevel}
DIN5008: ${useDin5008}

OPTIONAL CONTEXT
${motivationNotes || "none"}

TASK

Perform a structured analysis.

LAYER 1 — CANDIDATE EVIDENCE

Identify:

• core competencies
• industries
• accounting standards (HGB, IFRS, US GAAP)
• ERP systems (SAP etc.)
• leadership scope
• environment scale (corporate, shared services, SME)

LAYER 2 — ROLE REQUIREMENTS

Extract from the job description:

• key responsibilities
• accounting frameworks
• system landscape
• leadership expectations
• stakeholder interaction

LAYER 3 — ENVIRONMENT MATCH

Determine the operating environment:

• multinational corporate
• mid-sized company
• consulting / advisory environment
• transformation environment
• operational accounting environment

Explain how the candidate's background TRANSLATES into this environment.

Do not invent experience.

Use phrasing such as:

• provides a strong foundation for
• translates well into
• offers relevant exposure for

LAYER 4 — POSITIONING INSIGHT

Explain how the candidate should position their background for this role.

The goal is to produce a useful insight that may create an "aha moment" for the candidate.

OUTPUT FORMAT

Return STRICT JSON only in this format:

{
 "fitLabel": "",
 "fitLevel": 0,
 "strongAlignments": [],
 "likelyGaps": [],
 "environmentTranslation": [],
 "suggestedPositioning": [],
 "tailoredCvDraft": "",
 "coverLetterDraft": ""
}
`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        temperature: 0.3,
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: userPrompt,
          },
        ],
      }),
    });

    const data = await response.json();

    const content = data?.choices?.[0]?.message?.content;

    if (!content) {
      return NextResponse.json(
        { error: "No response from AI model." },
        { status: 500 }
      );
    }

    let parsed;

    try {
      parsed = JSON.parse(content);
    } catch {
      return NextResponse.json(
        {
          error: "AI returned invalid JSON.",
          rawResponse: content,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(parsed);
  } catch (error) {
    return NextResponse.json(
      {
        error: "Server error generating draft.",
      },
      { status: 500 }
    );
  }
}