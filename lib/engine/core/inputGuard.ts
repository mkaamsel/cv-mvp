type InputGuardResult = {
  ok: boolean;
  errors: string[];
  warnings: string[];
  metrics: {
    candidateChars: number;
    jobChars: number;
    totalChars: number;
    estimatedTokens: number;
  };
};

type GuardInput = {
  candidateText: string;
  jobDescriptionText: string;
};

const LIMITS = {
  candidateCharsSoft: 10000,
  candidateCharsHard: 20000,
  jobCharsSoft: 8000,
  jobCharsHard: 15000,
  totalCharsHard: 30000,
  estimatedTokensHard: 8000,
};

function estimateTokensFromChars(charCount: number) {
  return Math.ceil(charCount / 4);
}

export function guardGenerationInputs({
  candidateText,
  jobDescriptionText,
}: GuardInput): InputGuardResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const candidateChars = candidateText.trim().length;
  const jobChars = jobDescriptionText.trim().length;
  const totalChars = candidateChars + jobChars;
  const estimatedTokens = estimateTokensFromChars(totalChars);

  if (candidateChars === 0) {
    errors.push("candidateText is required.");
  }

  if (jobChars === 0) {
    errors.push("jobDescriptionText is required.");
  }

  if (candidateChars > LIMITS.candidateCharsSoft) {
    warnings.push(
      `Candidate text is long (${candidateChars} chars). Consider shortening or splitting supporting content.`
    );
  }

  if (jobChars > LIMITS.jobCharsSoft) {
    warnings.push(
      `Job description text is long (${jobChars} chars). Consider pasting only the most relevant sections.`
    );
  }

  if (candidateChars > LIMITS.candidateCharsHard) {
    errors.push(
      `Candidate text is too long (${candidateChars} chars). Maximum allowed is ${LIMITS.candidateCharsHard}.`
    );
  }

  if (jobChars > LIMITS.jobCharsHard) {
    errors.push(
      `Job description text is too long (${jobChars} chars). Maximum allowed is ${LIMITS.jobCharsHard}.`
    );
  }

  if (totalChars > LIMITS.totalCharsHard) {
    errors.push(
      `Combined input is too large (${totalChars} chars). Maximum allowed is ${LIMITS.totalCharsHard}.`
    );
  }

  if (estimatedTokens > LIMITS.estimatedTokensHard) {
    errors.push(
      `Estimated prompt size is too large (${estimatedTokens} tokens). Please shorten the CV, the job description, or move supporting information into separate profile-building steps.`
    );
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    metrics: {
      candidateChars,
      jobChars,
      totalChars,
      estimatedTokens,
    },
  };
}