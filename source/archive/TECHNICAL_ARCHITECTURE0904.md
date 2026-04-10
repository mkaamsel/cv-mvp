TECHNICAL_ARCHITECTURE.md

# AI Job Application Assistant — Technical Architecture

Version: MVP-2  
Status: Active Technical Authority  
Updated: April 2026

This document defines the **technical architecture, operational rules, and system behaviour** of the AI Job Application Assistant.

It is the **single source of truth for developers and AI sessions**.

Read alongside: `source/CV MVP Master reference v3.md`  
The Master Reference takes precedence on all conflicts.

---

# 1. Project Purpose

The system is an **AI-assisted job application engine** designed to help candidates prepare credible applications.

The system performs four primary tasks:

1. Build a structured CandidateProfile  
2. Analyse job descriptions  
3. Perform evidence-based positioning  
4. Generate tailored CV and cover letter drafts  

The system must **never invent candidate experience**.

All candidate claims must originate from verified candidate information.

---

# 2. Core System Principles

## CandidateProfile is the Source of Truth

All candidate claims must originate from:

- uploaded CVs
- additional CVs
- certificates
- Arbeitszeugnisse
- verified user inputs

The system must **never fabricate experience, qualifications, or achievements**.

All positioning must be grounded in **real evidence**.

---

## Engine Layers Perform Reasoning Only

Each engine layer in the pipeline may:

- analyse
- infer
- rank
- structure
- position evidence

Engine layers may **not**:

- control system workflow
- control routing
- modify architecture
- invent candidate facts

Workflow control belongs exclusively to the **orchestration layer**.

Note: "AI modules" and "engine layers" refer to the same concept. Engine layers is the correct term in code.

---

## Mentor / Professional Companion Model

The system behaves as a **mentor and professional companion**.

The tone must be:

- supportive  
- constructive  
- calm  
- evidence-driven  
- confidence-building  

The system must **not behave as**:

- gatekeeper  
- rejection engine  
- motivational hype generator  
- judgemental evaluator  

The system's purpose is to **help candidates present their experience clearly and confidently**.

---

# 3. Product Flow

The product workflow is fixed.

```
Profile → Job → Insights → Final → Chat Refinement
```

This flow must **never be reordered, shortened, or bypassed**.

---

## Profile Stage

The user builds the CandidateProfile.

Inputs may include:

- CV documents
- Arbeitszeugnisse
- certificates and qualification documents
- images (JPG, PNG)
- manual profile information via chat

All documents are appended raw before any AI processing.  
AI extraction runs once on the full combined record.  
Net add rule: profile must only get richer with each new document.

The system extracts structured signals from these sources.

---

## Job Stage

The user provides:

- job description text
- job posting URL

The system extracts structured job information into three internal bins:
- `aufgaben` — responsibilities
- `anforderungsprofil` — requirements (muss / soll / kann)
- `companyContext` — tone, culture, signals

The user sees only two verbatim blocks from the job posting:
- Ihre Aufgaben
- Ihr Profil

All other extracted data is internal only.

---

## Insights Stage

The system produces analysis including:

- required profile interpretation
- positioning opportunities
- risk detection
- selected evidence from candidate experience

---

## Final Stage

The system generates:

- tailored CV draft
- tailored cover letter draft

These drafts are generated using **evidence selected during analysis**.

---

## Chat Refinement Stage

The user refines the generated output through natural language instructions.  
Profile corrections entered here are permanently logged with source record and timestamp.  
User corrections are highest authority — never overwritten by re-extraction.

---

# 4. System Architecture

The system follows a layered architecture.

```
UI
↓
Route Adapter
↓
Orchestration Layer
↓
Engine Layers
↓
Bundle Assembly
↓
Generators
↓
Review
↓
Response
```

Each layer has **one responsibility only**.

No layer may bypass another layer.

---

# 5. Engine Pipeline

The engine executes layers in a strict order.

```
candidateProfile
↓
structuredJob
↓
requiredProfile
↓
companyContext  ┐
companyResearch ├─ Parallel
marketSignals   ┘
↓
selectedEvidence
↓
positioningBrief
↓
recommendation
↓
bundleAssembly
↓
generators (CV draft + cover letter)
↓
review
```

Rules:

- steps must run in order
- steps may not be skipped
- steps must produce structured outputs
- each layer has a rule track and an AI track
- AI tracks can be toggled on/off without breaking the pipeline

---

# 6. Single Generation Pipeline

All application generation must occur through:

```
POST /api/tailoring
```

Allowed routes (complete list):

```
/api/tailoring
/api/extract-candidate-profile
/api/extract-job
/api/fetch-job
/api/download
/api/feedback
/api/tailoring-runs
/api/profile/load
/api/profile/save
/api/profile/profile-chat
/api/optimisation/run-tournament
```

Forbidden legacy routes — must never appear outside XXX_archive_pending_cleanup:

```
/api/generate-cv
/api/generate-cover-letter
/api/application-recommendation
```

---

# 7. Repository Structure

The project repository must follow this structure.

```
app/
  workspace/
    profile/
    job/
    insights/
    final/
  debug/
  observatory/
  api/
    tailoring/
    extract-candidate-profile/
    extract-job/
    fetch-job/
    download/
    feedback/
    tailoring-runs/
    profile/
      load/
      save/
      profile-chat/
    optimisation/
      run-tournament/

components/
  workspace/
  ui/

lib/
  contracts/       ← schema layer — all schemas here
  prompts/         ← all AI prompts here only
  engine/
    candidate/
    job/
    required-profile/
    company-context/
    company-research/
    market-signals/
    selected-evidence/
    positioning-brief/
    recommendation/
    core/
    observability/
  orchestration/
    runApplicationPipeline.ts
    sequencing/
    bundle-assembly/
    generation-handoff/
  optimisation/
    tournament/
    judge/
    results/
    evolution/
  design/
  supabase/
  profile/
  workspace/
  utils/

source/
  TECHNICAL_ARCHITECTURE.md    ← this file
  CV MVP Master reference v3.md
  BUILD_PROFILE_BUG_REPORT.md
  PROFILE_ENRICHMENT_ARCHITECTURE_V2.md

test-data/                     ← gitignored
  profile-inputs/
  prompt-tournament/

types/
  applicationIntelligenceBundle.ts
  evidence.ts
  intelligenceModule.ts
  intelligenceRunContext.ts
  positioningBrief.ts
  selectedEvidence.ts

supabase/
  migrations/

XXX_archive_pending_cleanup/   ← legacy files, do not reference or reintroduce
```

---

# 8. Workspace Model

User interaction occurs through workspace pages.

```
workspace/profile
workspace/job
workspace/insights
workspace/final
```

Workspace state is controlled by **WorkspaceProvider**.

Pages must not create competing state systems.

---

# 9. Language Architecture

The system is designed to operate **multilingually**.

Language behaviour must not require architectural changes.

---

## Supported Languages

```
German (DE)
English (EN)
Spanish (ES)
```

Additional languages may be added without redesign.

---

## Input Language Detection

The system must detect the language of:

- CV documents
- job descriptions
- user text inputs

Language detection occurs during preprocessing via `lib/profile/languageDetection.ts`.

---

## Output Language Selection

Output language hierarchy:

```
JD language → CV language → interaction language
```

Users may override at any time. Override is stored in CandidateProfile and respected permanently.

CandidateProfile language fields:

```
detectedInputLanguages: string[]
interactionLanguage: string
preferredOutputLanguage: string
outputLanguageLockedByUser: boolean
```

---

## Prompt Language Rule

All prompts in `/lib/prompts/` must accept an `outputLanguage` parameter.  
Zero hardcoded language assumptions anywhere in the prompt layer.  
DIN 5008 applies only when output language is DE.

---

# 10. Sector and Role Neutrality

The system must remain **sector-agnostic**.

No industry or profession may be hardcoded into the system.

The system must work across:

- industries
- professions
- seniority levels

All reasoning must originate from:

```
CandidateProfile
JobDescription
```

---

# 11. Prompt Location Rule

All prompts must exist inside:

```
/lib/prompts
```

Prompts must **not be embedded inside**:

- UI components
- pages
- route handlers

Prompt logic must remain modular.

---

# 12. Engine Output Rules

Engine layers must return **structured outputs**.

Outputs must be formatted as structured data.

Layers must not return raw prose when downstream processing depends on the result.

---

# 13. Document Generation Rules

Generated documents must be:

- credible
- evidence-based
- clear
- concise
- professionally modern

German output must respect **DIN 5008 formatting rules**.

---

## Language Style Guidelines

Generated text must avoid:

- AI clichés
- exaggerated claims
- generic filler language
- motivational hype

Example (German)

Avoid:

```
Mit großem Interesse habe ich Ihre Anzeige gelesen…
```

Prefer:

```
Direct professional opening referencing role relevance.
```

---

# 14. Visualization Rules

The system must avoid misleading performance metrics.

Forbidden:

```
numeric match scores
percentage fit scores
```

Allowed:

```
Red → Yellow → Green indicators
star-based feedback
qualitative guidance
```

---

# 15. Optimisation Layer

A permanent lateral layer runs alongside the production pipeline.  
It does not touch the production pipeline.

```
/test-data/profile-inputs/     ← candidate documents for tournament (gitignored)
/test-data/prompt-tournament/  ← prompt variants and results (gitignored)
/lib/optimisation/             ← tournament, judge, evolution logic
/api/optimisation/run-tournament ← trigger endpoint, on demand only
```

Supabase table: `prompt_tournament_results`

Current production extraction prompt: Prompt D  
Location: `/lib/prompts/Intelligence/extractCandidateProfilePrompt.ts`

Tournament runs on demand only. No automatic triggers.  
Winning prompt is promoted to production by explicit human decision only.

---

# 16. Observability and Continuous Improvement

This is a permanent feature of the system — not a debug tool. It is never removed.

Two components:

---

## Component 1 — Prompt Output Viewer

A dedicated tab or page in the Observatory where every prompt and its raw output can be inspected for any pipeline run.

**Purpose:**
- Run prompt tournaments and compare outputs side by side
- Identify exactly where the pipeline is weak
- Inspect what any layer received as input and returned as output

**Access:** Product owner only. Read-only — cannot alter pipeline behaviour from here.

**Location:**
```
app/observatory/
```

**Data source:** `observationPoints[]` collected per pipeline run and stored in Supabase.

---

## Component 2 — Feedback and Intelligence Dashboard

A permanent dashboard that monitors pipeline runs over time and surfaces improvement opportunities.

**Responsibilities:**
- Monitor pipeline runs over time
- Identify patterns — which layers produce weak output, which prompts consistently underperform, which job types cause failures
- Suggest specific improvements: e.g. "The positioning brief for senior roles is consistently thin — consider a tournament on this prompt"
- Log all suggestions and decisions — what was suggested, what was decided, what was implemented

**Access:** Product owner only. Read-only and audited — it observes and suggests, never acts.

**The accountability principle applies here too:**  
The dashboard points at problems and suggests solutions. The product owner decides. The system never self-modifies.

**Location:**
```
app/observatory/dashboard/
```

---

## Observability Rules

- Observation points are collected for every layer on every pipeline run
- Each observation records: layerId, timestamp, inputSummary, outputSummary, track (ai / rule_fallback), confidence, timeTaken, warnings
- Stored in Supabase — schema: `pipeline_observation_points`
- Observatory is read-only from the UI — no write operations are exposed
- The dashboard may suggest prompt improvements but may not trigger tournaments automatically
- All tournament triggers remain on-demand only, initiated by the product owner

---

# 17. Development Priorities

Development must follow this order.

```
1 System stabilization
2 Observability and telemetry
3 Internal testing
4 Output improvement
```

Language improvements are allowed when they operate **inside the reasoning pipeline**.

Cosmetic rewriting outside the pipeline is discouraged.

---

# 18. Session Start Protocol

Every development session must begin by reading:

1. `source/TECHNICAL_ARCHITECTURE.md` — this file
2. `source/CV MVP Master reference v3.md` — master reference

This prevents architecture drift.  
The Master Reference takes precedence on all conflicts.

---

# 19. Product Owner Role

The Product Owner controls:

- UX decisions
- positioning philosophy
- language tone
- output quality

The Product Owner does **not manage system architecture**.

Architecture must follow this document automatically.

---

# End of Technical Architecture Document — Version MVP-3 — April 2026
