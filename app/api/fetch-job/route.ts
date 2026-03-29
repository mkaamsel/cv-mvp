import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url } = body;

    if (!url) {
      return NextResponse.json(
        { error: "No URL provided." },
        { status: 400 }
      );
    }

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; JobParserBot/1.0)"
      }
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Unable to fetch the job page." },
        { status: 500 }
      );
    }

    const html = await response.text();

    const systemPrompt = `
You extract structured job information from web pages.

Your task is to read raw HTML and extract the following information if available:

- Company name
- Job title
- Location
- Responsibilities
- Requirements / profile
- Industry
- Technologies mentioned
- Seniority level

Return JSON only in this format:

{
 "companyName": "",
 "jobTitle": "",
 "location": "",
 "responsibilities": [],
 "requirements": [],
 "industry": "",
 "technologies": [],
 "seniorityLevel": ""
}
`;

    const userPrompt = `
Extract job information from this HTML page:

${html}
`;

    const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        temperature: 0.2,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ]
      }),
    });

    const data = await aiResponse.json();
    const content = data?.choices?.[0]?.message?.content;

    if (!content) {
      return NextResponse.json(
        { error: "AI could not extract job information." },
        { status: 500 }
      );
    }

    let parsed;

    try {
      parsed = JSON.parse(content);
    } catch {
      return NextResponse.json(
        { error: "AI returned invalid JSON.", raw: content },
        { status: 500 }
      );
    }

    return NextResponse.json(parsed);

  } catch (error) {
    return NextResponse.json(
      { error: "Unexpected server error." },
      { status: 500 }
    );
  }
}