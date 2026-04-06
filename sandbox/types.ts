export type MatchStatus = "matched" | "partially_matched" | "missing" | "hard_gate_failed";

export type Verdict = "strong_fit" | "partial_fit" | "weak_fit" | "not_eligible";

export type StrategyCode = "1" | "2" | "3" | "4";

export type DecisionFactor = {
  type: "job_task" | "job_requirement_possession" | "job_requirement_capability" | "hard_gate";
  jobRequirement: string;
  matchedCandidateEvidence: string[];
  status: MatchStatus;
  impact: "core_task" | "core_requirement" | "preference" | "hard_gate";
  explanation: string;
};

export type MatchResult = {
  cvId: string;
  jdId: string;
  code: StrategyCode;
  verdict: Verdict;
  summary: string;
  taskMatchScore: number;
  capabilityMatchScore: number;
  possessionMatchScore: number;
  hardGateFailed: boolean;
  decisionFactors: DecisionFactor[];
};