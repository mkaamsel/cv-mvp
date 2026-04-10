AI JOB APPLICATION ASSISTANT
Technical Architecture
Version: MVP-4
Status: ACTIVE ENGINEERING AUTHORITY
Updated: April 2026

---

# 1. Purpose

This document defines the engineering architecture of the AI Job Application Assistant.

It translates the product constitution in `CV_MVP_MASTER_REFERENCE.md` into a concrete system design.

This document governs:

* pipeline structure
* orchestration rules
* data flow
* generation boundaries
* validation boundaries
* observability
* language behaviour
* optimization isolation
* architecture safety constraints

If implementation conflicts with this document, the implementation must be corrected unless this document is outdated and the Master Reference has already established a newer rule.

---

# 2. Relationship to Other Documents

This document is one of the two primary architecture authorities.

Primary authorities:

* `source/CV_MVP_MASTER_REFERENCE.md`
* `source/TECHNICAL_ARCHITECTURE.md`

Supporting documents:

* `source/COMMUNICATION_RULES.md`
* `source/CODEX_SYSTEM_AUDIT.md`
* `source/KNOWN_ISSUES_BACKLOG.md`
* `source/ExperimentsLog.md`
* `product/PRODUCT_VISION.md`

Role separation:

* Master Reference defines constitutional rules and locked product behaviour
* Technical Architecture defines engineering implementation structure
* Backlog tracks unresolved implementation issues
* Experiments log tracks controlled changes and rollback
* Communication Rules govern AI assistant behaviour
* Codex Audit provides repository compliance checks
* Product Vision explains candidate experience and long-term direction

---

# 3. System Overview

The system is a layered AI reasoning and document-generation pipeline for job application support.

The product helps a candidate:

1. build a structured CandidateProfile
2. parse and structure a job description
3. identify relevant evidence from the profile
4. generate a positioning strategy
5. produce an application recommendation
6. generate tailored documents
7. validate truthfulness
8. polish language without changing meaning

The system is not a simple generator.

It is an evidence-based reasoning engine with guarded generation.

---

# 4. Core Architecture Model

System flow:

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
Document Generation
↓
Validation Layers
↓
Response

Rules:

* each layer has one responsibility
* layers must not bypass each other
* later layers must not rewrite the logic of earlier layers except where explicitly defined
* generators must never consume raw CV or raw JD text directly
* validation layers may refine language and truthfulness but must not invent evidence
* all candidate-facing output must remain grounded in structured pipeline outputs

---

# 5. Locked Product Flow

The workspace flow is fixed as:

Profile → Job → Insights → Final → Chat Refinement

Current implemented workspace pages:

* `workspace/profile`
* `workspace/job`
* `workspace/insights`
* `workspace/final`
* `workspace/refinement` is part of the intended product flow, though backlog may still track incomplete implementation

The product flow must not be reordered or bypassed.

---

# 6. Source of Truth Model

## 6.1 Candidate Truth

The CandidateProfile is the canonical source of truth for candidate information.

Candidate claims may originate only from:

* CV documents
* Arbeitszeugnisse
* certificates
* verified user inputs

Rules:

* the system must never invent candidate experience or qualifications
* user corrections override AI extraction
* evidence sources should remain traceable at profile level
* downstream layers must rely on CandidateProfile, not raw uploaded files

## 6.2 Job Truth

The job description is transformed into a StructuredJob object.

Downstream layers must reason from StructuredJob and RequiredProfile, not from unstructured raw job text.

---

# 7. Canonical Route and Generation Rule

All primary application generation must occur through:

`POST /api/tailoring`

Allowed supporting routes include:

* `/api/tailoring`
* `/api/extract-candidate-profile`
* `/api/extract-job`
* `/api/fetch-job`
* `/api/download`
* `/api/feedback`
* `/api/tailoring-runs`
* `/api/profile/load`
* `/api/profile/save`
* `/api/profile/profile-chat`
* `/api/optimisation/run-tournament`

Forbidden generation routes:

* `/api/generate-cv`
* `/api/generate-cover-letter`
* `/api/application-recommendation`

Rules:

* no parallel shadow generation routes may be introduced
* recommendation logic must stay inside the main intelligence pipeline
* document generation must remain downstream of bundle assembly

---

# 8. Orchestration Layer

Main orchestrator:

`lib/orchestration/tailoring/runTailoringPipeline.ts`

Responsibilities:

* pipeline sequencing
* stage-to-stage data transfer
* error handling
* fallback handling
* telemetry capture
* stage status tracking
* packaging of final outputs

The orchestrator is the only component allowed to coordinate the full production pipeline.

No UI component, utility helper, or generator may replicate orchestration logic.

---

# 9. Engine Layer Design

Each major reasoning layer may contain two complementary tracks:

* rule-track
* ai-track

Rule-track purpose:

* stability
* deterministic guardrails
* fallback support
* explicit safety logic

AI-track purpose:

* semantic interpretation
* transferable skill reasoning
* contextual matching
* ranking and narrative shaping

Rules:

* AI reasoning must not violate source-of-truth constraints
* rule-track should not over-constrain the system into brittle keyword matching
* both tracks must support sector neutrality
* outputs must converge into structured layer outputs

---

# 10. Pipeline Definition

The production intelligence pipeline runs in this order.

## L1 CandidateProfile

Input:

* extracted and merged candidate information

Output:

* canonical CandidateProfile

Purpose:

* establish candidate truth base

---

## L2 StructuredJob

Input:

* raw job posting text or fetched job source

Output:

* StructuredJob

Purpose:

* transform job input into a structured object

---

## L3 RequiredProfile

Input:

* StructuredJob

Output:

* RequiredProfile

Purpose:

* distinguish role requirements, qualifications, tools, and expectations

---

## L4 CompanyContext

Input:

* StructuredJob and related metadata

Output:

* contextual company environment signals

Purpose:

* tone and environment framing only

---

## L5 CompanyResearch

Input:

* company data and research inputs

Output:

* factual company-aware signals

Purpose:

* optional document-level contextualization only

---

## L6 MarketSignals

Input:

* market or role-environment signals

Output:

* market context summary

Purpose:

* subtle calibration only, not fit logic

---

## L7 SelectedEvidence

Input:

* CandidateProfile
* RequiredProfile
* StructuredJob

Output:

* SelectedEvidence

Purpose:

* identify the strongest candidate signals supporting the role

---

## L8 PositioningBrief

Input:

* SelectedEvidence
* CandidateProfile
* StructuredJob
* RequiredProfile

Output:

* PositioningBrief

Purpose:

* define the narrative and strategic positioning of the candidate

---

## L9 Recommendation

Input:

* PositioningBrief
* SelectedEvidence
* RequiredProfile

Output:

* application recommendation

Purpose:

* classify role fit and explain application posture

---

## L9C RecommendationValidation

Input:

* Recommendation
* PositioningBrief
* SelectedEvidence
* missing signal analysis

Output:

* validated recommendation

Purpose:

* catch contradictions between label and reasoning

---

## L10 BundleAssembly

Input:

* outputs of prior intelligence layers

Output:

* ApplicationIntelligenceBundle

Purpose:

* produce the single structured object passed to generators

---

## L11 DocumentGeneration

Input:

* ApplicationIntelligenceBundle
* output language

Output:

* CV draft
* cover letter draft

Purpose:

* generate candidate-facing documents from the bundle only

---

## L12 TruthLayer

Input:

* generated drafts
* ApplicationIntelligenceBundle
* SelectedEvidence

Output:

* truth-aligned drafts

Purpose:

* detect unsupported claims and soften overstatement

---

## L13 LanguagePolishLayer

Input:

* truth-aligned drafts
* output language

Output:

* polished final drafts

Purpose:

* improve readability without altering meaning or facts

---

# 11. Engine Modules

Primary engineering areas are organized under:

`lib/engine/`

Representative module groups:

* `candidate/`
* `job/`
* `required-profile/`
* `company-context/`
* `company-research/`
* `market-signals/`
* `selected-evidence/`
* `positioning-brief/`
* `recommendation/`
* `generators/`
* `validation/`

Related supporting folders may exist elsewhere in `lib/` for contracts, orchestration, profile handling, workspace logic, and utilities.

---

# 12. Data Models

## 12.1 CandidateProfile Data Model

The CandidateProfile is the canonical candidate record.

Example structure:

CandidateProfile

{
personalInfo
roles[]
skills[]
tools[]
education[]
certifications[]
languages[]
verifiedClaims[]
}

Interpretation rules:

* it is the primary source of truth for candidate information
* it must support additive enrichment
* it should preserve verified user input
* it should support evidence traceability

---

## 12.2 StructuredJob Model

StructuredJob represents the parsed job description.

Example structure:

StructuredJob

{
jobTitle
company
tasks[]
qualifications[]
tools[]
seniority
location
language
}

Purpose:

* provide structured input for downstream reasoning
* separate tasks from qualifications where possible
* normalize noisy job text into usable fields

---

## 12.3 RequiredProfile Model

RequiredProfile represents the distilled role expectations from the job.

Typical contents may include:

* core requirement signals
* preferred signals
* qualification expectations
* tooling expectations
* responsibility patterns
* seniority indicators

Purpose:

* translate the job into a reasoning-ready target profile
* separate must-have signals from softer preference signals

---

## 12.4 SelectedEvidence Model

SelectedEvidence contains the candidate signals chosen as most relevant to the role.

Typical contents may include:

* strong evidence
* supporting evidence
* adjacent evidence
* weak evidence
* uncovered or missing signals references

Purpose:

* provide the factual basis for positioning
* reduce noise from the full CandidateProfile
* enable evidence-grounded recommendation and generation

---

## 12.5 PositioningBrief Structure

The PositioningBrief defines the strategy used to position the candidate.

Example structure:

PositioningBrief

{
positioningStrength
positioningStrategy
transferableSkills
credibilitySignals
riskAreas
}

Purpose:

* translate evidence into a coherent positioning narrative
* guide recommendation and generation
* define strengths, risk areas, and strategic emphasis

---

## 12.6 Recommendation Model

The recommendation layer outputs one label from the approved set:

* apply_confidently
* apply_with_care
* borderline
* not_recommended

Purpose:

* summarize fit level
* provide a usable candidate-facing recommendation posture
* keep fit messaging aligned with evidence and risks

---

## 12.7 ApplicationIntelligenceBundle Structure

The ApplicationIntelligenceBundle is the only object passed to generators.

Generators must never access raw CV or raw job description input directly.

Example structure:

ApplicationIntelligenceBundle

{
candidateProfile
structuredJob
requiredProfile
selectedEvidence
positioningBrief
recommendation
companyContext
companyResearch
marketSignals
}

Purpose:

* isolate generation from earlier reasoning steps
* maintain architectural separation
* make generation reproducible and inspectable

---

# 13. Evidence Model

## 13.1 Evidence Strength Types

Evidence is categorized by strength during selection and recommendation reasoning.

Strong Evidence

* direct match between candidate experience and job requirement

Supporting Evidence

* closely related experience supporting the requirement

Adjacent Evidence

* transferable experience that partially supports the requirement

Weak Evidence

* loosely related signals that should not drive the recommendation heavily

Purpose:

* avoid brittle exact-match behaviour
* support semantic and transferable skill reasoning
* preserve credibility by preventing over-reliance on weak signals

## 13.2 Evidence Selection Strategy

The SelectedEvidence layer identifies the most relevant candidate signals from the CandidateProfile that support the job requirements.

Selection rules:

* prioritize direct matches between candidate experience and job requirements
* include transferable experience where appropriate
* avoid over-selection of weak or loosely related signals
* limit evidence to the most relevant signals

Selected evidence becomes the factual foundation for:

* PositioningBrief
* Recommendation logic
* Document generation

## 13.3 SelectedEvidence Layer Purpose

The SelectedEvidence layer extracts and ranks the candidate signals that best support the role requirements.

Purpose:

* identify the strongest supporting experience
* highlight transferable skills
* filter out irrelevant candidate signals

The output of this layer feeds directly into PositioningBrief and Recommendation.

---

# 14. Missing Signals Model

The RequiredProfile layer may detect signals that are not present or not strongly represented in the CandidateProfile.

Signal categories:

Core Requirement Signals

* critical requirements for the role

Preferred Signals

* helpful but non-essential qualifications

Weak Signals

* optional signals with low importance

Rules:

* missing signals may influence caution
* missing signals must not become automatic disqualification
* transferable evidence should still be considered
* recommendation must reflect both strengths and gaps

---

# 15. Recommendation Validation

Correct pipeline naming:

L9 Recommendation
L9C RecommendationValidation

Purpose:

* verify that the recommendation label is logically consistent with:

  * selected evidence
  * positioning strength
  * detected missing signals

This layer exists to prevent contradictions such as:

* strong reasoning with weak label
* no blockers but overly cautious recommendation
* label severity that does not match the evidence posture

It may adjust the final recommendation label if the underlying reasoning supports it.

It must not invent evidence.

---

# 16. Recommendation Labels

Approved recommendation labels:

## apply_confidently

Meaning:

* candidate strongly matches the role

Typical condition:

* strong evidence supports most core requirements

User-facing meaning:

* this role is a strong match for your profile

## apply_with_care

Meaning:

* candidate can reasonably apply but some gaps exist

Typical condition:

* partial coverage of core requirements with a credible application case

User-facing meaning:

* there are some gaps but the application is still realistic

## borderline

Meaning:

* application is possible but success probability is lower

Typical condition:

* major requirements are missing but meaningful transferable signals exist

User-facing meaning:

* this role may be difficult but an application is possible

## not_recommended

Meaning:

* the role does not realistically match the profile

Typical condition:

* core requirements are missing without credible supporting evidence

User-facing meaning:

* this role is unlikely to match your profile

---

# 17. Generator Boundary

Generators may only consume the ApplicationIntelligenceBundle.

Generators must never:

* re-analyse the job description
* re-interpret raw CV inputs
* invent capabilities
* independently decide recommendation logic
* introduce evidence that was not selected upstream

Generation must remain a downstream rendering layer, not a second reasoning engine.

---

# 18. Truth Layer Behaviour

The TruthLayer validates generated documents against evidence.

Responsibilities:

* compare document claims with SelectedEvidence and bundle context
* detect unsupported statements
* soften exaggerated wording
* prevent invention of experience

Rules:

* the TruthLayer may adjust phrasing
* it must not change evidence selection
* it must not create new candidate claims
* it must not rewrite recommendation logic
* it must protect credibility over rhetorical strength

Purpose:

* ensure final drafts remain honest, supportable, and recruiter-safe

---

# 19. Language Polish Layer

The LanguagePolishLayer improves readability of generated documents.

Allowed changes:

* grammar corrections
* sentence clarity
* tone consistency
* readability improvement
* stylistic cleanup within factual boundaries

Forbidden changes:

* introducing new claims
* adding new skills
* altering evidence meaning
* modifying recommendation logic
* changing factual support level

Purpose:

* improve readability without altering factual content or strategic meaning

---

# 20. Language System

Supported languages:

* German
* English
* Spanish

Language behaviour:

* input detection is automatic
* interaction language follows user context
* output language hierarchy is:

JD language
→ CV language
→ interaction language

Users may override output language.

The override is stored in candidate state/profile logic as defined by implementation.

Rules:

* prompts and generation paths must respect output language
* language support must remain multilingual, not binary
* Spanish must be treated as a first-class supported language
* language behaviour must remain separate from candidate truth and recommendation logic

---

# 21. Document Regeneration (Language Switch)

The system may regenerate output documents without re-running the intelligence pipeline.

This occurs when the user changes the preferred output language.

Regeneration must reuse the existing ApplicationIntelligenceBundle.

Regeneration pipeline:

ApplicationIntelligenceBundle
↓
DocumentGeneration
↓
TruthLayer
↓
LanguagePolishLayer

Recommended endpoint:

`POST /api/regenerate-documents`

Rules:

* regeneration must not re-run intelligence layers
* regeneration must not modify evidence selection
* regeneration must not modify recommendation
* only language and phrasing may change

Purpose:

* enable fast language switching without repeating expensive reasoning steps

---

# 22. Company and Market Signal Containment

CompanyContext, CompanyResearch, and MarketSignals may exist in the intelligence bundle, but their use is constrained.

Containment rules:

* CompanyContext may inform tone and environment framing
* CompanyResearch may support limited factual company-aware wording
* MarketSignals may subtly calibrate phrasing
* these layers must not dominate fit logic
* they must not override evidence-based candidate positioning
* they must not create unsupported company claims

Recommendation and evidence selection must remain primarily grounded in CandidateProfile and role requirements.

---

# 23. Sector Neutrality Rule

The system must remain sector-agnostic.

Rules:

* no industry assumptions may be hardcoded into fit logic
* domain-specific fallback language should be avoided
* reasoning must originate from:

  * CandidateProfile
  * JobDescription / StructuredJob / RequiredProfile
* sector-specific conclusions are allowed only when derived from actual candidate or job evidence

This rule protects the system from finance-only, legal-only, or other domain drift.

---

# 24. Observability

Observation points are collected for every pipeline run.

Observability UI:

`app/observatory`

Observability purpose:

* debug pipeline behaviour
* inspect stage outputs
* trace fallbacks
* understand reasoning quality
* support internal testing and calibration

Example observation storage concept:

`pipeline_observation_points`

Each observation may record:

* layerId
* timestamp
* duration
* inputSummary
* outputSummary
* executionTrack
* aiTrackUsed
* fallbackTriggered
* warnings

Rules:

* observability must reflect actual pipeline stages
* observations should support layer-by-layer review
* telemetry must support debugging, not alter business logic

---

# 25. Optimization Layer

The optimization layer exists outside the production pipeline.

Location:

`lib/optimisation/`

Representative areas:

* tournament
* judge
* results
* evolution

Trigger endpoint:

`POST /api/optimisation/run-tournament`

Rules:

* optimization is not part of the live user flow
* tournament experiments must not silently mutate production behaviour
* promoted experiments must be documented and reversible
* production architecture must remain stable during experimentation

---

# 26. Experiment Governance

Experiments must be tracked with:

* purpose
* status
* rollback steps
* isolated change boundary

Approved experiment statuses:

* ACTIVE
* PROMOTED
* PAUSED
* REVERTED

Rules:

* every experiment must be independently reversible
* experiments must not create undocumented architecture drift
* promoted experiments should be reflected in architecture and/or backlog where relevant

---

# 27. Current Known Implementation Gaps

The following categories may still be tracked as implementation issues in the backlog and do not change the architecture itself:

* hardcoded finance vocabulary in parts of the pipeline
* brittle job title inference
* German-only fallback strings
* Spanish fallback inconsistencies
* sequential execution where parallelization is possible
* orphaned or broken routes
* incomplete observatory dashboard
* incomplete work authorization detection
* incomplete chat refinement implementation

These belong in backlog management, not architectural redesign.

---

# 28. Repository Structure

Key repository areas include:

app/

* workspace/
* debug/
* observatory/
* api/

components/

* workspace/
* ui/

lib/

* contracts/
* prompts/
* engine/
* orchestration/
* optimisation/
* design/
* supabase/
* profile/
* workspace/
* utils/

types/

supabase/

* migrations/

source/

product/

archive/

Rules:

* prompt logic belongs under `lib/prompts/`
* orchestration logic belongs under orchestration areas
* prompt logic must not be hidden inside UI or utility files
* archived material must not act as live authority

---

# 29. Architecture Protection Rules

This architecture is protected by three mechanisms:

1. Master Reference
2. Communication Rules
3. Codex System Audit

Practical enforcement:

* use Master Reference and Technical Architecture as primary authorities
* require AI coding assistants to read both before acting
* use the Codex audit document to detect:

  * architecture violations
  * forbidden routes
  * prompt location drift
  * sector hardcoding
  * language rule violations
  * pipeline bypasses
  * orphaned routes

---

# 30. Non-Negotiable Constraints

The following rules are non-negotiable:

* CandidateProfile is the candidate truth base
* the pipeline order is locked
* generation flows through `/api/tailoring`
* generators consume only ApplicationIntelligenceBundle
* no invention of candidate facts
* the system remains multilingual
* the system remains sector-neutral
* architecture stability is prioritized over cosmetic output polish
* experiments must remain controlled and reversible

---

# 31. Final Engineering Principle

This system must remain:

* evidence-based
* architecturally clean
* auditable
* multilingual
* sector-neutral
* supportive in tone
* conservative with truth
* strong in positioning
* stable under iteration

The goal is not to generate impressive text at any cost.

The goal is to produce credible, strategically positioned application materials grounded in real candidate evidence.

END OF TECHNICAL ARCHITECTURE
