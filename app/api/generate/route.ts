import { NextResponse } from "next/server";

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

async function callOpenAI(messages: OpenAIMessage[], temperature = 0.3) {
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

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const cvText = body.cvText?.trim() || "";
    const jobText = body.jobText?.trim() || "";
    const outputLanguage: OutputLanguage = body.outputLanguage || "English";
    const writingLevel: WritingLevel =
      body.writingLevel || "Simple professional";

    if (!cvText || !jobText) {
      return NextResponse.json(
        { error: "CV text and job description are required." },
        { status: 400 }
      );
    }

    // Input safety limits
    const CV_LIMIT = 10000;
    const JD_LIMIT = 12000;

    if (cvText.length > CV_LIMIT) {
      return NextResponse.json(
        { error: "Your CV is very long. Please keep it under 10,000 characters." },
        { status: 400 }
      );
    }

    if (jobText.length > JD_LIMIT) {
      return NextResponse.json(
        {
          error:
            "The job description is very long. Please keep it under 12,000 characters.",
        },
        { status: 400 }
      );
    }

    const systemPrompt = `
You are a professional CV tailoring assistant for finance, accounting, controlling, reporting, HGB and IFRS roles in Germany.

Your task:
- Rewrite the candidate CV so it fits the target role better
- Keep the CV compact, clear and professional
- Improve wording, structure and relevance
- Do NOT invent experience, qualifications, software, leadership scope, languages, industries, or achievements
- Only use information present in the CV
- Emphasize the most relevant experience for the job description
- Remove irrelevant repetition
- Keep the result easy to read
- Output only the tailored CV text
- Output language: ${outputLanguage}
- Writing level: ${writingLevel}
`;

    const userPrompt = `
MASTER CV:
${cvText}

JOB DESCRIPTION:
${jobText}

Please create a tailored CV for this role.
`;

    const result = await callOpenAI(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      0.3
    );

    return NextResponse.json({ result });
  } catch (error) {
    console.error("Generate CV error:", error);

    return NextResponse.json(
      { error: "Something went wrong while generating the CV." },
      { status: 500 }
    );
  }
}