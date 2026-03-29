import type {
  BundleLayerKey,
  LayerEnvelope
} from "./applicationIntelligenceBundle";
import type { IntelligenceRunContext } from "./intelligenceRunContext";

export type IntelligenceModule<TPayload = any> = {
  key: BundleLayerKey;
  version: string;
  dependsOn?: BundleLayerKey[];
  execute: (
    context: IntelligenceRunContext,
    dependencies: Partial<Record<BundleLayerKey, LayerEnvelope<any>>>
  ) => Promise<LayerEnvelope<TPayload>>;
};