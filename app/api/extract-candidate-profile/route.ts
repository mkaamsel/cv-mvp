import { NextResponse } from "next/server";

type OpenAIMessage = {
  role: "system" | "user";
  content: string;
};

async function callOpenAI(messages: OpenAIMessage[], temperature = 0.1) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature,
      response_format: { type: "json_object" },
      messages,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error: ${errorText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? "{}";
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const cvText = body.cvText?.trim() || "";

    if (!cvText) {
      return NextResponse.json(
        { error: "CV text is required." },
        { status: 400 }
      );
    }

    if (cvText.length > 10000) {
      return NextResponse.json(
        { error: "Your CV is very long. Please keep it under 10,000 characters." },
        { status: 400 }
      );
    }

    const systemPrompt = `
You extract candidate profile data from a CV.

Rules:
- Use only information explicitly present in the CV.
- Do not invent qualifications, dates, leadership, seniority, age, tools, or industries.
- If information is missing, return null.
- Return valid JSON only.

Required JSON shape:
{
  "highest_education": string | null,
  "years_experience_estimate": string | null,
  "seniority_level": string | null,
  "leadership_experience": string | null,
  "languages": string[],
  "core_skills": string[],
  "erp_systems": string[],
  "reporting_frameworks": string[],
  "location": string | null,
  "age_present_in_cv": boolean,
  "age_value": string | null
}
`;

    const userPrompt = `
CV:
${cvText}
`;

    const result = await callOpenAI(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      0.1
    );

    return NextResponse.json({ result: JSON.parse(result) });
  } catch (error) {
    console.error("Extract candidate profile error:", error);

    return NextResponse.json(
      { error: "Something went wrong while extracting candidate data." },
      { status: 500 }
    );
  }
}