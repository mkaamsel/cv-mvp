-- Phase 1 observatory persistence: add layer-level analysis columns to tailoring_runs.
-- required_profile_json  — RequiredProfile struct from L3
-- selected_evidence_json — SelectedEvidencePack struct from L7 (all five arrays)
-- positioning_brief_json — PositioningBriefPack struct from L8
-- Existing runs will have NULL for these columns, which is the correct fallback.

alter table public.tailoring_runs
  add column if not exists required_profile_json   jsonb,
  add column if not exists selected_evidence_json  jsonb,
  add column if not exists positioning_brief_json  jsonb;
