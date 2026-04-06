SESSION ISSUES — 06 April 2026

Known issues found during testing on 06 April 2026. For product owner review.

---

## Insights Page

**Candidate profile data spilling across all tabs**
Profile summary, skills, and experience are visible on every tab including Strengthen and How I argued for you. These should only appear on the internal Overview tab below the divider. Candidate-facing tabs should not surface raw profile data.

**How I argued for you showing placeholder message**
Tab shows "I am still building my understanding of this role." — the rule fallback is firing instead of the AI track. Needs investigation into why the AI track detection condition is not evaluating to true for the reasoning tab.

**Internal tab content bleeding into candidate-facing tabs**
Content from internal observability tabs (Overview, Extraction, Reasoning, Output, Audit) is bleeding into the candidate-facing tab area visually. The internal section below the divider is not fully isolated from the candidate section above it.

---

## Profile Page

**Profile build error on enrichment — timeout on large document sets**
Error message: "Building your profile is taking longer than expected. Try again." Occurs on large document sets. Likely an API timeout on the enrichment pipeline call.

**Only CV showing as source after rebuild**
After profile rebuild, only the CV is listed as a document source. Zeugnisse and certificates are not accumulating correctly. The net-add rule is not being respected — profile is not getting richer with each new document.

**Document list always shows empty**
The candidate cannot see which documents are currently in their profile. The document list UI is not rendering the accumulated document sources.

**Profile completeness regression**
Completeness dropped from 83% to 73% after a rebuild attempt. Enrichment is degrading the profile rather than improving it on this case.

**Claims regression**
Claims count dropped from 6 to 2 after rebuild. Enrichment is not working correctly — existing structured data is not being preserved.

**User trapped in Try Again loop with no escape option**
After the timeout error, the candidate has no way to exit the Try Again state without losing their current profile. UX blocker — noted earlier.

---

## Output Quality

**BSCI/Amadeus Fire Zeugnis data not fully reflected**
VAT filing detail and SAP S/4HANA migration experience from the BSCI Zeugnis are missing from the role description in the generated CV. The extraction pipeline is not surfacing this from the document correctly.

**How I argued for you not showing meaningful reasoning**
AI track not firing for the selectedEvidence/reasoning layer. Candidate sees the placeholder message rather than the actual evidence argument. Related to the AI track detection issue noted above.

**Positioning not arguing compensation bridges**
The CGMA qualification is not being used to compensate for the missing Bilanzbuchhalter credential in positioning. HLS experience is not being surfaced as German SME evidence. The positioning prompt is not identifying and arguing compensation bridges.

---

## General / Deferred

**v1/v2 diff on Final page deferred**
Side-by-side diff of original vs strengthened documents requires a `v1FinalDrafts` field added to `WorkspaceState` and `WorkspaceProvider`. Not implemented. Current Final page shows whichever version of `finalDrafts` is currently stored — v1 or v2 transparently.

---

## CURRENT STANDING — 06 April 2026

**What is solid:**
- Pipeline running end to end — all 12 layers present
- 9 of 12 layers on AI track
- Four-tab Insights layout built and rendering
- Final page rebuilt — clean finish-line experience
- Six stability fixes complete and verified
- Job URL extraction working on Amadeus Fire, Siemens Energy, StepStone
- Spanish language support added end to end
- Prompt D in production — tournament infrastructure live
- Vision fallback in production document ingestion
- Pipeline resilience — non-critical layer failures produce mentor-toned warnings

**What needs work before internal testers:**
- Profile page stability — document accumulation and enrichment timeout
- Insights tab data spillage — candidate profile showing on wrong tabs
- How I argued for you — needs AI track firing not rule fallback
- Output quality — compensation bridging in positioning prompts
- Document list visibility on profile page

---

Restore point committed. Do not proceed with any fixes until product owner reviews this document.
