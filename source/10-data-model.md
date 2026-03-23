# Data Model

## Core entities

### users
Purpose:
Store authenticated SaaS users.

Key fields:
- id
- email
- market
- country
- pricing_segment
- created_at

### candidate_profiles
Purpose:
Store the canonical structured candidate profile.

Key fields:
- id
- user_id
- headline
- summary
- highest_education
- years_experience_estimate
- seniority_level
- leadership_experience
- languages
- core_skills
- erp_systems
- reporting_frameworks
- location
- raw_profile_json
- created_at
- updated_at

### master_cvs
Purpose:
Store original and cleaned CV text.

Key fields:
- id
- user_id
- source_type
- original_text
- cleaned_text
- file_name
- created_at

### job_inputs
Purpose:
Store job descriptions used for tailoring.

Key fields:
- id
- user_id
- title_guess
- company_guess
- job_text
- created_at

### generations
Purpose:
Store generated outputs.

Key fields:
- id
- user_id
- candidate_profile_id
- job_input_id
- output_type
- output_language
- writing_level
- fit_score
- warning_shown
- generated_text
- created_at

### feedback
Purpose:
Store user ratings and comments.

Key fields:
- id
- user_id
- generation_id
- rating
- comment
- output_type
- created_at

### analytics_events
Purpose:
Store lightweight product usage events.

Key fields:
- id
- user_id
- event_name
- event_payload
- created_at