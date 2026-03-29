"use client";

import { useState } from "react";
import { downloadDocxFromApi } from "@/lib/documents/client-download";

type DownloadDocxButtonProps = {
  apiUrl: string;
  payload: unknown;
  fallbackFilename: string;
  label: string;
};

export default function DownloadDocxButton({
  apiUrl,
  payload,
  fallbackFilename,
  label,
}: DownloadDocxButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDownload() {
    try {
      setIsLoading(true);
      setError(null);
      await downloadDocxFromApi(apiUrl, payload, fallbackFilename);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Download failed.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleDownload}
        disabled={isLoading}
        className="rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isLoading ? "Preparing..." : label}
      </button>

      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
    </div>
  );
}