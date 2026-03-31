import type { IntelligenceModule } from "../../../types/intelligenceModule";
import { createErrorEnvelope } from "../envelopes/createErrorEnvelope";

type JobPayload = {
  title: string | null;
  companyName: string | null;
  location: string | null;
  summary: string;
  responsibilities: string[];
  requirements: string[];
  source: "pasted-text";
};

function normalizeLine(line: string): string {
  return line.replace(/^[\-\*\u2022]\s*/, "").trim();
}

function unique(items: string[]): string[] {
  return Array.from(new Set(items.map((item) => item.trim()).filter(Boolean)));
}

function extractTitle(lines: string[]): string | null {
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const lower = line.toLowerCase();

    if (
      lower.startsWith("location:") ||
      lower.startsWith("responsibilities") ||
      lower.startsWith("requirements") ||
      lower.startsWith("qualifications") ||
      lower.startsWith("profile:")
    ) {
      continue;
    }

    return line;
  }

  return null;
}

function extractLocation(lines: string[]): string | null {
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const lower = line.toLowerCase();

    if (lower.startsWith("location:")) {
      const value = line.split(":").slice(1).join(":").trim();
      return value || null;
    }
  }

  return null;
}

function extractSection(
  lines: string[],
  startMatchers: string[],
  stopMatchers: string[]
): string[] {
  const items: string[] = [];
  let inSection = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    const lower = line.toLowerCase();

    if (startMatchers.some((matcher) => lower.startsWith(matcher))) {
      inSection = true;
      continue;
    }

    if (inSection && stopMatchers.some((matcher) => lower.startsWith(matcher))) {
      break;
    }

    if (!inSection || !line) continue;

    const cleaned = normalizeLine(line);
    if (cleaned) {
      items.push(cleaned);
    }
  }

  return unique(items);
}

function buildSummary(rawText: string): string {
  return rawText.replace(/\s+/g, " ").trim().slice(0, 700);
}

export const jobModule: IntelligenceModule<JobPayload> = {
  key: "job",

  async execute(context, _layers) {
    const rawText = context.jobInput?.rawText?.trim();

    if (!rawText) {
      return createErrorEnvelope({
        layerKey: "job",
        warnings: ["No job description input was provided."]
      });
    }

    const lines = rawText
      .split("\n")
      .map((line) => line.trimEnd())
      .filter((line) => line.trim().length > 0);

    const responsibilities = extractSection(
      lines,
      ["responsibilities", "your responsibilities", "tasks", "what you will do"],
      [
        "requirements",
        "qualifications",
        "profile",
        "what you bring",
        "benefits",
        "what we offer"
      ]
    );

    const requirements = extractSection(
      lines,
      ["requirements", "qualifications", "profile", "what you bring"],
      ["benefits", "what we offer", "apply", "application"]
    );

    const payload: JobPayload = {
      title: extractTitle(lines),
      companyName: context.targetCompanyName ?? null,
      location: extractLocation(lines) ?? context.targetLocation ?? null,
      summary: buildSummary(rawText),
      responsibilities,
      requirements,
      source: "pasted-text"
    };

    return {
      layerKey: "job",
      schemaVersion: "1.0",
      status: "ready",
      confidence:
        responsibilities.length > 0 || requirements.length > 0 ? "medium" : "low",
      warnings:
        responsibilities.length === 0 && requirements.length === 0
          ? ["Job text was provided, but no structured sections were detected."]
          : [],
      missingSignals: [],
      sourceRefs: [],
      payload
    };
  }
};