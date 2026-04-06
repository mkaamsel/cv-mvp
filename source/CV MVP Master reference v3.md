
AI JOB APPLICATION ASSISTANT
CV-MVP — MASTER PROJECT REFERENCE
Consolidated Single-Source Document  |  April 2026
Version: 3.0 — Conflicts resolved, testing layer added, language system added
⚠ DRIFT RULE: This document is the final authority. If any file, route, prompt, or session instruction conflicts with this document — follow this document. Rewrite the file. Remove the route.
1. PROJECT PURPOSE & PRODUCT PHILOSOPHY
An AI-powered Job Application Assistant that builds a structured Candidate Profile, analyses Job Descriptions, performs evidence-based positioning, and generates credible, tailored CV and Cover Letter drafts.
Core Promise
The system must NEVER invent candidate experience. It positions candidates as strongly as possible using verified evidence only.
System Persona
•	Mentor
•	Coach
•	Supportive professional companion
The system must NOT behave as a gatekeeper, hype engine, or rejection bot.
Tone
•	Honest
•	Constructive
•	Realistic
•	Positioning-oriented
•	Supportive and confidence-building — never judgemental
2. FIXED PRODUCT FLOW
The product flow is permanently locked and must never be reordered, shortened, merged, or bypassed:
Profile  →  Job  →  Insights  →  Final  →  Chat Refinement
Workspace Pages (locked routes)
•	workspace/profile — User builds structured candidate profile
•	workspace/job — User provides job description or URL
•	workspace/insights — System shows fit analysis, positioning, risks, evidence
•	workspace/final — System generates tailored CV + cover letter
3. SYSTEM ARCHITECTURE
Layer Model (top to bottom)
•	UI Layer → app/**/page.tsx, components/**, lib/design/**
•	Route Adapter Layer → app/api/**
•	Intelligence Engine Layer → lib/engine/**, lib/prompts/**, lib/orchestration/**
•	Contract / Schema Layer → lib/contracts/**
Data Flow Rule
UI → Route Adapter → Engine Modules → Bundle Assembly → Generators → Route Adapter → UI
UI must never bypass routes. Generators must never read raw user input. All reasoning must pass through the intelligence bundle.
Engine Pipeline (sequential — never skip, never reorder)
•	candidateProfile
•	structuredJob
•	requiredProfile
•	companyContext  ┐
•	companyResearch ├─ Parallel
•	marketSignals   ┘
•	selectedEvidence
•	positioningBrief
•	recommendation
•	bundleAssembly
•	generators (CV draft + cover letter)
4. NON-NEGOTIABLE RULES
Rule 1 — CandidateProfile is the only source of truth
All claims must originate from CandidateProfile. Sources include: primary CV, additional CVs, Arbeitszeugnisse, certificates, user clarifications. The system must NEVER invent experience.
Rule 2 — AI modules do reasoning only
AI modules may: analyse, infer positioning, select evidence. They must NOT control workflow. Workflow is controlled only by the orchestration layer.
Rule 3 — One generation pipeline only
All application generation must happen exclusively through: POST /api/tailoring
Forever forbidden routes:
•	/api/generate-cv  |  /api/generate-cover-letter  |  /api/application-recommendation
If these routes are found in code they must be deleted immediately.
Rule 4 — No numeric match scores
Forbidden: numeric fit scores. Allowed: Red → Yellow → Green bars or star indicators.
Rule 5 — Prompts live in one place only
All prompt logic must live in /lib/prompts. Prompts must not appear in UI components, routes, or utility functions.
Rule 6 — Generator guardrail
Document generators may only consume ApplicationIntelligenceBundle. Generators must never re-analyse job descriptions, re-interpret CVs, invent capabilities, or perform new reasoning.
Rule 7 — User corrections are highest authority
User corrections via chat interface override all AI-extracted values. AI re-extraction must never overwrite a user correction. Correction log is permanent.
Rule 8 — Net add only on document ingestion
When a new document is added to an existing profile, append to the existing raw record and re-run extraction on the full combined record. Profile must only get richer. Never lose previously extracted information.
5. API ROUTE LOCK
Allowed routes (only these)
•	/api/tailoring
•	/api/extract-candidate-profile
•	/api/extract-job
•	/api/fetch-job
•	/api/download
•	/api/feedback
•	/api/tailoring-runs
•	/api/profile/load
•	/api/profile/save
•	/api/profile/profile-chat
•	/api/optimisation/run-tournament
Forbidden routes (must never exist)
•	/api/generate-cv
•	/api/generate-cover-letter
•	/api/application-recommendation
•	app/tailoring  (archived UI route — must not be reintroduced)
6. CANONICAL REPOSITORY STRUCTURE
The repository structure is locked. Do not create folders or files outside this structure without product-owner approval.
Production Structure
•	app/ → workspace/ (profile, job, insights, final, debug, observatory), api/ (all allowed routes)
•	components/ → workspace/, ui/
•	lib/ → contracts/, prompts/, engine/, orchestration/, design/, supabase/, profile/, workspace/, utils/, optimisation/
•	source/ → TECHNICAL_ARCHITECTURE.md, BUILD_PROFILE_BUG_REPORT.md, PROFILE_ENRICHMENT_ARCHITECTURE_V2.md
•	test-data/ → profile-inputs/ (gitignored), prompt-tournament/ (gitignored)
•	types/ → applicationIntelligenceBundle.ts, evidence.ts, intelligenceModule.ts, positioningBrief.ts, selectedEvidence.ts
•	supabase/ → migrations/
Archive
•	XXX_archive_pending_cleanup/ — contains legacy routes and files pending deletion. Do not reference or reintroduce anything from this folder.
7. PROFILE BUILDING — V2 ARCHITECTURE
This section supersedes all earlier profile building descriptions.
Extraction Method — Single-Pass on Full Record
•	Phase 1 — Dumb append: every uploaded document is parsed and its raw content appended to a master source record. No AI at this stage.
•	Phase 2 — AI extraction runs on full record in one pass: CV + all Zeugnisse + all certificates. Produces richest possible structured profile.
•	Phase 3 — Tenure and depth weighting: per role — duration, seniority, recency, Zeugnis coverage.
•	Phase 4 — Market signal layer: fed as input alongside profile for positioned output.
Document Ingestion Rules
•	PDF extraction below 500 chars → automatic vision fallback (same as JPG treatment). Log with [vision-fallback] prefix.
•	New document added → append to existing raw record → re-run Prompt D on full combined record.
•	User corrections are immutable annotations — never overwritten by re-extraction.
Extraction Prompt
•	Winner: Prompt D — identified through 4-generation tournament across A, B, C, D, E, F, G variants.
•	Location: /lib/prompts/Intelligence/extractCandidateProfilePrompt.ts
•	Deduplication: same skill/tool/qualification from multiple sources = one canonical entry. Confidence = highest source. All sources logged.
Chat-Based Profile Correction
User interacts in natural language to correct profile: 'Remove the SAP entry', 'I left voluntarily', 'Add Prince2 2019'.
Every profile entry carries permanent source record: source_type, source_detail, timestamp, language.
•	source_type: document / user_prompt / ai_extracted
•	User corrections: highest authority — AI re-extraction never overwrites
•	Correction log: permanent and visible to user on request
What Zeugnisse Contribute
•	Third-party endorsement of character and performance
•	Departure reason and context — company-initiated vs mutual vs performance
•	Responsibilities confirmed by employer not self-reported in CV
•	Seniority of signatory as a quality signal
8. JOB DESCRIPTION EXTRACTION
Input Methods
•	URL: fetch via /api/fetch-job → strip all HTML noise → extract clean text only → run extraction
•	Pasted text: run extraction directly
User never sees raw scraped text. The cleaning must strip navigation, mobile app banners, share buttons, cookie prompts, footers, headers.
Structured Extraction — Three Bins (all internal)
•	aufgaben — responsibilities and day-to-day tasks
•	anforderungsprofil — requirements classified as muss / soll / kann
  muss: hard blockers, missing = rejection
  soll: strong preference, missing = manageable
  kann: nice to have, missing = no impact
•	companyContext — tone, language, culture signals. Internal only.
•	hiddenBlockers — implicit requirements not stated but inferable. Internal only.
•	atsKeywords — keyword frequency list for ATS optimisation. Internal only.
•	salary, location, hoursPerWeek, workModel, employmentType — metadata. Internal only.
What the User Sees on the Job Page
Exactly two sections. Verbatim from the job posting. No reordering. No categorisation. No labels. No metadata.
•	Ihre Aufgaben — bulleted list, verbatim
•	Ihr Profil — bulleted list, verbatim
Work Authorization
Not in MVP scope. Future consideration only.
9. LANGUAGE SYSTEM
Supported Languages
•	German (DE)
•	English (EN)
•	Spanish (ES)
Architecture must allow additional languages to be added without redesign.
Language Behaviour
•	Input detection: auto-detect language of every uploaded document and every user message. No user action required.
•	Interaction language: respond in whatever language the user writes in. Follow immediately if user switches.
•	Output language hierarchy: JD language → CV language → interaction language.
•	User override: stored in profile, respected permanently for all subsequent generations.
•	DIN 5008 applies only when output language is DE. Equivalent professional standards for EN and ES.
Schema Fields (CandidateProfile)
•	detectedInputLanguages: string[]
•	interactionLanguage: string
•	preferredOutputLanguage: string
•	outputLanguageLockedByUser: boolean
Prompt Layer Rule
All prompts in /lib/prompts/ must accept outputLanguage parameter. Zero hardcoded language assumptions anywhere in the prompt layer.
10. OPTIMISATION & TESTING LAYER
This is a permanent lateral layer alongside the main pipeline. It does not touch the production pipeline.
Structure
•	/test-data/profile-inputs/ — candidate documents (gitignored)
•	/test-data/prompt-tournament/ — prompt variants and scored outputs (gitignored)
•	/lib/optimisation/tournament/ — prompt variants
•	/lib/optimisation/judge/ — AI evaluator
•	/lib/optimisation/results/ — scored outputs and leaderboard
•	/lib/optimisation/evolution/ — retirement and replacement logic
Tournament Flow
•	All documents in profile-inputs concatenated into raw record — dumb append, no filtering
•	All active prompt variants run against same raw record in parallel
•	Judge AI evaluates on: richness, accuracy, Zeugnis weight
•	Lowest scoring prompt retired. Replacement generated from winner logic with variation.
•	Continues until scores plateau — law of diminishing returns signals completion.
•	Winning prompt promoted to production in /lib/prompts/ by explicit human decision only.
Supabase Table
prompt_tournament_results: run_id, prompt_variant, richness_score, accuracy_score, zeugnis_score, total_score, judge_reasoning, profile_output (jsonb), winner_of_run, created_at
Tournament History (as of April 2026)
Generation 1 WinnerPrompt D (score 28)Generation 2 WinnerPrompt A (score 26) — B retiredGeneration 3 WinnerPrompt D (score 27) — F retiredProduction PromptPrompt D — wired to /lib/prompts/Intelligence/extractCandidateProfilePrompt.tsActive VariantsA, D, E, GTrigger
POST /api/optimisation/run-tournament — on demand only. No automatic triggers. No interference with production pipeline.
11. CONFLICTS RESOLVED — CHANGE LOG
The following conflicts existed between older documents. All resolved in this version.

AreaOld / ConflictingCurrent AuthorityRepository structurelib/contracts/ listed as schema layer locationlib/contracts/ confirmed — types/ folder also exists for TS type definitionsForbidden routesOnly 3 forbidden routes listedArchive folder XXX_archive_pending_cleanup contains legacy routes — must never be reintroducedProfile extractionPer-document enrichment loop (AI summarises each doc)V2: single-pass on full concatenated record — no compression, only enrichmentTesting environmentNot mentioned in original architecturePermanent optimisation layer added: /test-data/, /lib/optimisation/, /api/optimisation/run-tournamentProfile correctionNot in original specChat-based correction interface added. Source record per entry. User corrections are immutable.Language systemDE + EN onlyDE + EN + ES. Auto-detect. User override. outputLanguage parameter in all prompts.Job page displayRaw scraped text shown in textareaJob posting content shown as-is in two blocks: Aufgaben + Ihr Profil. All metadata internal.source/ folderNot referenced in original architecturesource/ folder confirmed in project root. Stores TECHNICAL_ARCHITECTURE.md and supporting docs.12. CURRENT SYSTEM STATUS (April 2026)
Architecture stabilityHIGH — fully documented and lockedPipeline flowSTABLE — end-to-end flow worksProfile building V2IMPLEMENTED — Prompt D in productionJob extraction✅ AI-driven, language neutral — structured bins, clean displayLanguage system✅ End to end — DE/EN/ES, auto-detect, normalizeLanguage fixed, all prompts updatedChat correctionIMPLEMENTED — source record per entryOptimisation layerLIVE — tournament running, Prompt D winnerCV renderingFIX IMPLEMENTED — awaiting verificationInsights page qualityINTERIM — data populating, not yet meaningfulPipeline observabilityNEXT PRIORITYOutput qualityINTERIM — functional but needs improvementWork authorizationSCHEMA DEFINED — detection not yet wiredVision fallback✅ Live in production — scanned PDFs auto re-process via gpt-4o visionMulti-document accumulation✅ Implemented — profile page accumulates all uploads, single AI pass at buildHTML cleaning✅ Consolidated — shared utility in lib/utils/cleanJobHtml.tsKnown issues backlog✅ Active — source/KNOWN_ISSUES_BACKLOG.mdNext Session Priorities (in order)
•	1. Run smoke test — five standard JDs against the updated pipeline
•	2. Pipeline observability — surface observation points to Observatory
•	3. Insights page — make it meaningful and actionable for the user
•	4. Wire work authorization detection from JD extraction
•	5. Resolve V1/V2/V3 violations (domain-specific keywords) — blocked on AI track stability
13. DEVELOPMENT RULES & EXECUTION DISCIPLINE
Execution Philosophy — Just Do It
Never ask for approval for something that can be implemented immediately and safely. If an improvement is small, obvious, and consistent with this document, implement it directly.
Suggestions only for: architectural changes, product behaviour changes, UX decisions, business strategy decisions.
Implementation Protocol
•	Work one file at a time
•	Provide full-file replacements only — no partial patch fragments
•	No speculative refactors or optional drift
•	Keep the current working MVP runnable at all times
•	If a change risks breaking the flow, preserve compatibility first, clean later
Development Priority Order (locked)
•	Phase 1 — System stabilization
•	Phase 2 — Observability & telemetry
•	Phase 3 — Internal testing readiness
•	Phase 4 — Output improvement
⚠ Do not optimize wording quality or AI outputs before the system is stable end-to-end.
Schema Change Rules
•	Schemas must be versioned if changed
•	New fields must be optional initially
•	Removing fields requires architecture review
•	Silent schema changes are forbidden
14. DOCUMENT GENERATION RULES
Generated documents must be: credible, modern, conservative but optimistic, evidence-based.
•	German output must respect DIN 5008
•	Cover letter language: conservative modern German or EN/ES. No hollow opening phrases.
•	Avoid clichés: 'Mit großem Interesse…'
•	Positioning must come from the intelligence bundle, not from prompt improvisation
•	No numeric match scores. Use Red → Yellow → Green bars or star indicators only
15. SESSION START PROTOCOL
Every development session MUST start with:
•	This document — CV-MVP Master Reference (latest version in source-docs/)
•	The latest HANDOVER PROTOCOL file
This prevents architecture drift. Every session MUST end with an updated handover file.
Master Bootstrap Prompt
You are the Project Director for the AI Job Application Assistant. CandidateProfile is the single source of truth. AI modules do reasoning only — never control workflow. Product flow is locked: Profile → Job → Insights → Final → Chat Refinement. Single generation endpoint only: POST /api/tailoring. Do not suggest safe/obvious changes — implement them directly, full file replacements only. Read TECHNICAL_ARCHITECTURE.md and CV-MVP Master Reference in source-docs/ at session start. Architecture document takes precedence over all other files.
16. TEST PROTOCOL
Round 1 — Core Smoke Test
•	Log out and confirm protected pages redirect correctly
•	Log in, open Profile page — confirm existing workspace/profile loads
•	Open Job page — paste a realistic, reasonably fitting JD
•	Run full analysis → Generate CV → Generate cover letter
•	Open Observatory — confirm the run appears
Five Standard JD Test Dataset
•	JD01 — Senior accounting role (HIGH match) → expect: apply_confidently
•	JD02 — Controller / FP&A hybrid (MEDIUM match) → expect: apply_with_care
•	JD03 — Bilanzbuchhalter specialist (MEDIUM match) → expect: apply_with_care or borderline
•	JD04 — Finance Manager / leadership (HIGH match) → expect: apply_confidently
•	JD05 — Borderline / unrelated role (LOW match) → expect: borderline or not_recommended
Testing Rules
•	Never change more than one layer before running a test
•	Always test with the same five JDs
•	Never trust improvements without re-running the full dataset
17. DRIFT RULE
This document is the final authority. It supersedes all older handovers, audit files, and legacy architecture notes.
•	If a request conflicts with this document — follow this document
•	If a file conflicts with this document — rewrite the file
•	If a route conflicts with this document — remove or stop using the route
•	If a Code session produces architecture drift — this document wins
APPENDIX — DOCUMENT RETENTION GUIDE
Documents to KEEP (active)
•	This consolidated document — in source/ folder and as Word file
•	TECHNICAL_ARCHITECTURE.md — in source/ folder
•	BUILD_PROFILE_BUG_REPORT.md — in source/ folder
•	PROFILE_ENRICHMENT_ARCHITECTURE_V2.md — in source/ folder
•	HANDOVER PROTOCOL LATEST.md — most recent session handover
•	CV-MVP SYSTEM TEST CHECKLIST.xlsx — live test tracker
•	Project Links.txt — environment URLs
•	profile-page-replacement.tsx — component code
Documents ARCHIVED / SUPERSEDED
•	All CV_MVP_MASTER_ARCHITECTURE*.md files (multiple versions)
•	All CV_MVP_SESSION_HANDOVER*.md files except the latest
•	All Project_Master*.md files
•	CV-MVP MASTER PROJECT CONSTITUTION.md versions
•	All MVP Doc*.docx, MVP Plan*.docx, MVP CORE*.docx
•	All Execution Plan*.pdf, MVP Budget and Timeline.pdf
Documents to DELETE
•	AutoWiederherstellen-Speicherung von Dokument3.asd.docx — temp autosave
•	Bewerben macht keinen Spaß.pdf — motivational, not project docs
•	AI MBA HUB Marketing.docx — marketing tangent
•	Stitch Web site design 21032025.docm — unrelated

END OF DOCUMENT  |  AI Job Application Assistant — CV-MVP Master Reference  |  Version 3.0  |  April 2026
