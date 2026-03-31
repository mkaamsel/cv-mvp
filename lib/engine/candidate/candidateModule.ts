import type { IntelligenceModule } from "../../../types/intelligenceModule";
import { createErrorEnvelope } from "../envelopes/createErrorEnvelope";

type CandidatePayload = {
  summary: string;
  detectedRoles: string[];
  skillSignals: string[];
  domainSignals: string[];
  source: "pasted-text";
};

function unique(items: string[]): string[] {
  return Array.from(new Set(items.map((item) => item.trim()).filter(Boolean)));
}

function detectKeyword(lines: string[], keywords: string[]): string[] {
  return lines.filter((line) =>
    keywords.some((keyword) => line.toLowerCase().includes(keyword))
  );
}

function extractRoles(lines: string[]): string[] {
  return unique(
    detectKeyword(lines, [
      "accountant",
      "finance manager",
      "finance",
      "controller",
      "controlling",
      "reporting",
      "r2r",
      "record to report",
      "general ledger",
      "accounting"
    ])
  );
}

function buildSummary(rawText: string): string {
  return rawText.replace(/\s+/g, " ").trim().slice(0, 700);
}

export const candidateModule: IntelligenceModule = {
  key: "candidate",
  version: "1.0",

  async execute(context, _dependencies) {
    const rawText = context.candidateInput?.rawText?.trim();

    if (!rawText) {
      return createErrorEnvelope({
        layerKey: "candidate",
        warnings: ["Candidate input was not provided."]
      });
    }

    const lines = rawText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    const skillSignals = unique(
      detectKeyword(lines, [
        "ifrs",
        "hgb",
        "sap",
        "reporting",
        "controls",
        "process improvement",
        "audit",
        "general ledger",
        "reconciliation",
        "r2r",
        "record to report",
        "finance",
        "accounting"
      ])
    );

    const domainSignals = unique(
      detectKeyword(lines, [
        "finance",
        "accounting",
        "controlling",
        "reporting",
        "ifrs",
        "hgb"
      ])
    );

    const payload: CandidatePayload = {
      summary: buildSummary(rawText),
      detectedRoles: extractRoles(lines),
      skillSignals,
      domainSignals,
      source: "pasted-text"
    };

    return {
      layerKey: "candidate",
      schemaVersion: "1.0",
      status: "ready",
      confidence: skillSignals.length > 0 ? "medium" : "low",
      warnings: [],
      missingSignals: [],
      sourceRefs: [],
      payload
    };
  }
};