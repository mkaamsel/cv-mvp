export type IntelligenceRunContext = {
  applicationId: string;
  outputLanguage: string;

  targetRoleTitle?: string;
  targetCompanyName?: string;
  targetLocation?: string;

  sourceMeta?: {
    primaryCvId?: string;
    additionalDocumentIds?: string[];
    jobUrl?: string;
    jobSourceType?: "url" | "pasted-text" | "manual";
  };

  candidateInput?: {
    rawText: string;
  };

  jobInput?: {
    rawText: string;
  };
};