-- Migration: Create candidate_satisfaction table
-- Run in Supabase SQL editor or via: supabase db push

CREATE TABLE IF NOT EXISTS candidate_satisfaction (
  id                            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_run_id                 TEXT NOT NULL,
  cv_represents_accurately      BOOLEAN,
  cover_letter_sounds_like_me   BOOLEAN,
  would_send_as_is              BOOLEAN,
  created_at                    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE candidate_satisfaction ENABLE ROW LEVEL SECURITY;

-- Policy: users can insert their own satisfaction records
CREATE POLICY "Users can insert own satisfaction"
  ON candidate_satisfaction
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy: users can read their own satisfaction records
CREATE POLICY "Users can read own satisfaction"
  ON candidate_satisfaction
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
