# CORE AUDIT

## Confirmed findings

### 1. app/api/tailoring/route.ts
- Actual role: job extraction route
- Not a tailoring route
- Handles URL fetch, fallback fetch, text cleaning, AI job structuring

### 2. app/api/select-evidence/route.ts
- Correct new-architecture bridge
- Accepts candidateProfile + jobProfile
- Returns structured evidencePackage

### 3. lib/ai/selectEvidence.ts
- Strong core logic
- Encodes credibility, safe claims, unsafe claims, adjacency logic
- This is the strategic center of the system

### 4. app/api/generate-cv/route.ts
- Old architecture
- Uses raw cvText + raw jobText
- Does not consume evidencePackage

### 5. app/api/generate-cover-letter/route.ts
- Old architecture
- Uses raw cvText + raw jobText
- Does not consume evidencePackage

## Decision
Rebuild generate-cv and generate-cover-letter to consume structured evidencePackage.
Treat tailoring route as job extraction for now.

## New generation contract

### generate-cv target input
- candidateProfile: CandidateProfile
- jobProfile: JobProfile
- evidencePackage: EvidencePackage
- outputLanguage?: string
- writingLevel?: string

### generate-cover-letter target input
- candidateProfile: CandidateProfile
- jobProfile: JobProfile
- evidencePackage: EvidencePackage
- outputLanguage?: string
- writingLevel?: string

### Generation rule
Documents must be generated from selected evidence, not from raw CV text + raw job text.