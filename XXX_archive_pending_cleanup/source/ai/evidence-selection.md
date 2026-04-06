# Evidence Selection Engine

## Purpose

This file defines the evidence selection layer for the CV Tailoring Application.

The evidence selector sits between:

1. candidate profile extraction
2. job profile extraction
3. document generation

The selector must produce a structured **evidence package** that is then used by:

- CV generation
- cover letter generation
- role-fit explanation

The evidence selector exists to reduce hallucination, improve relevance, and enforce credibility.

---

## Core Principle

The system must not jump directly from:

- raw CV text
- raw job description

to:

- CV draft
- cover letter draft

Instead, the system must first decide:

- which job themes matter most
- which candidate evidence is truly verified
- which claims are safe
- which claims must be avoided

---

## Required Behavior

The evidence selection engine must:

- use only candidate profile and job profile input
- avoid inventing experience or scope
- prefer conservative wording over aggressive positioning
- distinguish between direct and partial matches
- explicitly exclude risky or weak evidence
- provide safe wording guidance for downstream generation

---

## Output Object

The selector must produce an `EvidencePackage` with the following sections:

- `job_target`
- `candidate_positioning`
- `selected_evidence`
- `excluded_evidence`
- `document_guidance`

---

## Match Types

Each relevant requirement or theme should be classified as one of:

- `direct_match`
- `adjacent_match`
- `partial_match`
- `not_verified`

### Meaning

#### direct_match
The candidate profile clearly supports the theme.

#### adjacent_match
The candidate has closely related evidence, but not exact wording or scope.

#### partial_match
The candidate has some exposure, but the claim must be phrased carefully.

#### not_verified
The profile does not safely support the claim.

---

## Safe Claim Rules

For each selected theme, the selector must provide:

- why the theme matters
- supporting candidate evidence
- a safe claim
- unsafe claims to avoid

### Example

Theme:
`IFRS exposure`

Safe claim:
`Has hands-on exposure to IFRS-related projects and accounting topics.`

Unsafe claims:
- `IFRS technical expert`
- `owns IFRS policy setting`
- `led IFRS group reporting`

---

## Leadership Rule

If people leadership is not clearly verified in candidate metadata, the selector must NOT support claims such as:

- led teams
- headed finance
- managed direct reports
- strategic people leadership

Safe alternatives include:

- coordinated with stakeholders
- worked cross-functionally
- supported finance processes
- contributed within senior accounting roles

---

## Chronology Rule

If current role status or chronology is unclear, the selector must flag chronology-sensitive wording as unsafe.

Avoid phrases such as:

- in my current role
- most recently
- in my last role
- currently responsible for

Use neutral alternatives such as:

- during my time at
- across previous roles
- in prior accounting roles
- across my experience

---

## Achievement Rule

The selector must not support quantified impact claims unless they are verified in source data.

Do not generate:

- reduced close timeline by 30%
- saved €2m
- improved audit outcomes by x%

unless explicitly supported by candidate data.

---

## Standards Rule

If exposure to HGB, IFRS, US GAAP, or other standards is partial or project-based, claims must remain conservative.

Prefer:

- exposure to
- experience with
- worked on
- supported topics related to

Avoid:

- expert in
- deep technical ownership
- full end-to-end ownership

unless verified.

---

## Why This Layer Matters

Without evidence selection, the writing model sees too much information and guesses what is relevant.

With evidence selection, the system controls:

- relevance
- credibility
- consistency
- debuggability

This makes the product behave like a guide and mentor rather than a generic text generator.