import type {
  ApplicationIntelligenceBundle,
  BundleLayerKey
} from "../../../types/applicationIntelligenceBundle";
import type { IntelligenceModule } from "../../../types/intelligenceModule";
import type { IntelligenceRunContext } from "../../../types/intelligenceRunContext";
import { createErrorEnvelope } from "../envelopes/createErrorEnvelope";

type RegisteredModules = Partial<
  Record<BundleLayerKey, IntelligenceModule<unknown>>
>;

export class IntelligenceCore {
  private modules: RegisteredModules = {};

  register<TPayload>(module: IntelligenceModule<TPayload>) {
    this.modules[module.key] = module as IntelligenceModule<unknown>;
  }

  async run(
    context: IntelligenceRunContext
  ): Promise<ApplicationIntelligenceBundle> {
    const layers: ApplicationIntelligenceBundle["layers"] = {};

    const executionOrder: BundleLayerKey[] = [
      "candidate",
      "job",
      "requiredProfile",
      "companyContext",
      "selectedEvidence",
      "positioningBrief"
    ];

    for (const layerKey of executionOrder) {
      const module = this.modules[layerKey];

      if (!module) continue;

      try {
        const result = await module.execute(context, layers);
        layers[layerKey] = result;
      } catch (error) {
        layers[layerKey] = createErrorEnvelope({
          layerKey,
          warnings: [
            error instanceof Error
              ? error.message
              : "Unknown module execution error."
          ]
        });
      }
    }

    const allWarnings = Object.values(layers).flatMap(
      (layer) => layer?.warnings ?? []
    );

    const allMissingSignals = Object.values(layers).flatMap(
      (layer) => layer?.missingSignals ?? []
    );

    return {
      schemaVersion: "1.0",
      bundleId: context.applicationId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      context: {
        applicationId: context.applicationId,
        outputLanguage: context.outputLanguage,
        targetRoleTitle: context.targetRoleTitle,
        targetCompanyName: context.targetCompanyName,
        targetLocation: context.targetLocation
      },
      layers,
      synthesis: {
        warnings: allWarnings,
        conflicts: [],
        missingSignals: allMissingSignals,
        readiness:
          layers.job && layers.requiredProfile ? "partial" : "early"
      }
    };
  }
}