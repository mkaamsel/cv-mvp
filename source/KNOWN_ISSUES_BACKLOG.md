CV-MVP
Known Issues Backlog

---

# Active Engineering Issues

V1 Domain-specific keywords

File: runTailoringPipeline.ts

Problem: Hardcoded finance vocabulary.

Status: Blocked until AI RequiredProfile stable.

---

V2 Job title inference signals

Hardcoded title heuristics.

Must become AI-driven.

---

V3 German fallback strings

Fallback labels currently German-only.

Needs multilingual neutral replacements.

---

V4 Broken intelligence prompt import

File: applicationRecommendationPrompt.ts

Imports non-existent module.

Not affecting pipeline.

---

V5 Parallel execution missing

Layers that should run parallel:

companyContext
companyResearch
marketSignals

Currently sequential.

---

V6 Spanish fallback handling

Binary language logic still appears in fallback functions.

Low priority.

---

V7 Orphaned routes

Routes exist with broken imports.

Candidates for deletion.

---

# Architecture Gaps

Chat refinement stage not implemented
Observatory dashboard incomplete
Work authorization detection not wired

---

# UI Backlog

Profile page improvements:

• document library icons
• enrichment delta view

Job page improvements:

• stale job text clearing
• Enter key trigger fetch

END OF BACKLOG
