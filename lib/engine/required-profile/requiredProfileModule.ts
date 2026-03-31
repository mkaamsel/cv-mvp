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

type RequiredProfilePayload = {
  mustHaves: string[];
  shouldHaves: string[];
  domainSignals: string[];
  senioritySignals: string[];
  educationSignals: string[];
  languageSignals: string[];
  toolsAndSystems: string[];
};

function unique(items: string[]): string[] {
  return Array.from(new Set(items.map((item) => item.trim()).filter(Boolean)));
}

function detectKeyword(lines: string[], keywords: string[]): string[] {
  return lines.filter((line) =>
    keywords.some((keyword) => line.toLowerCase().includes(keyword))
  );
}

export const requiredProfileModule: IntelligenceModule = {
  key: "requiredProfile",
  version: "1.0",
  dependsOn: ["job"],

  async execute(_context, dependencies) {
    const jobLayer = dependencies.job;

    if (!jobLayer || jobLayer.status !== "ready" || !jobLayer.payload) {
      return createErrorEnvelope({
        layerKey: "requiredProfile",
        warnings: ["Job layer is not ready, so required profile could not be derived."]
      });
    }

    const job = jobLayer.payload as JobPayload;

    const allLines = [
      ...(job.requirements ?? []),
      ...(job.responsibilities ?? []),
      ...(job.summary ? [job.summary] : []),
      ...(job.title ? [job.title] : [])
    ];

    const mustHaves = unique([
      ...detectKeyword(allLines, ["ifrs", "hgb", "accounting", "closing", "general ledger"]),
      ...detectKeyword(allLines, ["audit", "reporting", "reconciliation"])
    ]);

    const shouldHaves = unique([
      ...detectKeyword(allLines, ["sap", "excel", "process improvement", "controls"]),
      ...detectKeyword(allLines, ["stakeholder", "communication"])
    ]);

    const domainSignals = unique(
      detectKeyword(allLines, [
        "accounting",
        "finance",
        "ifrs",
        "hgb",
        "reporting",
        "closing",
        "general ledger",
        "audit",
        "reconciliation",
        "controls"
      ])
    );

    const senioritySignals = unique(
      detectKeyword(allLines, [
        "manager",
        "lead",
        "ownership",
        "stakeholder",
        "coordinate",
        "manage",
        "responsible"
      ])
    );

    const educationSignals = unique(
      detectKeyword(allLines, [
        "degree",
        "bachelor",
        "master",
        "education",
        "university",
        "qualification"
      ])
    );

    const languageSignals = unique(
      detectKeyword(allLines, [
        "english",
        "german",
        "language",
        "communication"
      ])
    );

    const toolsAndSystems = unique(
      detectKeyword(allLines, [
        "sap",
        "excel",
        "erp",
        "hana",
        "oracle",
        "power bi",
        "systems"
      ])
    );

    const payload: RequiredProfilePayload = {
      mustHaves,
      shouldHaves,
      domainSignals,
      senioritySignals,
      educationSignals,
      languageSignals,
      toolsAndSystems
    };

    return {
      layerKey: "requiredProfile",
      schemaVersion: "1.0",
      status: "ready",
      confidence: mustHaves.length > 0 ? "medium" : "low",
      warnings: [],
      missingSignals: [],
      sourceRefs: [],
      payload
    };
  }
};