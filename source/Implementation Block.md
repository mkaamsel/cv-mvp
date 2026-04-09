Implementation Block

CV-MVP — Current State, Missing Pieces, and Recommended Implementation Order

Current state

* Core pipeline is stable and observable:
L1 Candidate Profile
L2 Structured Job
L3 Required Profile
L4 Company Context
L5 Company Research
L6 Market Signals
L7 Selected Evidence
L8 Positioning Brief
L9 Recommendation
L10 Bundle Assembly
L11 Document Generation
* Observatory is working with real runs, not mock data.
* L3, L7, and L8 are now persisted and visible for new runs.
* The system can correctly identify true mismatches, such as the REWE SAP test automation role.
* The system can reason reasonably well on near-fit finance roles, such as AXA Accountant / Finanzbuchhalter.
* The system is now beyond “black box generation” and has usable layer-by-layer observability.

What has already been fixed

1. Observatory can read live runs from tailoring\_runs.
2. required\_profile\_json, selected\_evidence\_json, and positioning\_brief\_json are now persisted.
3. degraded\_reasons\_json now reflects pipeline degradation events instead of candidate-fit risk areas.
4. L3 / L7 / L8 rendering in Observatory was fixed.
5. L3 prompt was improved so broad JD phrases are not over-concretized too aggressively.
6. L7 prompt was improved so semantically equivalent evidence in the same domain can count even when wording differs.

What is still missing or weak

A. Structured Job extraction still has a major weakness

* requirements is still often \[] even when the JD clearly contains requirements.
* This affects all downstream reasoning.
* This is currently one of the biggest remaining pipeline weaknesses.

B. Recommendation calibration is still too conservative

* In the AXA case, the reasoning body became clearly stronger.
* L8 positioningStrength became strong.
* L9 still ended with applicationRecommendation = apply\_with\_care.
* So the label calibration is lagging behind the reasoning quality.

C. No true recommendation validation / contradiction layer yet

* The system does not yet check for internal contradictions such as:
no blockers
strong matches
positive reasoning
but still cautious label
* This is the next major intelligence upgrade.

D. No truth layer yet

* The system does not yet systematically check:
unsupported claims
overstated wording
CV vs cover letter consistency
evidence-to-claim truthfulness
* This is a major trust and quality control gap.

E. No language polishing layer yet

* Final documents are credible, but still read somewhat generic / AI-neutral.
* The system lacks a dedicated final readability / tone refinement pass.
* This is a quality and presentation gap, not a core reasoning gap.

F. stage\_durations\_json is still empty

* Observability exists, but timing observability is still incomplete.

G. L5 “Company Research” is not real online company research

* It is mostly inferred environment context from job content, not real web research.
* This is acceptable for beta.
* It is not the main bottleneck right now.

H. Candidate profile quality still needs work

* But profile completeness is a separate issue.
* For reasoning diagnostics, the profile should be treated as static once built.
* Do not use profile rebuilding to hide engine weaknesses.

Priority order for implementation

Priority 1 — Recommendation validation layer
Why first

* Highest intelligence gain with low risk.
* Fixes internal contradictions.
* Improves trust in recommendation labels.
* Does not require destabilizing earlier layers.

What it should do

* Read L8 positioning + L9 recommendation + evidence summary.
* Detect contradictions such as:
no blockers + strongMatches high + positive reasoning + cautious label
* Either:
adjust recommendation
or force reasoning to justify the caution

Target position in pipeline

* After L9 Recommendation
* Before Bundle / Document generation

Expected value

* Biggest jump in recommendation intelligence.

Priority 2 — Truth layer
Why second

* Biggest trust and credibility gain.
* Prevents inflated or unsupported wording.
* Makes CV and cover letter safer and more believable.

What it should do

* Compare final draft claims against evidence bundle.
* Flag or soften unsupported statements.
* Check consistency between:
evidence
positioning
recommendation
final CV
final cover letter

Target position in pipeline

* After recommendation validation
* Before final document output is accepted

Expected value

* Major trust upgrade.
* Strong beta quality improvement.

Priority 3 — Language polish layer
Why third

* Improves readability and recruiter impression.
* Lower risk because it should not change meaning.
* Should only refine style, clarity, rhythm, and professionalism.

What it should do

* Shorten dense sentences
* improve flow
* reduce generic AI phrasing
* improve recruiter readability
* preserve meaning strictly

Target position in pipeline

* Final step after truth check and document generation

Expected value

* Strong improvement in perceived quality.
* Especially important for cover letters.

Priority 4 — Fix L2 requirements extraction
Why this is still critical

* requirements: \[] is still one of the biggest structural weaknesses.
* Downstream layers can compensate, but they should not have to.
* The engine becomes more reliable once the JD is structured properly.

What likely needs work

* Better section-heading recognition for:
Fachliche Voraussetzungen
Was uns überzeugt
Ihr Profil
Anforderungen
similar variants
* Better cleaning of noisy ATS / cookie-heavy pages

Expected value

* Significant quality improvement across many roles.

Priority 5 — Recommendation calibration refinement
Why after validation

* We first need the validation layer to catch contradictions.
* Then we can adjust how the final recommendation label is chosen.

What needs investigation

* Why apply\_with\_care is still chosen in near-fit roles with:
no blockers
strong relevant evidence
positive reasoning
* Whether riskAreas are overweighted relative to strongMatches

Expected value

* Better distinction between:
true long shots
credible near-fit roles
strong-fit roles

Priority 6 — stage\_durations\_json
Why later

* Useful for observability
* Not critical for user-facing quality
* Should not be prioritized above reasoning and trust layers

Priority 7 — Real company research
Why later

* Helpful but not central to fit intelligence
* Current L5 inferred context is acceptable for beta
* Real web/company research can come after core fit reasoning is strong

What should not be done yet

* Do not do broad refactors of pipeline structure.
* Do not rebuild candidate profile logic while diagnosing reasoning issues.
* Do not add many new experimental layers at once.
* Do not chase company research before recommendation validation and truth checking are in place.
* Do not treat missing company name/location in pasted text as a core failure if the source genuinely lacks it.

Recommended implementation order with Code

1. Recommendation validation layer
2. Truth layer
3. Language polish layer
4. L2 requirements extraction improvement
5. Recommendation label calibration refinement
6. stage\_durations\_json
7. real company research only later

Current beta readiness assessment

* Private beta: yes, almost ready
* Wider public beta: not yet
* Main reason:
reasoning is promising
observability is strong
but trust and calibration layers are still missing

Short summary

* The system now has a real brain.
* The next step is not more generation.
* The next step is quality control around that brain:
validation
truth
polish
* Once those are added, the product can move from “good beta prototype” to “credible professional tool.”

