# MVP User Flow

## Purpose
The MVP should provide immediate value without forcing users through too much setup, while still encouraging creation of a reusable canonical profile.

## Core principle
The system supports two valid entry paths:

1. Quick Draft
2. Canonical Profile Setup

Users should not be blocked from using the application tool only because profile setup is incomplete.

---

## 1. Public user flow

### Homepage
Public users should only see:
- Create account
- Log in

The homepage explains:
- what the tool does
- why it reduces stress
- why outputs are tailored and credible

No internal workspace actions should be shown to logged-out users.

---

## 2. Authenticated user entry flow

After sign-up or login, the user should land on a workspace entry page.

### Workspace entry page options

#### Option A: Quick Draft
For users who want immediate output.

Flow:
- paste CV text or upload CV
- paste job description
- generate tailored CV and cover letter
- optionally rate output
- optionally save output

#### Option B: Build Canonical Profile
For users who want better consistency and reusable data.

Flow:
- paste or upload 1 to 3 CVs
- merge and deduplicate
- extract draft canonical profile
- ask for missing information
- save candidate profile
- mark profile as ready for future tailoring

---

## 3. Dashboard meaning

The dashboard is a user workspace, not a gatekeeper.

The dashboard should always be available to authenticated users.

### If profile exists
Show:
- Profile ready
- Edit profile
- Create tailored draft
- Saved CVs
- Cover letters

### If profile does not exist
Show:
- Profile not yet set up
- Build profile button
- Quick draft button
- limited saved items or empty state

The dashboard should never force the user away from all other actions.

---

## 4. Profile page meaning

The profile page is specifically for canonical profile setup and editing.

It should:
- allow 1 to 3 CV inputs
- explain that 1 CV is enough
- request consent clearly
- allow placeholders for sensitive direct identifiers
- ask missing questions
- save profile

The profile page should not be confused with login or dashboard.

---

## 5. Tailoring page meaning

The tailoring page is the direct application-generation workspace.

It should accept one of two inputs:

### If canonical profile exists
Use:
- canonical profile
- optional source CV text
- job description

### If canonical profile does not exist
Use:
- pasted/uploaded CV text
- job description

This allows immediate usefulness while preserving the long-term profile architecture.

---

## 6. Recommended routing

### Public routes
- /
- /signup
- /login
- /gdpr-policy

### Authenticated routes
- /workspace
- /profile
- /tailoring
- /dashboard

---

## 7. Redirect rules

### After sign-up
Redirect to:
- /workspace

### After login
Redirect to:
- /workspace

### /workspace behavior
Show two actions:
- Start quick draft
- Build profile

### /dashboard behavior
Always available for authenticated users.
Never hard-redirect users to /profile only because profile is missing.

### /tailoring behavior
If user has no canonical profile:
- allow quick draft mode
- optionally encourage profile setup

---

## 8. Product rationale

This flow balances:
- low friction
- immediate value
- profile consistency
- stronger data integrity later

It prevents user frustration caused by mandatory setup before first useful output.

---

## 9. Future evolution

Later versions may add:
- profile completeness scores
- integrity guard based on canonical JSON
- output validation against source profile
- ATS-style readiness score
- job fit warning before generation