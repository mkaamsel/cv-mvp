"use client";

import { useState } from "react";
import { designTokens } from "@/lib/designTokens";

export default function ConsentBanner() {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  return (
    <div className="border-b border-[#7fa7c6]/15 bg-[#182129]">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-3 px-4 py-4 lg:flex-row lg:items-center lg:justify-between lg:px-6">
        <div>
          <h3 className="text-sm font-semibold text-[#deebf5]">
            Privacy and processing
          </h3>
          <p className="mt-1 text-sm leading-6 text-[#d8cbbf]">
            This workspace processes uploaded application documents to build your
            profile, analyse target jobs, and generate tailored materials. Store
            and retention controls can be surfaced here next.
          </p>
        </div>

        <div className="flex gap-2">
          <button type="button" className={designTokens.buttonSecondary}>
            Review settings
          </button>
          <button
            type="button"
            onClick={() => setVisible(false)}
            className={designTokens.buttonPrimary}
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}