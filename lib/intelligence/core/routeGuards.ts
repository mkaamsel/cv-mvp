type TextGuardResult = {
  ok: boolean;
  errors: string[];
  warnings: string[];
  metrics: {
    charCount: number;
    estimatedTokens: number;
  };
};

type DocumentLike = {
  fileName: string;
  text: string;
};

type DocumentsGuardResult = {
  ok: boolean;
  errors: string[];
  warnings: string[];
  metrics: {
    documentCount: number;
    totalChars: number;
    estimatedTokens: number;
  };
};

type UploadedFileGuardResult = {
  ok: boolean;
  errors: string[];
  warnings: string[];
  metrics: {
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    sizeMb: number;
  };
};

export function normalizeWhitespace(value: string): string {
  return value
    .replace(/\u0000/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function estimateTokensFromChars(charCount: number): number {
  return Math.ceil(charCount / 4);
}

export function guardSingleTextInput(params: {
  label: string;
  text: string;
  softChars: number;
  hardChars: number;
  required?: boolean;
}): TextGuardResult {
  const normalized = normalizeWhitespace(params.text ?? "");
  const charCount = normalized.length;
  const estimatedTokens = estimateTokensFromChars(charCount);

  const errors: string[] = [];
  const warnings: string[] = [];

  if ((params.required ?? true) && charCount === 0) {
    errors.push(`${params.label} is required.`);
  }

  if (charCount > params.softChars) {
    warnings.push(
      `${params.label} is long (${charCount} chars). Consider shortening it.`
    );
  }

  if (charCount > params.hardChars) {
    errors.push(
      `${params.label} is too long (${charCount} chars). Maximum allowed is ${params.hardChars}.`
    );
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    metrics: {
      charCount,
      estimatedTokens,
    },
  };
}

export function guardDocumentsInput<T extends DocumentLike>(params: {
  documents: T[];
  maxDocuments: number;
  softCharsPerDocument: number;
  hardCharsPerDocument: number;
  totalCharsHard: number;
  estimatedTokensHard: number;
}): DocumentsGuardResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const documentCount = params.documents.length;

  if (documentCount === 0) {
    errors.push("At least one document is required.");
  }

  if (documentCount > params.maxDocuments) {
    errors.push(
      `Too many documents (${documentCount}). Maximum allowed is ${params.maxDocuments}.`
    );
  }

  let totalChars = 0;

  params.documents.forEach((doc, index) => {
    const normalizedText = normalizeWhitespace(doc.text ?? "");
    const charCount = normalizedText.length;
    totalChars += charCount;

    if (!normalizedText) {
      errors.push(`Document ${index + 1} (${doc.fileName}) has no readable text.`);
      return;
    }

    if (charCount > params.softCharsPerDocument) {
      warnings.push(
        `Document ${doc.fileName} is long (${charCount} chars). It may be truncated or summarized later.`
      );
    }

    if (charCount > params.hardCharsPerDocument) {
      errors.push(
        `Document ${doc.fileName} is too long (${charCount} chars). Maximum allowed per document is ${params.hardCharsPerDocument}.`
      );
    }
  });

  const estimatedTokens = estimateTokensFromChars(totalChars);

  if (totalChars > params.totalCharsHard) {
    errors.push(
      `Combined document text is too large (${totalChars} chars). Maximum allowed is ${params.totalCharsHard}.`
    );
  }

  if (estimatedTokens > params.estimatedTokensHard) {
    errors.push(
      `Estimated prompt size is too large (${estimatedTokens} tokens). Please reduce document volume or split profile building into smaller steps.`
    );
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    metrics: {
      documentCount,
      totalChars,
      estimatedTokens,
    },
  };
}

export function guardUploadedFile(params: {
  file: File;
  allowedMimeTypes: string[];
  maxBytes: number;
}): UploadedFileGuardResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const fileName = params.file.name ?? "uploaded-file";
  const mimeType = params.file.type ?? "";
  const sizeBytes = params.file.size ?? 0;
  const sizeMb = Number((sizeBytes / (1024 * 1024)).toFixed(2));

  if (!params.allowedMimeTypes.includes(mimeType)) {
    errors.push(
      `Unsupported file format. Allowed types: ${params.allowedMimeTypes.join(", ")}.`
    );
  }

  if (sizeBytes === 0) {
    errors.push("Uploaded file is empty.");
  }

  if (sizeBytes > params.maxBytes) {
    errors.push(
      `Uploaded file is too large (${sizeMb} MB). Maximum allowed is ${Number(
        (params.maxBytes / (1024 * 1024)).toFixed(2)
      )} MB.`
    );
  }

  if (sizeBytes > params.maxBytes * 0.8 && sizeBytes <= params.maxBytes) {
    warnings.push(
      `Uploaded file is large (${sizeMb} MB). Extraction may take longer than usual.`
    );
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    metrics: {
      fileName,
      mimeType,
      sizeBytes,
      sizeMb,
    },
  };
}

export function clampText(text: string, maxChars: number): {
  text: string;
  truncated: boolean;
} {
  if (text.length <= maxChars) {
    return { text, truncated: false };
  }

  return {
    text: text.slice(0, maxChars).trim(),
    truncated: true,
  };
}