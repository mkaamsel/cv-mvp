import { candidateModule } from "./modules/candidateModule";
import { jobModule } from "./modules/jobModule";
import { requiredProfileModule } from "./modules/requiredProfileModule";
import { selectedEvidenceModule } from "./modules/selectedEvidenceModule";
import { positioningBriefModule } from "./modules/positioningBriefModule";

export function registerModules() {
  return {
    candidateModule,
    jobModule,
    requiredProfileModule,
    selectedEvidenceModule,
    positioningBriefModule,
  };
}