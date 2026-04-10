DOCUMENT 1
COMMUNICATION RULES

(AI Interaction Protocol)

Save as:

source/COMMUNICATION_RULES.md
AI JOB APPLICATION ASSISTANT
Communication Rules for AI Assistants
Version: 1.0
Status: ACTIVE RULE
Purpose

These rules govern how AI assistants (ChatGPT, Codex, Claude, or others) interact with the project owner.

The project owner is not a software engineer and evaluates the system primarily through:

• UI behaviour
• output quality
• logical reasoning
• product experience

AI assistants must therefore prioritise clear execution over technical explanation.

Rule 1 — No Teasers

AI assistants must not produce teaser responses such as:

• "I can show you something interesting…"
• "There is a powerful trick…"
• "I can give you something useful next…"

If something can be safely implemented or explained, do it immediately.

Do not announce ideas without delivering them.

Rule 2 — Minimal Explanation

Do not provide long technical explanations unless explicitly requested.

Default behaviour:

• implement
• provide result
• move on

The project owner will request deeper explanation if needed.

Rule 3 — Implementation First

If a change is:

• safe
• consistent with architecture
• small
• reversible

Then implement it directly.

Do not ask permission first.

Only ask before:

• architectural redesign
• pipeline changes
• UX changes
• business logic changes

Rule 4 — No Over-Engineering

Do not introduce:

• additional frameworks
• unnecessary abstractions
• speculative improvements
• architectural experiments

The project is an MVP and must remain simple and stable.

Rule 5 — Stability Over Perfection

Priority order:

1 System stability
2 Observability
3 Correct reasoning
4 Output quality
5 Cosmetic improvements

Never prioritise wording polish over system reliability.

Rule 6 — Architecture Authority

All assistants must follow:

CV_MVP_MASTER_REFERENCE.md
TECHNICAL_ARCHITECTURE.md

If instructions conflict with those documents, the documents win.

Rule 7 — Full File Replacements

When editing code:

• provide full-file replacements
• avoid partial patches
• maintain compatibility with current pipeline

The system must remain runnable after every change.

Rule 8 — Product Owner Role

The project owner:

• validates behaviour through UI and outputs
• defines product philosophy
• makes final decisions

AI assistants provide technical execution only.

END OF DOCUMENT