# Backlog

Items accepted for beta, logged for later improvement. Not blocking.

---

## B1 — Extraction source label is approximate for missing-source URL runs

**Logged:** 2026-04-08

Current fallback labels a URL run as `"direct-fetch"` when the extract-job API returns no `source` field (e.g. on a 500 error response). This avoids the previous mislabel of `"pasted-text"` for URL runs but is not technically exact — we don't know the actual extraction method used.

**Correct fix later:** Separate the two concerns:
- `origin`: `"url" | "text"` — how the input arrived (always knowable)
- `extractionSource`: the actual method used by the extraction layer (only knowable if the layer reports it)

Store and display both independently. Do not conflate them.

---

## B2 — verifiedClaims not used in downstream reasoning

**Logged:** 2026-04-08

`verifiedClaims` are extracted into `CandidateProfile` and stored in DB, but are not included in `experienceSignals` or `possessionSignals` in `buildCandidateProfileView()`. They therefore have no influence on evidence selection (L7), positioning brief (L8), or recommendation (L9).

**Fix later:** Include `verifiedClaims` in the signals passed to downstream layers. High-confidence claims should strengthen evidence selection and recommendation logic.

---

## B3 — leadershipSignals not semantically weighted

**Logged:** 2026-04-08

`leadershipSignals` are currently flattened into `possessionSignals` alongside tools and certifications. Leadership capacity is a qualitatively different signal category that can affect seniority matching and role fit.

**Fix later:** Treat `leadershipSignals` as a distinct signal category in `buildCandidateProfileView()` and expose it separately to the evidence and recommendation layers.

---

## B4 — Education structure flattened before rule-track processing

**Logged:** 2026-04-08

`WorkspaceCandidateEducation` objects (degree, field, institution, endDate) are converted to strings before rule-track processing. Structured reasoning on degree level, field match, or recency is therefore not possible in the rule track.

**Fix later:** Pass structured education objects to rule-track layers and let them reason on individual fields. This enables degree-level knockout detection and field-relevance scoring.

---

## B5 — Per-document contribution attribution missing

**Logged:** 2026-04-08

The profile page UI has a "What shaped this profile" section, but extraction currently runs on all documents merged into a single input. Individual document contributions cannot be attributed after the fact.

**Fix later:** Either (a) run staged extraction per document and merge results with source tracking, or (b) implement merge tracking that records which document each extracted field originated from.

---

## B6 — Document Library not persisted in database

**Logged:** 2026-04-08

The Document Library currently persists only in `WorkspaceState` / `sessionStorage`. It survives page refresh within a session but is lost when the session ends or the user switches devices.

**Fix later:** Add a `profile_documents` table (or equivalent) to Supabase. Sync the Document Library there on upload/remove. Load it on workspace init.

---

## B7 — Pre-existing TypeScript type mismatch in runTailoringPipeline

**Logged:** 2026-04-08

`runTailoringPipeline.ts` has a pre-existing type error: an argument typed `"rule"` is passed where `"ai" | "rule_fallback"` is expected (line ~2517 at time of logging). Not affecting runtime behaviour. Was present before current session.

**Fix later:** Audit all `makeObservation` call sites and correct the `track` argument to match the declared union type. Add a lint rule if needed.

---

## B8 — Duplicate profile extraction trigger not confirmed

**Logged:** 2026-04-08

Terminal logs during testing showed two sequential `POST /api/extract-candidate-profile` calls (30.0s and 29.9s). Root cause not confirmed — could be a double-submit, a React effect firing twice (StrictMode double-invoke), or a retry on perceived timeout.

**Fix later:** Add a guard in `handleBuildProfile` (or the calling effect) to prevent concurrent in-flight requests. Log the call site on each invocation to confirm single-trigger behaviour in production.
