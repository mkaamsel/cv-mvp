# 002 User Flow

## Purpose

This document defines the intended user flow for the CV-MVP application.

The goal is to make the product:

- easy to understand
- low-friction
- interactive
- trustworthy
- immediately useful

The product should not feel like a cold input-output machine.  
It should feel like a guided application companion.

---

## Core Product Principle

The user should get value quickly.

The system should support two valid paths:

1. Quick Tailoring
2. Canonical Profile Setup

Canonical profile creation should improve the experience, but should not completely block first use of the system.

---

## Public User Flow

### Homepage `/`

Purpose:
- explain what the tool does
- reduce anxiety
- build trust
- invite sign-up or login

Public homepage should show only:
- Create account
- Log in

It should not show internal actions like:
- Dashboard
- Profile
- Workspace
- Saved CVs

---

### Sign Up `/signup`

Purpose:
- create account
- collect explicit GDPR consent
- set expectations about AI processing

Flow:
1. user enters email
2. user enters password
3. user confirms personal data may be processed
4. account is created
5. user is redirected to `/workspace`

Important:
- consent text must be clear and readable
- user should understand that placeholders may be used later if they do not want direct personal identifiers processed by AI

---

### Log In `/login`

Purpose:
- authenticate returning user
- restore access to workspace

Flow:
1. user enters email
2. user enters password
3. login succeeds
4. user is redirected to `/workspace`

The login page must never show canonical profile onboarding content.

---

## Authenticated Entry Flow

### Workspace `/workspace`

Purpose:
- be the first page after signup or login
- let the user choose how to proceed
- avoid forcing setup before first value

This page should present two primary options:

---

### Option A — Quick Tailor Now

Purpose:
- help the user generate a tailored draft immediately

User flow:
1. paste CV text or upload CV
2. paste job description
3. run role-fit analysis
4. generate tailored CV
5. generate cover letter
6. optionally save outputs

This mode should be available even if the canonical profile does not yet exist.

---

### Option B — Build Canonical Profile

Purpose:
- create a reusable structured candidate profile
- improve future tailoring quality
- reduce repeated input
- enable stronger data integrity checks

User flow:
1. paste or upload 1 to 3 CVs
2. merge and deduplicate content
3. extract draft canonical profile
4. ask missing questions interactively
5. let the user accept, reject, or edit additions
6. save canonical profile

This is the guided long-term path.

---

## Canonical Profile Flow

### Profile Page `/profile`

Purpose:
- create or edit the user’s canonical profile

Key principles:
- 1 CV is enough
- 2 or 3 CVs are optional
- duplicates should be removed where possible
- user remains in control of what is added

The page should clearly explain:
- one CV is sufficient
- additional CVs are optional
- placeholders like `Name Name`, `Telefon Telefon`, `Email Email` are acceptable
- consent is required before CV text is processed

---

### Interactive Completion Logic

The profile process should not ask everything at once.

The system should:
- extract what it can from uploaded CVs
- identify gaps
- ask only the missing or unclear questions

Examples:
- “You mentioned SAP ECC. Did you also work with S/4HANA?”
- “You described reporting tasks. Should we add IFRS reporting to your profile?”
- “You mentioned month-end work. Did you also own journal entries or reconciliations?”

For every suggested addition, user should be able to:
- Accept
- Reject
- Edit

This is a key differentiator of the product.

---

### Profile Review

After profile creation, the user should be able to review the saved canonical profile.

The system should encourage periodic review:
- before major applications
- after new experience
- when the user changes target roles

Saved profile should ideally include:
- personal basics
- languages
- education
- certifications
- systems
- frameworks
- industries
- responsibilities
- achievements
- leadership exposure
- preferred market / target role data

---

## Tailoring Flow

### Tailoring Page `/tailoring`

Purpose:
- generate application documents for a specific role

Inputs:
- job description
- candidate data

Candidate data can come from:
1. canonical profile
2. quick pasted CV text

Flow:
1. user provides job description
2. system reads canonical profile or pasted CV
3. system performs role-fit analysis
4. system displays:
   - fit score
   - strengths
   - gaps
   - warning if mismatch is serious
5. system generates:
   - tailored CV
   - tailored cover letter

Optional next actions:
- save draft
- edit draft
- compare with previous version
- export later

---

## Role-Fit Layer

Purpose:
- give the user honest guidance before generation
- avoid wasted applications
- improve trust

The system should not only generate.
It should also explain.

Role-fit output should contain:
- fit score
- strong matches
- missing areas
- warning flag
- short summary

If the match is weak, the system should say so calmly and clearly.

Example:
- “This role appears to require strong consolidation exposure, which is not clearly present in your profile.”
- “You still can apply, but this may need careful positioning.”

This transparency improves credibility.

---

## Tailored CV Flow

Purpose:
- create a role-specific CV using only true information

Rules:
- do not invent experience
- do not exaggerate leadership
- do not add software or qualifications not present in source data
- only reframe and reorganise existing truth

The tailored CV should:
- pick relevant activities
- improve wording
- reduce repetition
- create a stronger role-aligned profile summary
- remain credible

The user should be told what was improved.

Example:
- “We emphasized your IFRS exposure and month-end close responsibilities.”
- “We reduced less relevant detail to keep the CV sharper for this role.”

---

## Cover Letter Flow

Purpose:
- generate a short, credible, well-formatted cover letter

Requirements:
- based on job description and candidate data
- comply later with DIN 5008 formatting expectations
- no invented motivation
- no invented skills

Special feature:
the “motivation to apply” field should not rely on static examples.

Instead:
- system suggests a dynamic motivation statement
- suggestion is derived from profile + job description
- user can Accept / Edit / Reject

Example:
- “This role fits well with my experience in IFRS reporting, SAP-based finance processes, and structured month-end close work.”

This feature should feel assistive, not robotic.

---

## Dashboard Flow

### Dashboard `/dashboard`

Purpose:
- overview page for authenticated users
- workspace hub
- never a hard gatekeeper

Dashboard should not redirect users away only because profile is incomplete.

If canonical profile exists:
show:
- profile ready
- edit profile
- create tailored draft
- saved CVs
- cover letter history

If canonical profile does not exist:
show:
- profile not set up yet
- build profile button
- quick tailor button
- empty-state guidance

Dashboard should support progress, not punish incompleteness.

---

## Saved Outputs Flow

### Saved CVs `/dashboard/cvs`
Purpose:
- review previously generated CV drafts
- compare versions later
- reuse strong variants

### Cover Letters `/dashboard/cover-letters`
Purpose:
- review previously generated cover letters
- reuse or adapt prior text
- reduce repeated effort

Later, saved outputs may connect to:
- applications
- interviews
- follow-up reminders

---

## Future Application Management Flow

Not required for MVP, but planned.

Future pages may include:
- application tracker
- interview calendar
- rejection tracker
- follow-up drafting
- interview preparation
- gap-filling learning prompts

Long-term vision:
the system becomes a full application companion, not just a document generator.

---

## Redirect Rules

### Public routes
- `/`
- `/signup`
- `/login`
- `/gdpr-policy`

### Authenticated routes
- `/workspace`
- `/profile`
- `/tailoring`
- `/dashboard`

### Redirect logic
- after signup → `/workspace`
- after login → `/workspace`

### Dashboard
- accessible to authenticated users
- should not force redirect to `/profile`

### Tailoring
- usable with or without canonical profile
- if no profile exists, fall back to pasted CV mode

---

## Consent Logic

Consent is required before CV text is processed.

This must be:
- visible
- readable
- clearly interactive

Low-contrast consent text must be avoided, because it confuses users.

User should understand:
- why consent is needed
- that placeholders are allowed
- that real identifiers can be withheld initially

---

## UX Principles

The application should feel:

- calm
- helpful
- non-judgmental
- transparent
- interactive
- trustworthy

The system should keep the user informed:
- what was extracted
- what was changed
- why this helps
- where risks or gaps remain

This product is not meant to behave like a black-box generator.

It should feel like:
- a guide
- a mentor
- a soft but capable assistant during a stressful period

---

## MVP Success Condition

The MVP flow is successful if a user can:

1. create an account
2. choose between quick tailoring and profile building
3. paste a CV and a job description
4. receive a credible tailored CV and cover letter
5. understand what was improved
6. save the output

without confusion and without being forced into the wrong route.

---

## Design Reminder

Profile creation is valuable, but for MVP it should improve the experience rather than fully block it.

The product should always preserve:
- user control
- data integrity
- emotional clarity
- immediate usefulness