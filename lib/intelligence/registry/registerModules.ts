import { IntelligenceCore } from "../core/intelligenceCore";
import { candidateModule } from "../modules/candidateModule";
import { jobModule } from "../modules/jobModule";
import { requiredProfileModule } from "../modules/requiredProfileModule";
import { createLayerEnvelope } from "../envelopes/createLayerEnvelope";

export function registerModules(core: IntelligenceCore) {
  core.register(candidateModule);
  core.register(jobModule);
  core.register(requiredProfileModule);

  core.register({
    key: "companyContext",
    version: "1.0",
    execute: async () =>
      createLayerEnvelope({
        layerKey: "companyContext",
        status: "missing",
        confidence: "low",
        warnings: ["CompanyContext module not implemented yet"],
        payload: null
      })
  });

  core.register({
    key: "selectedEvidence",
    version: "1.0",
    dependsOn: ["candidate", "requiredProfile"],
    execute: async () =>
      createLayerEnvelope({
        layerKey: "selectedEvidence",
        status: "missing",
        confidence: "low",
        warnings: ["SelectedEvidence module not implemented yet"],
        payload: null
      })
  });

  core.register({
    key: "positioningBrief",
    version: "1.0",
    dependsOn: [
      "candidate",
      "job",
      "requiredProfile",
      "companyContext",
      "selectedEvidence"
    ],
    execute: async () =>
      createLayerEnvelope({
        layerKey: "positioningBrief",
        status: "missing",
        confidence: "low",
        warnings: ["PositioningBrief module not implemented yet"],
        payload: null
      })
  });
}