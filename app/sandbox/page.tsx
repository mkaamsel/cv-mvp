"use client";

import React, { useMemo, useState } from "react";
import { runCode1 } from "@/sandbox/codes/code1";
import { runCode2 } from "@/sandbox/codes/code2";
import { runCode3 } from "@/sandbox/codes/code3";
import { runCode4 } from "@/sandbox/codes/code4";
import { sampleCvsText } from "@/sandbox/Data/cvs";
import { sampleJdsText } from "@/sandbox/Data/jds";
import type { MatchResult, StrategyCode } from "@/sandbox/types";

type BlockMap = Record<string, string>;

function parseBlocks(text: string, kind: "CV" | "JD"): BlockMap {
  const pattern = new RegExp(
    `=== ${kind}_START: ([A-Z]{2}_\\d{2}) ===([\\s\\S]*?)=== ${kind}_END: \\1 ===`,
    "g"
  );

  const result: BlockMap = {};
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    const id = match[1].trim();
    const body = match[2].trim();
    result[id] = body;
  }

  return result;
}

function verdictClass(verdict: MatchResult["verdict"]): string {
  switch (verdict) {
    case "strong_fit":
      return "bg-green-100 text-green-800 border-green-200";
    case "partial_fit":
      return "bg-amber-100 text-amber-800 border-amber-200";
    case "weak_fit":
      return "bg-orange-100 text-orange-800 border-orange-200";
    case "not_eligible":
    default:
      return "bg-red-100 text-red-800 border-red-200";
  }
}

function badgeClass(status: MatchResult["decisionFactors"][number]["status"]): string {
  switch (status) {
    case "matched":
      return "bg-green-100 text-green-800 border-green-200";
    case "partially_matched":
      return "bg-amber-100 text-amber-800 border-amber-200";
    case "hard_gate_failed":
      return "bg-red-100 text-red-800 border-red-200";
    case "missing":
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
}

function prettyVerdict(verdict: MatchResult["verdict"]): string {
  switch (verdict) {
    case "strong_fit":
      return "Strong fit";
    case "partial_fit":
      return "Partial fit";
    case "weak_fit":
      return "Weak fit";
    case "not_eligible":
      return "Not eligible";
  }
}

function runSelectedCode(code: StrategyCode, cvId: string, jdId: string): MatchResult {
  switch (code) {
    case "1":
      return runCode1(cvId, jdId);
    case "2":
      return runCode2(cvId, jdId);
    case "3":
      return runCode3(cvId, jdId);
    case "4":
      return runCode4(cvId, jdId);
    default:
      return runCode1(cvId, jdId);
  }
}

export default function SandboxPage() {
  const cvMap = useMemo(() => parseBlocks(sampleCvsText, "CV"), []);
  const jdMap = useMemo(() => parseBlocks(sampleJdsText, "JD"), []);

  const cvIds = useMemo(() => Object.keys(cvMap).sort(), [cvMap]);
  const jdIds = useMemo(() => Object.keys(jdMap).sort(), [jdMap]);

  const [selectedCvId, setSelectedCvId] = useState<string>(cvIds[0] ?? "CV_01");
  const [selectedJdId, setSelectedJdId] = useState<string>(jdIds[0] ?? "JD_01");
  const [selectedCode, setSelectedCode] = useState<StrategyCode>("1");

  const selectedResult = useMemo(() => {
    return runSelectedCode(selectedCode, selectedCvId, selectedJdId);
  }, [selectedCode, selectedCvId, selectedJdId]);

  async function handleSave(): Promise<void> {
    const payload = {
      cvId: selectedCvId,
      jdId: selectedJdId,
      code: selectedCode,
      result: selectedResult,
    };

    const response = await fetch("/api/sandbox/save", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      alert("Save failed");
      return;
    }

    alert("Experiment saved");
  }

  const codeButtons: StrategyCode[] = ["1", "2", "3", "4"];

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">Sandbox CV ↔ JD Matcher</h1>
              <p className="mt-1 text-sm text-slate-600">
                Choose a CV, a job description, and a code strategy. Save results for later analysis.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">CV number</span>
                <select
                  value={selectedCvId}
                  onChange={(e) => setSelectedCvId(e.target.value)}
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900"
                >
                  {cvIds.map((id) => (
                    <option key={id} value={id}>
                      {id}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">JD number</span>
                <select
                  value={selectedJdId}
                  onChange={(e) => setSelectedJdId(e.target.value)}
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900"
                >
                  {jdIds.map((id) => (
                    <option key={id} value={id}>
                      {id}
                    </option>
                  ))}
                </select>
              </label>

              <div>
                <span className="mb-1 block text-sm font-medium text-slate-700">Code</span>
                <div className="flex gap-2">
                  {codeButtons.map((code) => {
                    const active = selectedCode === code;
                    return (
                      <button
                        key={code}
                        type="button"
                        onClick={() => setSelectedCode(code)}
                        className={`rounded-2xl border px-4 py-2 text-sm font-semibold ${
                          active
                            ? "border-slate-900 bg-slate-900 text-white"
                            : "border-slate-300 bg-white text-slate-700"
                        }`}
                      >
                        Code {code}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleSave}
              className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm"
            >
              Save result
            </button>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1fr_420px_1fr]">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">{selectedCvId}</h2>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                Candidate CV
              </span>
            </div>

            <pre className="max-h-[72vh] overflow-auto whitespace-pre-wrap rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
              {cvMap[selectedCvId] ?? "CV text not found."}
            </pre>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-2">
                  <div
                    className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${verdictClass(
                      selectedResult.verdict
                    )}`}
                  >
                    {prettyVerdict(selectedResult.verdict)}
                  </div>

                  <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                    Code {selectedCode}
                  </div>
                </div>

                <p className="mt-3 text-sm leading-6 text-slate-700">{selectedResult.summary}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="text-xs font-medium text-slate-500">Task match</div>
                  <div className="mt-1 text-2xl font-semibold text-slate-900">
                    {selectedResult.taskMatchScore}
                  </div>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="text-xs font-medium text-slate-500">Capability match</div>
                  <div className="mt-1 text-2xl font-semibold text-slate-900">
                    {selectedResult.capabilityMatchScore}
                  </div>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="text-xs font-medium text-slate-500">Possession match</div>
                  <div className="mt-1 text-2xl font-semibold text-slate-900">
                    {selectedResult.possessionMatchScore}
                  </div>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="text-xs font-medium text-slate-500">Hard gate</div>
                  <div
                    className={`mt-1 text-sm font-semibold ${
                      selectedResult.hardGateFailed ? "text-red-700" : "text-green-700"
                    }`}
                  >
                    {selectedResult.hardGateFailed ? "Failed" : "Passed"}
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-900">Decision factors</h3>

                <div className="mt-3 space-y-3">
                  {selectedResult.decisionFactors.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
                      No decision factors available yet for this pairing and code.
                    </div>
                  ) : (
                    selectedResult.decisionFactors.map((factor, index) => (
                      <div
                        key={`${factor.jobRequirement}-${index}`}
                        className="rounded-2xl border border-slate-200 p-4"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full border px-2.5 py-1 text-xs font-medium ${badgeClass(
                              factor.status
                            )}`}
                          >
                            {factor.status.replaceAll("_", " ")}
                          </span>

                          <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600">
                            {factor.type.replaceAll("_", " ")}
                          </span>
                        </div>

                        <p className="mt-3 text-sm font-medium text-slate-900">
                          {factor.jobRequirement}
                        </p>

                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          {factor.explanation}
                        </p>

                        {factor.matchedCandidateEvidence.length > 0 && (
                          <div className="mt-3 rounded-2xl bg-slate-50 p-3">
                            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Candidate evidence
                            </div>

                            <ul className="mt-2 space-y-2 text-sm text-slate-700">
                              {factor.matchedCandidateEvidence.map((evidence, evidenceIndex) => (
                                <li key={`evidence-${evidenceIndex}`}>• {evidence}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">{selectedJdId}</h2>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                Job description
              </span>
            </div>

            <pre className="max-h-[72vh] overflow-auto whitespace-pre-wrap rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
              {jdMap[selectedJdId] ?? "JD text not found."}
            </pre>
          </section>
        </div>
      </div>
    </div>
  );
}