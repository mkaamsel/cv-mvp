import type { CandidateProfile } from "./candidateProfile";
import type { JobProfile } from "./jobProfile";
import type { RequiredProfile } from "./requiredProfile";
import type { CompanyContext } from "./companyContext";
import type { SelectedEvidence } from "./selectedEvidence";
import type { PositioningBrief } from "./positioningBrief";
import type { LayerEnvelope } from "./layerEnvelope";

export type BundleLayerKey =
  | "candidate"
  | "job"
  | "requiredProfile"
  | "companyContext"
  | "selectedEvidence"
  | "positioningBrief";

export type BundleReadiness =
  | "early"
  | "partial"
  | "usable";

export type ApplicationIntelligenceBundle = {
  schemaVersion: "1.0";

  bundleId: string;

  createdAt: string;

  updatedAt: string;

  context: {
    applicationId: string;
    outputLanguage: string;

    targetRoleTitle?: string;
    targetCompanyName?: string;
    targetLocation?: string;
  };

  layers: {
    candidate?: LayerEnvelope<CandidateProfile>;
    job?: LayerEnvelope<JobProfile>;
    requiredProfile?: LayerEnvelope<RequiredProfile>;
    companyContext?: LayerEnvelope<CompanyContext>;
    selectedEvidence?: LayerEnvelope<SelectedEvidence>;
    positioningBrief?: LayerEnvelope<PositioningBrief>;
  };

  synthesis: {
    warnings: string[];
    conflicts: string[];
    missingSignals: string[];
    readiness: BundleReadiness;
  };
};