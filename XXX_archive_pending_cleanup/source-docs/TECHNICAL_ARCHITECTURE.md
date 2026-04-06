TECHNICAL_ARCHITECTURE.md

# AI Job Application Assistant — Technical Architecture

Version: MVP  
Status: Active Technical Authority

This document defines the **technical architecture, operational rules, and system behaviour** of the AI Job Application Assistant.

It is the **single source of truth for developers and AI sessions**.

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

## AI Modules Perform Reasoning Only

AI modules may:

- analyse
- infer
- rank
- structure
- position evidence

AI modules may **not**:

- control system workflow
- control routing
- modify architecture
- invent candidate facts

Workflow control belongs exclusively to the **orchestration layer**.

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
Profile → Job → Insights → Final
```

This flow must **never be reordered, shortened, or bypassed**.

---

## Profile Stage

The user builds the CandidateProfile.

Inputs may include:

- CV documents
- additional professional documents
- manual profile information

The system extracts structured signals from these sources.

---

## Job Stage

The user provides:

- job description text
- job posting URL

The system extracts structured job information.

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

# 4. System Architecture

The system follows a layered architecture.

```
UI
↓
Route Adapter
↓
Orchestration Layer
↓
Engine Modules
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

The engine executes modules in a strict order.

```
CandidateProfile
↓
StructuredJob
↓
RequiredProfile
↓
CompanyContext
↓
CompanyResearch
↓
MarketSignals
↓
SelectedEvidence
↓
PositioningBrief
↓
Recommendation
↓
BundleAssembly
↓
Generators
↓
Review
```

Rules:

- steps must run in order
- steps may not be skipped
- steps must produce structured outputs

---

# 6. Single Generation Pipeline

All application generation must occur through:

```
POST /api/tailoring
```

Forbidden legacy routes:

```
/api/generate-cv
/api/generate-cover-letter
/api/application-recommendation
```

These routes must **never appear in the repository**.

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
feedback/
tailoring-runs/

components/

workspace/
ui/

lib/

engine/
orchestration/
prompts/
design/
supabase/
profile/
workspace/
utils/
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

## Input Language Detection

The system must detect the language of:

- CV documents
- job descriptions
- user text inputs

Language detection occurs during preprocessing.

---

## Output Language Selection

The system generates documents in the **user-selected output language**.

Users may override the detected language.

Example:

```
Input CV: German
Job description: German
User output preference: English
```

The system generates the application in **English**.

---

## Initial Supported Languages

```
English
German
Spanish
```

The architecture must allow additional languages to be added without redesign.

Language handling must occur through **prompt instructions and generation layers** rather than hardcoded logic.

---

# 10. Sector and Role Neutrality

The system must remain **sector-agnostic**.

No industry or profession may be hardcoded into the system.

Examples of forbidden hardcoding:

```
finance-specific rules
software developer specific logic
marketing-specific templates
```

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

Engine modules must return **structured outputs**.

Outputs must be formatted as structured data.

Modules must not return raw prose when downstream processing depends on the result.

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

# 15. Development Priorities

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

# 16. Session Start Protocol

Every development session must begin by reviewing:

1. this architecture document
2. current project status

This prevents architecture drift.

---

# 17. Product Owner Role

The Product Owner controls:

- UX decisions
- positioning philosophy
- language tone
- output quality

The Product Owner does **not manage system architecture**.

Architecture must follow this document automatically.

---

# End of Technical Architecture Document