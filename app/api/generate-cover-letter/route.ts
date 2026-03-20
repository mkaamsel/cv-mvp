import { NextResponse } from "next/server";

type OutputLanguage = "English" | "German";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { cvText, jobText, language } = body as {
      cvText?: string;
      jobText?: string;
      language?: OutputLanguage;
    };

    if (!cvText || !jobText) {
      return NextResponse.json(
        { error: "Missing CV or Job Description" },
        { status: 400 }
      );
    }

    const outputLanguage: OutputLanguage =
      language === "German" ? "German" : "English";

    const greetingRule =
      outputLanguage === "German"
        ? 'Start directly with "Sehr geehrte Damen und Herren," if no contact person is known.'
        : 'Start directly with "Dear Hiring Manager," if no contact person is known.';

    const closingRule =
      outputLanguage === "German"
        ? 'End with: "Mit freundlichen Grüßen"'
        : 'End with: "Kind regards"';

    const prompt = `
You are a professional job application writer specializing in finance and accounting roles in Germany.

INPUT:

Base CV:
${cvText}

Job Description:
${jobText}

TASK:
Write a short, modern, professional cover letter based only on the provided CV and job description.

RULES:
- Write in ${outputLanguage}.
- Keep it concise and credible.
- Do NOT invent experience, qualifications, numbers, or achievements.
- Do NOT use exaggerated or overly promotional language.
- Tailor the wording to the job description.
- Keep the tone contemporary and professional.
- No markdown code fences.
- No headings like subject line or sender/receiver address block.
- ${greetingRule}

STRUCTURE:
1. Short opening with motivation and role fit
2. Main paragraph with relevant experience and strengths
3. Short closing with availability / interest in discussion
4. ${closingRule}

Return plain text only.
`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a helpful cover letter writing assistant. Always write the final output in ${outputLanguage}.`,
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.5,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("OpenAI cover letter API error:", data);
      return NextResponse.json(
        { error: data?.error?.message || "Failed to generate cover letter" },
        { status: 500 }
      );
    }

    let output = data?.choices?.[0]?.message?.content || "No response from AI.";

    output = output
      .replace(/^```markdown\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    return NextResponse.json({ output });
  } catch (error) {
    console.error("Cover letter API error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}