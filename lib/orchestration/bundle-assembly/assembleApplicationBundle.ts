export function assembleApplicationBundle(pipeline: {
  candidate: any;
  job: any;
  requiredProfile: any;
  companyContext: any;
  companyResearch: any;
  marketSignals: any;
  selectedEvidence: any;
  positioningBrief: any;
  recommendation: any;
}) {
  return {
    layers: {
      candidate: { payload: pipeline.candidate },
      job: { payload: pipeline.job },
      requiredProfile: { payload: pipeline.requiredProfile },
      companyContext: { payload: pipeline.companyContext },
      companyResearch: { payload: pipeline.companyResearch },
      marketSignals: { payload: pipeline.marketSignals },
      selectedEvidence: { payload: pipeline.selectedEvidence },
      positioningBrief: { payload: pipeline.positioningBrief },
      recommendation: { payload: pipeline.recommendation },
    },
  };
}