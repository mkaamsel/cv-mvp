import { IntelligenceCore } from "@/lib/engine/core/intelligenceCore";
import { candidateModule } from "@/lib/engine/candidate/candidateModule";
import { jobModule } from "@/lib/engine/job/jobModule";
import { requiredProfileModule } from "@/lib/engine/required-profile/requiredProfileModule";
import { createLayerEnvelope } from "@/lib/engine/envelopes/createLayerEnvelope";
import { companyModule } from "@/lib/engine/company/companyModule";
import { selectedEvidenceModule } from "@/lib/engine/evidence/selectedEvidenceModule";
import { positioningBriefModule } from "@/lib/engine/positioning/positioningBriefModule";

export function registerModules(core: IntelligenceCore) {
  core.register(candidateModule);
  core.register(jobModule);
  core.register(requiredProfileModule);

  core.register({
    key: "companyContext",
    version: "1.0",
    dependsOn: ["job"],
    execute: async (context: any, dependencies: any) => {
      const jobPayload = dependencies.job?.payload as any;

      if (!jobPayload) {
        return createLayerEnvelope({
          layerKey: "companyContext",
          status: "missing",
          confidence: "low",
          warnings: ["Structured job missing for CompanyContext."],
          payload: null,
        });
      }

      try {
        const result = await companyModule({
          locale: context.outputLanguage === "de" ? "de" : "en",
          structuredJob: {
            companyName: jobPayload.companyName ?? "",
            jobTitle: jobPayload.jobTitle ?? "",
            location: jobPayload.location ?? "",
            responsibilities: Array.isArray(jobPayload.responsibilities)
              ? jobPayload.responsibilities
              : [],
            requirements: Array.isArray(jobPayload.requirements)
              ? jobPayload.requirements
              : [],
            summary: jobPayload.summary ?? "",
          },
          extractedText:
            typeof jobPayload.extractedText === "string"
              ? jobPayload.extractedText
              : "",
        });

        return createLayerEnvelope({
          layerKey: "companyContext",
          status: "ready",
          confidence: "medium",
          warnings: result?.warnings ?? [],
          payload: result.companyContext ?? result,
        });
      } catch (error) {
        return createLayerEnvelope({
          layerKey: "companyContext",
          status: "missing",
          confidence: "low",
          warnings: [
            error instanceof Error
              ? error.message
              : "CompanyContext module failed.",
          ],
          payload: null,
        });
      }
    },
  });

  core.register({
    key: "companyResearch",
    version: "1.0",
    dependsOn: ["job", "companyContext"],
    execute: async () =>
      createLayerEnvelope({
        layerKey: "companyResearch",
        status: "missing",
        confidence: "low",
        warnings: ["CompanyResearch module not implemented yet."],
        payload: null,
      }),
  });

  core.register({
    key: "marketSignals",
    version: "1.0",
    dependsOn: ["job", "companyContext"],
    execute: async () =>
      createLayerEnvelope({
        layerKey: "marketSignals",
        status: "missing",
        confidence: "low",
        warnings: ["MarketSignals module not implemented yet."],
        payload: null,
      }),
  });

  core.register({
    key: "selectedEvidence",
    version: "1.0",
    dependsOn: ["candidate", "job", "requiredProfile"],
    execute: async (context: any, dependencies: any) => {
      const candidatePayload = dependencies.candidate?.payload as any;
      const jobPayload = dependencies.job?.payload as any;
      const requiredProfilePayload = dependencies.requiredProfile?.payload as any;

      if (!candidatePayload || !jobPayload || !requiredProfilePayload) {
        return createLayerEnvelope({
          layerKey: "selectedEvidence",
          status: "missing",
          confidence: "low",
          warnings: [
            "Candidate, job, or required profile missing for SelectedEvidence.",
          ],
          payload: null,
        });
      }

      try {
        const result = await selectedEvidenceModule({
          locale: context.outputLanguage === "de" ? "de" : "en",
          candidateProfile: candidatePayload,
          requiredProfile: requiredProfilePayload,
          structuredJob: jobPayload,
        });

        return createLayerEnvelope({
          layerKey: "selectedEvidence",
          status: "ready",
          confidence: "medium",
          warnings: result?.warnings ?? [],
          payload: result.selectedEvidence ?? result,
        });
      } catch (error) {
        return createLayerEnvelope({
          layerKey: "selectedEvidence",
          status: "missing",
          confidence: "low",
          warnings: [
            error instanceof Error
              ? error.message
              : "SelectedEvidence module failed.",
          ],
          payload: null,
        });
      }
    },
  });

  core.register({
    key: "positioningBrief",
    version: "1.0",
    dependsOn: [
      "candidate",
      "job",
      "requiredProfile",
      "companyContext",
      "selectedEvidence",
    ],
    execute: async (context: any, dependencies: any) => {
      const candidatePayload = dependencies.candidate?.payload as any;
      const jobPayload = dependencies.job?.payload as any;
      
            const requiredProfilePayload =
        dependencies.requiredProfile?.payload as any;

      if (!candidatePayload || !jobPayload || !requiredProfilePayload) {
        return createLayerEnvelope({
          layerKey: "selectedEvidence",
          status: "missing",
          confidence: "low",
          warnings: [
            "Candidate, job, or required profile missing for SelectedEvidence.",
          ],
          payload: null,
        });
      }

      try {
        const result = await selectedEvidenceModule({
          locale: context.outputLanguage === "de" ? "de" : "en",
          candidateProfile: candidatePayload,
          requiredProfile: requiredProfilePayload,
          structuredJob: jobPayload,
        });

        return createLayerEnvelope({
          layerKey: "selectedEvidence",
          status: "ready",
          confidence: "medium",
          warnings: [],
          payload: result.selectedEvidence as any,
        });
      } catch (error) {
        return createLayerEnvelope({
          layerKey: "selectedEvidence",
          status: "missing",
          confidence: "low",
          warnings: [
            error instanceof Error
              ? error.message
              : "SelectedEvidence module failed.",
          ],
          payload: null,
        });
      }
    },
  });

  core.register({
    key: "positioningBrief",
    version: "1.0",
    dependsOn: [
      "candidate",
      "job",
      "requiredProfile",
      "companyContext",
      "selectedEvidence",
    ],
    execute: async () =>
      createLayerEnvelope({
        layerKey: "positioningBrief",
        status: "missing",
        confidence: "low",
        warnings: ["PositioningBrief module not implemented yet"],
        payload: null,
      }),
  });

  core.register({
    key: "recommendation",
    version: "1.0",
    dependsOn: [
      "candidate",
      "job",
      "requiredProfile",
      "companyContext",
      "companyResearch",
      "marketSignals",
      "selectedEvidence",
      "positioningBrief",
    ],
    execute: async () =>
      createLayerEnvelope({
        layerKey: "recommendation",
        status: "missing",
        confidence: "low",
        warnings: ["Recommendation module not implemented yet"],
        payload: null,
      }),
  });
}