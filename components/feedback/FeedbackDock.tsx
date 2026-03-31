"use client";

import { useState } from "react";
import { designTokens } from "@/lib/designTokens";

const quickOptions = [
  "Too generic",
  "Too strong",
  "Missed experience",
  "Wrong tone",
  "Formatting issue",
];

export default function FeedbackDock() {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [note, setNote] = useState("");

  function toggleOption(option: string) {
    setSelected((current) =>
      current.includes(option)
        ? current.filter((item) => item !== option)
        : [...current, option]
    );
  }

  function handleSubmit() {
    console.log("Feedback payload", {
      selected,
      note,
    });

    setOpen(false);
    setSelected([]);
    setNote("");
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="fixed bottom-5 right-5 z-40 rounded-full border border-[#3a312b] bg-[#1b1918]/95 px-5 py-3 text-sm font-medium text-[#f4efe9] shadow-[0_12px_32px_rgba(0,0,0,0.32)] backdrop-blur transition hover:bg-[#28231f]"
      >
        Feedback
      </button>

      {open ? (
        <div className="fixed bottom-20 right-5 z-40 w-[360px] rounded-3xl border border-[#3a312b] bg-[#191614] p-5 shadow-[0_18px_40px_rgba(0,0,0,0.35)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-[#f4efe9]">
                Quick feedback
              </h3>
              <p className="mt-1 text-sm leading-6 text-[#a9998c]">
                Capture what needs improvement so the output can get sharper.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full border border-[#3a312b] px-3 py-1 text-xs text-[#d8cbbf]"
            >
              Close
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {quickOptions.map((option) => {
              const active = selected.includes(option);

              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => toggleOption(option)}
                  className={[
                    "rounded-full border px-3 py-1.5 text-xs transition",
                    active
                      ? "border-[#7fa7c6]/30 bg-[#7fa7c6]/15 text-[#deebf5]"
                      : "border-[#3a312b] bg-[#211d1a] text-[#d8cbbf] hover:bg-[#2a2420]",
                  ].join(" ")}
                >
                  {option}
                </button>
              );
            })}
          </div>

          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional note"
            className="mt-4 min-h-[110px] w-full rounded-2xl border border-[#3a312b] bg-[#211d1a] px-4 py-3 text-sm text-[#f4efe9] outline-none placeholder:text-[#8f7f72] transition focus:border-[#7fa7c6]/45 focus:ring-2 focus:ring-[#7fa7c6]/20"
          />

          <button
            type="button"
            onClick={handleSubmit}
            className="mt-4 w-full rounded-2xl border border-[#7fa7c6]/30 bg-[#7fa7c6]/15 px-4 py-3 text-sm font-medium text-[#deebf5] transition hover:bg-[#7fa7c6]/24"
          >
            Submit feedback
          </button>
        </div>
      ) : null}
    </>
  );
}