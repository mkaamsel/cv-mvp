-- Migration: Add observation_points_json, jd_quality_analysis_json, jd_quality_gate_json
-- to tailoring_runs table
-- Run in Supabase SQL editor or via: supabase db push

ALTER TABLE tailoring_runs
  ADD COLUMN IF NOT EXISTS observation_points_json   JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS jd_quality_analysis_json  JSONB,
  ADD COLUMN IF NOT EXISTS jd_quality_gate_json      JSONB;
