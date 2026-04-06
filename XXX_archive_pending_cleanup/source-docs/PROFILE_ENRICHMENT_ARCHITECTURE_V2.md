Profile Enrichment Architecture — V2 Design
Date: 05 April 2026
Status: Agreed design direction — not yet implemented

Problem with current implementation
The pipeline sends the full existing profile plus each new document to the AI and asks for an updated profile. The AI summarises and compresses rather than appending — losing skills, claims, and Zeugnis detail with every enrichment cycle. This is a rewrite not a merge.

Agreed architecture — V2
Phase 1 — Dumb append
Every uploaded document is parsed and its raw content appended to a master source record. No AI involved at this stage. Just accumulate everything cleanly.
Phase 2 — AI extraction runs on full record
AI reads the complete master record in one pass — CV plus all Zeugnisse plus any other documents — and produces the best possible structured profile. Rich, deduplicated, coherent. This replaces the current per-document enrichment loop.
Phase 3 — Tenure and depth weighting
AI calculates and stores per role: duration, seniority level, recency, and Zeugnis coverage. This is used to weight which experience gets prioritised in tailored output. Short roles are not deprioritised automatically — recency can outweigh duration, especially for demonstrating current German market activity.
Phase 4 — Market signal layer
Market context fed as a signal input alongside the profile: German market conditions, sector state, interim vs permanent role flags, geographic experience weighting. AI uses this to produce not just a structured profile but a positioned profile — what to emphasise, what to contextualise, what the market currently values that this candidate has.
Enrich profile button behaviour
Clicking Enrich profile re-runs the AI extraction on the full accumulated master record. Each enrichment cycle produces a richer result — never a regression.

What Zeugnisse should contribute that CVs cannot

Third party endorsement of character and performance
Departure reason and context — company-initiated vs mutual vs performance
Responsibilities confirmed by employer that were not self-reported in CV
Seniority of signatory as a quality signal
Specific additional tasks not listed in CV


Positioning engine — future tournament candidate
A separate prompt layer sitting above profile extraction. Inputs: structured profile, tenure weights, market signals. Output: positioning strategy — emphasis, framing, gap contextualisation. To be designed and optimised via tournament after core pipeline is stable.

Implementation priority

Structured append — master source record, no AI on ingest
Single-pass AI extraction on full record
Tenure and duration storage per role
Market signal layer input
Positioning engine — tournament phase
