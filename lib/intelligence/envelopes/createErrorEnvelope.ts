import type { BundleLayerKey } from "../../../types/applicationIntelligenceBundle";
import type { LayerEnvelope } from "../../../types/layerEnvelope";
import { createLayerEnvelope } from "./createLayerEnvelope";

type CreateErrorEnvelopeInput = {
  layerKey: BundleLayerKey;
  warnings?: string[];
  missingSignals?: string[];
  sourceRefs?: string[];
};

export function createErrorEnvelope(
  input: CreateErrorEnvelopeInput
): LayerEnvelope<null> {
  return createLayerEnvelope({
    layerKey: input.layerKey,
    status: "error",
    confidence: "low",
    warnings: input.warnings ?? ["Module execution failed."],
    missingSignals: input.missingSignals ?? [],
    sourceRefs: input.sourceRefs ?? [],
    payload: null
  });
}