import { NextResponse } from "next/server";

type OpenAIMessage = {
  role: "system" | "user";
  content: string;
};

async function callOpenAI(messages: OpenAIMessage[], temperature = 0.2) {
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

    const candidateProfile = body.candidateProfile;
    const jobText = body.jobText?.trim() || "";

    if (!candidateProfile || !jobText) {
      return NextResponse.json(
        { error: "Candidate profile and job description required." },
        { status: 400 }
      );
    }

    const systemPrompt = `
You compare a candidate profile with a job description.

Return JSON only.

Required format:

{
 "fit_score": number,
 "warning": boolean,
 "strengths": string[],
 "gaps": string[],
 "summary": string
}

Rules:
- score 0-100
- warning=true if candidate seems underqualified or mismatched
- strengths = matching areas
- gaps = missing skills/experience
- summary = short explanation
`;

    const userPrompt = `
Candidate profile:
${JSON.stringify(candidateProfile)}

Job description:
${jobText}
`;

    const result = await callOpenAI(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      0.2
    );

    return NextResponse.json({ result: JSON.parse(result) });
  } catch (error) {
    console.error("Role fit error:", error);

    return NextResponse.json(
      { error: "Failed to check role fit." },
      { status: 500 }
    );
  }
}