export type EvidenceItemType =
  | "role"
  | "achievement"
  | "skill"
  | "domain"
  | "education"
  | "certification"
  | "language";

export type SelectedEvidenceItem = {
  id: string;
  type: EvidenceItemType;
  title: string;
  summary: string;
  relevanceScore: number;
  supportingRequirements: string[];
  sourceRoleTitle?: string | null;
  sourceCompany?: string | null;
  rationale: string;
};

export type EvidenceGap = {
  requirement: string;
  severity: "low" | "medium" | "high";
  note: string;
};

export type SelectedEvidence = {
  topEvidence: SelectedEvidenceItem[];
  supportingEvidence: SelectedEvidenceItem[];
  gaps: EvidenceGap[];
  fitSummary: string;
};