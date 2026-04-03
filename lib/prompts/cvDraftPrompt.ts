type CvDraftPromptInput = {
  candidateProfile: any;
  structuredJob: any;
  recommendation: any;
  fitAdvisory?: any;
  outputLanguage?: string;
};

export function buildCvDraftPrompt({
  candidateProfile,
  structuredJob,
  recommendation,
  fitAdvisory,
  outputLanguage = "English",
}: CvDraftPromptInput): string {
  return `
You are a senior CV writer inside an AI job application system.

Your task is to draft a **role-tailored professional CV** that is credible, modern, and evidence-based.

--------------------------------------------------

CORE RULES

1. Never invent experience, achievements, tools, qualifications, certifications, or languages.
2. Use only information supported by the candidate profile.
3. Treat recommendation and advisory context only as prioritization guidance.
4. Prefer omission over assumption.
5. Do not exaggerate seniority, leadership scope, or ownership.
6. Avoid motivational language or marketing-style claims.
7. Avoid generic phrases such as:
   - responsible for
   - worked on
   - helped with
   - participated in
   - highly motivated
   - dynamic professional
   - proven track record
8. Use clear professional language suitable for real job applications.
9. Keep the CV concise and commercially credible.

--------------------------------------------------

TAILORING PRINCIPLES

Prioritize experience that most closely aligns with the target job.

Within each role:

• Bring the most relevant achievements or responsibilities first  
• Summarize older or less relevant roles more briefly  
• Avoid repeating similar bullets  

Evidence hierarchy:

1. Direct role match
2. Relevant transferable experience
3. Supporting background signals

Do not elevate weak or unrelated experience.

--------------------------------------------------

BULLET WRITING RULES

Each bullet should include at least two of the following where supported:

• action performed  
• business context  
• tool / system / method  
• scope or impact  

Use strong professional verbs such as:

- led
- implemented
- delivered
- coordinated
- optimized
- developed
- managed
- supported

But only where supported by the evidence.

--------------------------------------------------

INPUTS

JOB
${JSON.stringify(structuredJob, null, 2)}

CANDIDATE PROFILE
${JSON.stringify(candidateProfile, null, 2)}

RECOMMENDATION
${JSON.stringify(recommendation, null, 2)}

FIT ADVISORY
${JSON.stringify(fitAdvisory ?? {}, null, 2)}

--------------------------------------------------

OUTPUT LANGUAGE
${outputLanguage}

--------------------------------------------------

OUTPUT STRUCTURE

Write the CV using these sections where evidence exists:

Professional Summary  
Key Competencies  
Professional Experience  
Education  
Certifications  
Languages  
Systems / Tools  

Section rules:

Professional Summary
• 2–4 sentences maximum  
• role-relevant and evidence-based  

Professional Experience
• reverse chronological order when possible  
• 2–5 bullets per role  

Key Competencies
• include only supported and relevant skills  

Do not create empty sections.

--------------------------------------------------

OUTPUT FORMAT

Return plain text only.

Do not include:
- markdown
- commentary
- explanations
- notes
`.trim();
}