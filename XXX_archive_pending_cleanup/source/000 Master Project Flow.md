Good question — and you are correct to stop and clarify this. Right now there are **two completely different places** where files can exist:

1️⃣ **Your local project source code**
Example on your computer:

```
my-app/
app/
components/
lib/
source/
```

Anything you save there **I cannot access**.

2️⃣ **Project Resources inside ChatGPT**
Those are files you upload into the chat/project.
Those **I can read** and use later.

So when I said:

```
source/16-mvp-user-flow.md
```

that was meant as a **local documentation suggestion**, but you’re right — I cannot read that file later.

---

# Best Solution (what you suggested)

Create **ONE big product document** and upload it once to **Project Resources**.

Then I can reference it every time we work.

Example name:

```
MVP_PRODUCT_SPEC.md
```

or

```
CV_APP_ARCHITECTURE.md
```

Upload that file here → **Project Resources**.

---

# Here is the file you should save

Copy this entire file and save it as:

```
MVP_PRODUCT_SPEC.md
```

Then upload it to **Project Resources**.

---

# MVP_PRODUCT_SPEC.md

```md
# CV Tailoring App — MVP Product Specification

## Purpose

This application helps job applicants create credible, tailored job applications without writing each one from scratch.

The system extracts structured candidate information from CVs and uses it to generate role-specific drafts.

The MVP focuses on:

- credibility
- consistency
- reducing user stress
- preventing invented experience

---

# Core Product Philosophy

The application must:

- reduce friction
- produce structured output
- avoid generic AI text
- maintain credibility with real candidate data

The system should provide value immediately while allowing deeper profile setup later.

---

# Core Modes

The system supports two modes:

## Quick Draft Mode

For users who want immediate output.

User flow:

1. paste CV
2. paste job description
3. generate tailored CV
4. generate cover letter

No canonical profile required.

---

## Canonical Profile Mode

For users who want higher consistency and data integrity.

User flow:

1. upload or paste 1–3 CVs
2. system merges and deduplicates
3. system extracts structured profile
4. system asks missing questions
5. profile saved for future tailoring

---

# Page Structure

## Public Pages

Accessible without login.

```

/

```

Homepage.

Shows:

- product explanation
- benefits
- create account
- login


```

/signup

```

User registration.


```

/login

```

User authentication.


```

/gdpr-policy

```

Privacy and data processing policy.

---

# Authenticated Pages

Accessible only after login.

```

/workspace

```

User entry point.

Two clear actions:

Start quick draft  
Build canonical profile


```

/profile

```

Canonical profile creation and editing.


```

/tailoring

```

Generate tailored CV and cover letter.


```

/dashboard

```

User workspace overview.

Shows:

- profile status
- saved CV drafts
- cover letter history

---

# Navigation Flow

## New user

```

Homepage
→ Signup
→ Workspace

```

User chooses:

- Quick Draft
- Build Profile


## Returning user

```

Homepage
→ Login
→ Workspace

```

---

# Workspace Page

This page offers two main actions.

## Quick Draft

User pastes:

- CV
- job description

System generates:

- tailored CV
- cover letter draft


## Build Profile

User uploads or pastes up to 3 CVs.

System:

- merges content
- removes duplicates
- extracts structured candidate profile
- asks missing questions

Profile saved for future use.

---

# Dashboard Behaviour

Dashboard should **never block access**.

If profile exists:

Show:

- profile ready
- edit profile
- create tailored draft
- saved CVs
- cover letters

If profile does not exist:

Show:

- profile not set up
- build profile button
- quick draft button

Dashboard should **not redirect users away**.

---

# Profile Page Behaviour

Profile page builds the canonical profile.

Requirements:

- accept 1 to 3 CVs
- 1 CV is enough
- duplicates removed
- ask missing fields

Example fields:

- name
- email
- phone
- location
- skills
- experience
- education

User may use placeholders for privacy.

Example:

```

Name Name
Telefon Telefon
Email Email

```

---

# Tailoring Page Behaviour

Tailoring accepts:

```

job description
+
candidate data

```

Candidate data comes from:

A) canonical profile  
or  
B) pasted CV text

System generates:

- tailored CV
- cover letter draft

---

# Consent Requirement

Before CV text is processed:

User must check consent box.

Text:

```

I agree that my personal data may be processed for profile creation and application tailoring.

```

This is required for GDPR compliance.

---

# Database Structure (simplified)

Tables:

```

users
profiles
cv_drafts
cover_letters
tailoring_sessions

```

Profiles table stores:

```

canonical_profile_json
user_id
created_at
updated_at

```

---

# Future Improvements

Planned features:

- profile completeness score
- integrity checks against canonical profile
- ATS optimization hints
- saved job applications
- job match scoring
- CV version comparison
- AI hallucination guard

---

# MVP Success Criteria

The MVP is successful if a user can:

1. sign up
2. paste a CV
3. paste a job description
4. receive a tailored application draft
5. save the result

within **5 minutes**.
```

---

# Why this solves your problem

You now have **one central spec file**.

Upload it once → **Project Resources**.

Then I can say things like:

> according to the spec file, dashboard should not redirect to profile

and we keep consistency.

---

# Next thing we should fix

Your **dashboard redirect logic** is currently wrong and causing:

```
dashboard → profile redirect loop
```

If you want, send me:

```
app/dashboard/page.tsx
```

and I will fix that logic cleanly.
