import type { MatchResult } from "../types";

export function runCode2(cvId: string, jdId: string): MatchResult {
  return {
    cvId,
    jdId,
    code: "2",
    verdict: "partial_fit",
    summary: "Code 2 stricter possession logic.",
    taskMatchScore: 50,
    capabilityMatchScore: 50,
    possessionMatchScore: 50,
    hardGateFailed: false,
    decisionFactors: [],
  };
}