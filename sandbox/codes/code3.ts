import type { MatchResult } from "../types";

export function runCode3(cvId: string, jdId: string): MatchResult {
  return {
    cvId,
    jdId,
    code: "3",
    verdict: "partial_fit",
    summary: "Code 3 stricter possession logic.",
    taskMatchScore: 50,
    capabilityMatchScore: 50,
    possessionMatchScore: 50,
    hardGateFailed: false,
    decisionFactors: [],
  };
}