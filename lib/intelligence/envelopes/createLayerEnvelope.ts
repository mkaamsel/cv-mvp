import type { BundleLayerKey } from "../../../types/applicationIntelligenceBundle";
import type {
  LayerConfidence,
  LayerEnvelope,
  LayerStatus
} from "../../../types/layerEnvelope";

type CreateLayerEnvelopeInput<T> = {
  layerKey: BundleLayerKey;
  status: LayerStatus;
  confidence?: LayerConfidence;
  warnings?: string[];
  missingSignals?: string[];
  sourceRefs?: string[];
  payload: T | null;
};

export function createLayerEnvelope<T>(
  input: CreateLayerEnvelopeInput<T>
): LayerEnvelope<T> {
  return {
    layerKey: input.layerKey,
    schemaVersion: "1.0",
    status: input.status,
    confidence: input.confidence,
    warnings: input.warnings ?? [],
    missingSignals: input.missingSignals ?? [],
    sourceRefs: input.sourceRefs ?? [],
    payload: input.payload
  };
}