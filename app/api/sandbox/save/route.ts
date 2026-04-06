import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const resultsPath = path.join(
      process.cwd(),
      "sandbox",
      "Results",
      "experiments.json"
    );

    const file = fs.readFileSync(resultsPath, "utf8");
    const data = JSON.parse(file);

    data.push({
      ...body,
      savedAt: new Date().toISOString(),
    });

    fs.writeFileSync(resultsPath, JSON.stringify(data, null, 2));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false });
  }
}