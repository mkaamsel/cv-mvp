# Known Issues Backlog
AI Job Application Assistant — CV-MVP
Updated: 2026-04-06

---

## RESOLVED THIS SESSION (2026-04-06)

| # | Fix | Status | Notes |
|---|-----|--------|-------|
| 1 | Vision fallback for scanned PDFs | ✅ Resolved 2026-04-06 | `app/api/profile/upload-document/route.ts` — pdf-parse < 500 chars → auto re-process via gpt-4o vision. Matches tournament runner behaviour. |
| 2 | Multi-document accumulation on profile page | ✅ Resolved 2026-04-06 | `app/workspace/profile/page.tsx` — replaced single-text overwrite with `AccumulatedDoc[]`. Build sends full combined record in one AI pass. |
| 3 | Hardcoded heading patterns in job section extraction | ✅ Resolved 2026-04-06 | `app/api/extract-job/route.ts` — removed all hardcoded heading names and German signal words from `SYSTEM_PROMPT`. AI identifies sections by meaning in any language. |
| 4 | Duplicate HTML cleaning logic in fetch-job and extract-job | ✅ Resolved 2026-04-06 | `lib/utils/cleanJobHtml.ts` created. Both routes import from shared utility. No behaviour change. |
| 5 | Empty bins fallback showing raw scraped text | ✅ Resolved 2026-04-06 | `app/workspace/job/page.tsx` — when AI returns no sections, show clean message and empty textarea. Raw scraped text no longer pre-fills the textarea. |
| 6 | Spanish dropped by `normalizeLanguage()` | ✅ Resolved 2026-04-06 | `runTailoringPipeline.ts` — `normalizeLanguage()` now passes "es" through. All 10 prompt files updated: `locale: "en" \| "de"` → `locale: string`, binary DE/EN conditionals → 3-way with Spanish. |

---

## OPEN — ACTIVE

### V1 — Domain-specific keywords in `deriveRequiredProfile`
**File:** `lib/orchestration/tailoring/runTailoringPipeline.ts`
**Function:** `deriveRequiredProfile()`
**Issue:** Hardcoded finance/accounting vocabulary used to classify job requirements.
**Blocked until:** AI track for requiredProfile (Layer 3B) is proven stable.

### V2 — Domain-specific title signals in `normalizeStructuredJob`
**File:** `lib/orchestration/tailoring/runTailoringPipeline.ts`
**Function:** `normalizeStructuredJob()`
**Issue:** Hardcoded finance/accounting job title signals used to infer job title when extraction fails.
**Blocked until:** AI track for normalizeStructuredJob is proven stable.

### V3 — Hardcoded German fallback strings
**File:** `lib/orchestration/tailoring/runTailoringPipeline.ts`
**Functions:** `normalizeStructuredJob()`, `deriveCompanyContext()`
**Issue:** Hardcoded German-language fallback labels ("Unbekannt", "Unbekannte Rolle", "Nicht angegeben") used when structured job fields are missing.
**Blocked until:** V1 and V2 are resolved.

### V4 — Broken import in Intelligence applicationRecommendationPrompt
**File:** `lib/prompts/Intelligence/applicationRecommendationPrompt.ts`
**Issue:** Imports `APPLICATION_RECOMMENDATION_PROMPT` from `@/lib/tailoring/application-recommendation` which does not exist (`lib/tailoring/` is empty). **Does not affect the production pipeline** — the pipeline imports from `/lib/prompts/applicationRecommendationPrompt` (root level), not this file. Pre-existing issue.
**Action:** Clean up when system is stable. Delete or rewire this file.

### V5 — Layers 4/5/6 run sequentially, not in parallel
**File:** `lib/orchestration/tailoring/runTailoringPipeline.ts`
**Issue:** Architecture specifies `companyContext`, `companyResearch`, and `marketSignals` run in parallel. Implementation runs them sequentially.
**Action:** Introduce `Promise.all()` for these three layers when pipeline is stable.

### V6 — `normalizeLanguage()` in pipeline loses "es" in fallback text
**File:** `lib/orchestration/tailoring/runTailoringPipeline.ts`
**Functions:** `buildPositioningBriefText()`, `buildCompanyContextText()`, `buildCoverLetterDraft()`, `deriveCompanyContext()`
**Issue:** The rule-based text fallback functions inside these still use binary `language === "de"` conditionals, falling through to English for "es". Function signatures now accept "es" (Fix 6) but the DE/EN conditional strings inside still don't branch for Spanish.
**Impact:** Low — these are internal AI-context strings, not user-facing. AI handles output language quality independently. Acceptable until V1/V2/V3 are resolved.

### V7 — Orphaned routes with broken imports (build errors, pre-existing)
Three routes outside the architecture's allowed list have broken imports that fail `next build`:
- `app/api/profile/profile-onboarding/route.ts` — imports `lib/profile/onboarding` (does not exist)
- `app/api/profile/profile-onboarding/complete/route.ts` — imports `createClient` from `lib/supabase/server` (not exported)
- `app/api/profile/upload-cv/route.ts` — imports `@/lib/intelligence/core/routeGuards` (does not exist)

**None affect the production pipeline.** `next dev` starts and all production routes function. These routes are candidates for deletion.
**Action:** Delete all three when confirmed safe. None are in the allowed routes list.

---

## OPEN — ARCHITECTURE GAPS (not bugs)

- Chat Refinement workspace stage (`workspace/refinement`) — not yet implemented
- `/api/fetch-job` is orphaned — job page calls `/api/extract-job` directly for URL fetch
- Pipeline observability — observation points collected but surfacing to Observatory incomplete
- Work authorization detection — schema defined, not yet wired from JD extraction

---

## PROFILE PAGE UX — BACKLOG

| Item | Description | Priority |
|------|-------------|----------|
| Document library icons | Documents currently show full filenames taking up space. Design envisaged library-style icons — icon colour indicates document type, filename shown on mouse hover only. | Post-MVP |
| Single upload block | Currently two separate blocks — Primary CV and Supporting Docs. Replace with single upload block. Dropdown to select document type. "Other" option must be present with free text field to describe the document. | Post-MVP |
| Rename button | "Rebuild Profile" should be renamed "Enrich Profile" — better reflects what the system does when a profile already exists. | Quick win |
| Large file upload loop | When a large file breaks mid-upload, user sees only "Try Again" with no way to exit. User is effectively trapped. Fix: add a "Skip this document" or "Cancel" option alongside Try Again. Also verify whether partial data was added to the profile when the break occurred. | Stability |
| Right panel empty | Left panel shows profile. Right panel is completely empty. Should show collapsible boxes — one per uploaded document — showing what that document contributed to the profile: new facts added, existing facts strengthened, conflicts found, no meaningful enrichment. | Post-MVP — depends on delta block feature |

---

## JOB PAGE UX — BACKLOG

| Item | Description | Priority |
|------|-------------|----------|
| Stale job text never clears | `jobText` and `jobSections` not cleared when new URL entered. Previous job content remains visible. | Quick fix |
| Jina fallback raw metadata visible | Raw markdown metadata leaks into textarea when Jina fallback used. | Quick fix |
| LinkedIn blocked | Fetch returns no content — login required. Detect `linkedin.com` and show paste prompt immediately without attempting fetch. | Post-MVP |
| Deutsche Bank careers.db.com blocked | Hash-based SPA — content not accessible. User must paste manually. | Post-MVP |
| Ihr Profil block not always rendering | Non-standard heading causes Aufgaben to show but Ihr Profil block missing on screen. Data stored correctly internally. | Quick fix |
| Enter key not triggering fetch | After pasting a URL, pressing Enter does nothing. User must click Fetch button manually. | Quick fix |

---

---

## ENGINEERING BACKLOG — OBSERVABILITY & QUALITY

### B1 — Extraction Source Label Consistency
**Priority:** Low–Medium
**Observation:** URL-based extraction runs sometimes report `extractionSource: "pasted-text"` in Layer1 telemetry despite `inputType: "url"`. Misleading for debugging.
**Action:** Audit the extraction pipeline to ensure `inputType` correctly reflects user input (url vs pasted text) and `extractionSource` correctly reflects the actual extraction path taken (direct fetch / readable fallback / pasted text). Separate these two concepts clearly in telemetry.

### B2 — Layer9C Status Classification Mismatch
**Priority:** Medium
**Observation:** `stage_statuses_json` sometimes shows `Layer9C: "error"` while the pipeline trace reports `"Layer9C: recommendation-validation:no-change"`.
**Action:** Review Layer9C validation logic. "no-change" outcomes must be classified as `"success"` or `"skipped"`. `"error"` must be reserved for real failures only. Correct the status assignment at the point where the validation result is recorded.

### B3 — Protection Against Junk Job Descriptions
**Priority:** Medium
**Observation:** If users paste irrelevant or noisy text (email threads, tracking scripts, formatting noise), the AI extraction step may still attempt structured extraction without validating text quality first.
**Action:** Design a pre-extraction safeguard layer. Approaches to investigate:
1. **Signal Density Check** — minimum density of task/requirement indicators
2. **Structural Detection** — verify presence of recognisable job structure signals (tasks, profile, requirements sections)
3. **Semantic Validation** — ask the model to confirm whether the text resembles a job posting before extraction
4. **Warning Layer** — if quality threshold not met, return a warning and prompt the user to paste a cleaner version

**Constraint:** Must remain multilingual. No hardcoded language keywords anywhere in the implementation.

### B7 — Mismatch Handling and Recommendation-Gated Document Generation
**Priority:** Medium
**Trigger:** Users may submit clearly mismatched JDs — career changers testing viability, stress testers, or mistaken submissions.

**Tone rule — non-negotiable:**
The system never rejects. It never says "no." It guides honestly, like a trusted mentor who tells the truth and then asks: "Do you still want to go for it? I'll support you either way." Every message — including for complete mismatches — must feel like advice from someone on the candidate's side, not a gatekeeper closing a door.

**Proposed behaviour by recommendation label:**

| Label | Auto-generate documents | UI behaviour |
|---|---|---|
| `apply_confidently` | Yes | Proceed directly to documents |
| `apply_with_care` | Yes | Show assessment + documents |
| `borderline` | Yes, with notice | Show assessment prominently, documents available below |
| `not_recommended` | No — gate it | Show assessment with named gaps, offer "Generate anyway" as an explicit secondary action |

**What is currently missing:**
1. No early signal to the user before full pipeline runs for clear mismatches
2. No UI gate on document generation for `not_recommended` outcomes — documents currently render unconditionally
3. Advisor message quality degrades for extreme mismatches — needs an explicit instruction to name the specific gaps plainly rather than using softened but hollow language

**Implementation scope when revisited:**
- Pipeline unchanged — it already produces the correct signals
- UI reads `applicationRecommendation` from the result and gates document generation for `not_recommended`
- Advisor message prompt gets one additional instruction for `not_recommended`: name what is actually missing, what would need to change, and close with a genuine offer to help if the candidate wants to proceed anyway
- No threshold language, no rejection language, no authority language anywhere in the output

### B6 — Requirement Match Taxonomy + Positioning Bridge Model (V8)
**Priority:** Medium — deferred
**Concept:** Make requirement reasoning explicit across L7 (SelectedEvidence), L8 (PositioningBrief), and Layer9C (validation) by adding structured match classification signals.
**Proposed match types:** `direct_match`, `adjacent_match`, `compensation_bridge`, `missing_but_noncritical`, `hard_blocker`
**Assessment:** The five match types are the right framing, but the full 7-field proposal across 4 layers carries high implementation risk. The existing L7 buckets (strongEvidence / supportEvidence / transferableEvidence / weakEvidence) already encode this taxonomy implicitly. The real gap is narrower.
**Agreed smaller implementation when revisited:**
1. Add `bridgeReason: string` to each `transferableEvidence` item in L7 — one sentence explaining why the bridge is credible. Improves L8 and L9C reasoning directly.
2. Add `blockerSeverity: "hard" | "soft"` to each item in `recommendation.blockers` — lets Layer9C distinguish real knockout blockers from soft concerns. Fixes recommendation over-caution more precisely than the current `blockers.length === 0` check.
**Deferred fields:** `positioningModifiers`, `riskModifiers`, `matchType`, `positioningUsable`, `evidenceRole` — revisit after the two above are stable.
**Constraints when implementing:** No new top-level pipeline layer. No architecture reorder. No sector hardcoding. CompanyContext and MarketSignals remain modifiers only.

### B5 — CV Output Contains Internal Evaluation Language
**Priority:** Medium
**Impact:** Output credibility and beta readiness
**Observation:** Some generated CV outputs include evaluation-style paragraphs that read like internal analysis rather than CV content. Example pattern: *"Manoj Agarwal has a solid background… While direct experience in X is not shown…"* This language appears to originate from reasoning or positioning layers.
**Problem:** A CV must contain only factual candidate information and role-relevant positioning. Internal evaluation commentary reduces credibility and makes the output appear AI-generated.
**Action:** Review the CV generation pipeline, particularly in `lib/engine/generators/cv/`. Ensure that:
1. Internal evaluation text from positioning/review layers is never inserted into the final CV
2. The CV generator outputs only: factual candidate information, structured experience, role-relevant positioning
3. Any analytical or evaluative commentary remains strictly inside the internal pipeline and is never exposed in user-facing documents

### B4 — Output Language Control in Final Output UI
**Priority:** Medium
**Observation:** The system detects input language but there is no user-facing language switch on the Final Output page.
**Action:** Design a UI control allowing the user to override output language:
- Default to detected language
- Allow manual override (e.g. English, German, Spanish)
- Propagate selection to CV and cover letter generation prompts
- Must remain multilingual by design — no hardcoded language list

*This file is the live backlog. Update after each session.*
