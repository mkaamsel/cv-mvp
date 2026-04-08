-- Observatory observability: add L1 candidate profile column to tailoring_runs.
-- candidate_profile_json — normalised CandidateProfile struct passed into the pipeline.
-- Existing runs will have NULL for this column, which is the correct fallback.

alter table public.tailoring_runs
  add column if not exists candidate_profile_json jsonb;
