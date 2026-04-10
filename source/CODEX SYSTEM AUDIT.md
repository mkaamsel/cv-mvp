---

# DOCUMENT 2  
# CODEX SYSTEM AUDIT

Save as:


source/CODEX_SYSTEM_AUDIT.md


This document contains the **prompt you paste into Codex**.

---


AI JOB APPLICATION ASSISTANT
Codex System Audit Prompt
Version: 1.0


---

# Purpose

This audit checks the repository for architecture violations and engineering drift.

The audit should be run periodically or before major releases.

The goal is to quickly detect:

• architecture violations  
• forbidden routes  
• prompt location drift  
• hardcoded sector logic  
• language rule violations  
• pipeline bypasses

---

# How to Use

Open Codex in the repository and paste the prompt below.

Codex should **not modify files**, only report issues.

---

# Codex Audit Prompt


You are performing a system audit of the AI Job Application Assistant repository.

Read the following architecture authorities first:

source/CV_MVP_MASTER_REFERENCE.md
source/TECHNICAL_ARCHITECTURE.md

Your task is to scan the repository and report violations.

Do NOT modify files.

Return only a structured report with:

Architecture violations
Forbidden routes found
Prompt location violations
Hardcoded sector or role logic
Language rule violations
Pipeline bypasses
Orphaned or unused routes
Files referencing archived paths

Audit rules:

ARCHITECTURE VIOLATIONS

Detect any logic that bypasses the orchestrator pipeline
Detect generators reading raw CV or JD inputs

FORBIDDEN ROUTES
Check for presence of:
api/generate-cv
api/generate-cover-letter
api/application-recommendation

PROMPT LOCATION RULE
All prompts must live in:

lib/prompts/

Flag any prompt logic found in:

UI components
API routes
utility files

SECTOR NEUTRALITY RULE
Flag hardcoded domain assumptions such as:

finance
accounting
medical
legal

unless they originate from CandidateProfile or JobDescription.

LANGUAGE SYSTEM RULE
Verify prompts accept an outputLanguage parameter.

Flag prompts that hardcode language assumptions.

PIPELINE BYPASS
Verify generation always occurs through:

POST /api/tailoring

Flag any alternative generation path.

ORPHANED ROUTES
Detect API routes not listed in the architecture document.

RETURN FORMAT

Return a structured report:

Architecture Violations
(list)

Forbidden Routes
(list)

Prompt Location Violations
(list)

Sector Hardcoding
(list)

Language Rule Violations
(list)

Pipeline Bypass
(list)

Orphaned Routes
(list)

If no issues are found, state:

"No violations detected."


---

# Result