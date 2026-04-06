import type { MatchResult } from "../types";

export function runCode1(cvId: string, jdId: string): MatchResult {
  return {
    cvId,
    jdId,
    code: "1",
    verdict: "partial_fit",
    summary: "Code 1 stricter possession logic.",
    taskMatchScore: 50,
    capabilityMatchScore: 50,
    possessionMatchScore: 50,
    hardGateFailed: false,
    decisionFactors: [],
  };
}