AI JOB APPLICATION ASSISTANT
CV-MVP — MASTER PROJECT REFERENCE
Version: 4.0
Status: ACTIVE AUTHORITY
Updated: April 2026

---

# 1. Project Purpose

The AI Job Application Assistant is an AI-assisted application preparation engine.

The system helps candidates:

1. Build a structured CandidateProfile
2. Analyse job descriptions
3. Identify positioning opportunities
4. Generate tailored CV and cover letter drafts

The system positions candidates honestly and strongly using real evidence.

The system must never invent experience or qualifications.

---

# 2. System Persona

The system behaves as a:

• Mentor
• Coach
• Professional companion

The system must never behave as:

• a gatekeeper
• a rejection engine
• a hype generator
• a judgemental evaluator

Tone must always be:

• supportive
• constructive
• calm
• evidence-driven

---

# 3. Core Product Flow (LOCKED)

The product flow is permanently fixed.

Profile → Job → Insights → Final → Chat Refinement

Workspace pages:

workspace/profile
workspace/job
workspace/insights
workspace/final
workspace/refinement

This flow must never be reordered or bypassed.

---

# 4. CandidateProfile — Source of Truth

All candidate claims must originate from:

• CV documents
• Arbeitszeugnisse
• certificates
• verified user inputs

The system must never invent experience.

Evidence sources are stored with each profile entry.

User corrections always override AI extraction.

---

# 5. Architecture Model

System layers:

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
Validation Layers
↓
Response

Rules:

• Each layer has exactly one responsibility
• Layers may not bypass each other
• Generators must never read raw input

---

# 6. Engine Pipeline (Authoritative)

L1 CandidateProfile
L2 StructuredJob
L3 RequiredProfile

L4 CompanyContext
L5 CompanyResearch
L6 MarketSignals

L7 SelectedEvidence
L8 PositioningBrief
L9 Recommendation
L9C RecommendationValidation

L10 BundleAssembly
L11 DocumentGeneration

L12 TruthLayer
L13 LanguagePolishLayer

Rules:

• Steps must run in order
• Steps cannot be skipped
• Each layer produces structured outputs

---

# 7. Generation Pipeline

All document generation must occur through:

POST /api/tailoring

Allowed routes:

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

Forbidden routes:

/api/generate-cv
/api/generate-cover-letter
/api/application-recommendation

---

# 8. Repository Structure (LOCKED)

app/
workspace/
profile/
job/
insights/
final/

components/
workspace/
ui/

lib/
contracts/
prompts/
engine/
orchestration/
optimisation/
design/
supabase/
profile/
workspace/
utils/

types/

supabase/
migrations/

source/

product/

archive/

---

# 9. Language System

Supported languages:

German
English
Spanish

Language behaviour:

Input detection → automatic
Interaction language → user language

Output language hierarchy:

JD language
→ CV language
→ interaction language

Users may override output language.

Override is stored in CandidateProfile.

---

# 10. Sector Neutrality Rule

The system must remain sector-agnostic.

No industry assumptions may be hardcoded.

Reasoning must originate only from:

CandidateProfile
JobDescription

---

# 11. Generator Guardrail

Generators may only consume:

ApplicationIntelligenceBundle

Generators must never:

• re-analyse job descriptions
• re-interpret CVs
• invent capabilities

---

# 12. Development Priority Order

1 System stabilization
2 Observability
3 Internal testing
4 Output improvement

Cosmetic output improvements must not precede system stability.

---

# 13. Testing Protocol

JD01 Strong match
JD02 Medium match
JD03 Specialist role
JD04 Leadership role
JD05 Mismatch role

Rules:

• Test with same dataset each run
• Change only one layer before testing
• Always re-run full dataset after changes

---

# 14. Drift Rule

This document is the final authority.

If any file conflicts with this document:

• rewrite the file
• remove the route
• follow this document

---

# Recommendation Labels

The system assigns one of the following recommendation labels.

apply_confidently

Meaning:
Candidate strongly matches the role.

Conditions:
Strong evidence exists for most core requirements.

User message:
"This role is a strong match for your profile."

---

apply_with_care

Meaning:
Candidate can reasonably apply but may face some gaps.

Conditions:
Partial coverage of core requirements.

User message:
"There are some gaps but the application is still realistic."

---

borderline

Meaning:
Application is possible but success probability is low.

Conditions:
Major requirements missing but transferable signals exist.

User message:
"This role may be difficult but an application is possible."

---

not_recommended

Meaning:
The role does not realistically match the profile.

Conditions:
Core requirements missing without supporting evidence.

User message:
"This role is unlikely to match your profile."

END OF MASTER REFERENCE
