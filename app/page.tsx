"use client";

import { useState } from "react";

export default function Home() {
  const [inputText, setInputText] = useState("");
  const [outputText, setOutputText] = useState("");

  const handleGenerate = async () => {
    if (!inputText.trim()) {
      setOutputText("Please paste some CV or job text first.");
      return;
    }

    setOutputText("Processing...");

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ input: inputText }),
      });

      const data = await res.json();
      setOutputText(data.output || "No response received.");
    } catch (error) {
      setOutputText("Error processing request.");
    }
  };

  return (
    <main className="min-h-screen bg-white px-6 py-10">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-3xl font-bold tracking-tight">CV MVP</h1>
        <p className="mt-2 text-gray-600">
          Paste CV text or job description and generate improved output.
        </p>

        <div className="mt-8">
          <label className="mb-2 block text-sm font-medium">Input text</label>
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Paste CV text or job description here..."
            className="min-h-[240px] w-full rounded-xl border border-gray-300 p-4 outline-none"
          />
        </div>

        <div className="mt-4">
          <button
            onClick={handleGenerate}
            className="rounded-xl bg-black px-5 py-3 text-white"
          >
            Generate
          </button>
        </div>

        <div className="mt-8">
          <label className="mb-2 block text-sm font-medium">Output</label>
          <div className="min-h-[240px] whitespace-pre-wrap rounded-xl border border-gray-300 p-4">
            {outputText || "Your generated output will appear here."}
          </div>
        </div>
      </div>
    </main>
  );
}