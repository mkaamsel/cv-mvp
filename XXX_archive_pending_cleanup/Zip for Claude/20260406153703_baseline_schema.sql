create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

alter table if exists public.profiles
  add column if not exists privacy_version text,
  add column if not exists terms_version text,
  add column if not exists cookies_version text,
  add column if not exists consent_timestamp timestamptz,
  add column if not exists email text;

create table if not exists public.candidate_workspaces (
  user_id uuid primary key references auth.users(id) on delete cascade,
  profile_json jsonb,
  documents_json jsonb not null default '[]'::jsonb,
  meta_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_candidate_workspaces_updated_at
  on public.candidate_workspaces(updated_at desc);

alter table public.candidate_workspaces enable row level security;

drop trigger if exists trg_candidate_workspaces_updated_at on public.candidate_workspaces;
create trigger trg_candidate_workspaces_updated_at
before update on public.candidate_workspaces
for each row
execute function public.set_updated_at();

drop policy if exists "Users can read their candidate workspace" on public.candidate_workspaces;
drop policy if exists "Users can insert their candidate workspace" on public.candidate_workspaces;
drop policy if exists "Users can update their candidate workspace" on public.candidate_workspaces;
drop policy if exists "Users can delete their candidate workspace" on public.candidate_workspaces;

create policy "Users can read their candidate workspace"
  on public.candidate_workspaces
  for select
  using (auth.uid() = user_id);

create policy "Users can insert their candidate workspace"
  on public.candidate_workspaces
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update their candidate workspace"
  on public.candidate_workspaces
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their candidate workspace"
  on public.candidate_workspaces
  for delete
  using (auth.uid() = user_id);

create table if not exists public.tailoring_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  job_url text,
  job_description_input text,
  normalized_url text,
  output_language text,
  structured_job_json jsonb,
  extracted_text text,
  extraction_source text,
  warnings_json jsonb not null default '[]'::jsonb,
  company_context_json jsonb,
  application_recommendation_json jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.tailoring_runs
  add column if not exists client_run_id text,
  add column if not exists input_type text,
  add column if not exists run_outcome text,
  add column if not exists degraded_reasons_json jsonb not null default '[]'::jsonb,
  add column if not exists telemetry_json jsonb not null default '{}'::jsonb,
  add column if not exists stage_statuses_json jsonb not null default '{}'::jsonb,
  add column if not exists stage_durations_json jsonb not null default '{}'::jsonb,
  add column if not exists market_signals_json jsonb,
  add column if not exists company_research_json jsonb,
  add column if not exists final_cv_text text,
  add column if not exists final_cover_letter_text text,
  add column if not exists job_geography text,
  add column if not exists observation_points_json jsonb default '[]'::jsonb,
  add column if not exists jd_quality_analysis_json jsonb,
  add column if not exists jd_quality_gate_json jsonb;

create index if not exists idx_tailoring_runs_user_id
  on public.tailoring_runs(user_id);

create index if not exists idx_tailoring_runs_created_at
  on public.tailoring_runs(created_at desc);

create index if not exists idx_tailoring_runs_client_run_id
  on public.tailoring_runs(client_run_id);

create index if not exists idx_tailoring_runs_run_outcome
  on public.tailoring_runs(run_outcome);

create index if not exists idx_tailoring_runs_output_language
  on public.tailoring_runs(output_language);

alter table public.tailoring_runs enable row level security;

drop trigger if exists trg_tailoring_runs_updated_at on public.tailoring_runs;
create trigger trg_tailoring_runs_updated_at
before update on public.tailoring_runs
for each row
execute function public.set_updated_at();

drop policy if exists "Users can read their tailoring runs" on public.tailoring_runs;
drop policy if exists "Users can insert their tailoring runs" on public.tailoring_runs;
drop policy if exists "Users can update their tailoring runs" on public.tailoring_runs;
drop policy if exists "Users can delete their tailoring runs" on public.tailoring_runs;

create policy "Users can read their tailoring runs"
  on public.tailoring_runs
  for select
  using (auth.uid() = user_id);

create policy "Users can insert their tailoring runs"
  on public.tailoring_runs
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update their tailoring runs"
  on public.tailoring_runs
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their tailoring runs"
  on public.tailoring_runs
  for delete
  using (auth.uid() = user_id);

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'profiles'
  ) then
    alter table public.profiles enable row level security;

    execute 'drop policy if exists "Users can read their profile" on public.profiles';
    execute 'drop policy if exists "Users can insert their profile" on public.profiles';
    execute 'drop policy if exists "Users can update their profile" on public.profiles';
    execute 'drop policy if exists "Users can delete their profile" on public.profiles';

    create policy "Users can read their profile"
      on public.profiles
      for select
      using (auth.uid() = id);

    create policy "Users can insert their profile"
      on public.profiles
      for insert
      with check (auth.uid() = id);

    create policy "Users can update their profile"
      on public.profiles
      for update
      using (auth.uid() = id)
      with check (auth.uid() = id);

    create policy "Users can delete their profile"
      on public.profiles
      for delete
      using (auth.uid() = id);
  end if;
end
$$;

create table if not exists public.user_feedback (
  id bigint generated by default as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  run_id uuid null references public.tailoring_runs(id) on delete cascade,
  stage text not null,
  stars integer not null check (stars >= 1 and stars <= 10),
  comment text null,
  page text,
  step_time_ms integer,
  created_at timestamptz not null default now()
);

create index if not exists idx_user_feedback_user_id
  on public.user_feedback(user_id);

create index if not exists idx_user_feedback_run_id
  on public.user_feedback(run_id);

create index if not exists idx_user_feedback_created_at
  on public.user_feedback(created_at desc);

alter table public.user_feedback enable row level security;

drop policy if exists "Users can read their feedback" on public.user_feedback;
drop policy if exists "Users can insert their feedback" on public.user_feedback;
drop policy if exists "Users can update their feedback" on public.user_feedback;
drop policy if exists "Users can delete their feedback" on public.user_feedback;

create policy "Users can read their feedback"
  on public.user_feedback
  for select
  using (auth.uid() = user_id);

create policy "Users can insert their feedback"
  on public.user_feedback
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update their feedback"
  on public.user_feedback
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their feedback"
  on public.user_feedback
  for delete
  using (auth.uid() = user_id);

create table if not exists public.run_performance_evaluations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  evaluation_scope text not null,
  run_ids_json jsonb not null default '[]'::jsonb,
  domain_label text,
  evaluation_json jsonb not null default '{}'::jsonb,
  overall_score numeric,
  extraction_score numeric,
  evidence_score numeric,
  generation_score numeric,
  created_at timestamptz not null default now()
);

create index if not exists idx_run_performance_evaluations_user_id
  on public.run_performance_evaluations(user_id);

create index if not exists idx_run_performance_evaluations_created_at
  on public.run_performance_evaluations(created_at desc);

alter table public.run_performance_evaluations enable row level security;

drop policy if exists "Users can read their performance evaluations" on public.run_performance_evaluations;
drop policy if exists "Users can insert their performance evaluations" on public.run_performance_evaluations;
drop policy if exists "Users can update their performance evaluations" on public.run_performance_evaluations;
drop policy if exists "Users can delete their performance evaluations" on public.run_performance_evaluations;

create policy "Users can read their performance evaluations"
  on public.run_performance_evaluations
  for select
  using (auth.uid() = user_id);

create policy "Users can insert their performance evaluations"
  on public.run_performance_evaluations
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update their performance evaluations"
  on public.run_performance_evaluations
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their performance evaluations"
  on public.run_performance_evaluations
  for delete
  using (auth.uid() = user_id);

create table if not exists public.candidate_satisfaction (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_run_id text not null,
  cv_represents_accurately boolean,
  cover_letter_sounds_like_me boolean,
  would_send_as_is boolean,
  created_at timestamptz not null default now()
);

create index if not exists idx_candidate_satisfaction_user_id
  on public.candidate_satisfaction(user_id);

create index if not exists idx_candidate_satisfaction_client_run_id
  on public.candidate_satisfaction(client_run_id);

create index if not exists idx_candidate_satisfaction_created_at
  on public.candidate_satisfaction(created_at desc);

alter table public.candidate_satisfaction enable row level security;

drop policy if exists "Users can insert own satisfaction" on public.candidate_satisfaction;
drop policy if exists "Users can read own satisfaction" on public.candidate_satisfaction;

create policy "Users can insert own satisfaction"
  on public.candidate_satisfaction
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can read own satisfaction"
  on public.candidate_satisfaction
  for select
  to authenticated
  using (auth.uid() = user_id);

create table if not exists public.prompt_tournament_results (
  id uuid primary key default gen_random_uuid(),
  run_id text not null,
  prompt_variant text not null,
  richness_score numeric not null,
  accuracy_score numeric not null,
  zeugnis_score numeric not null,
  total_score numeric not null,
  judge_reasoning text,
  profile_output jsonb,
  winner_of_run boolean default false,
  created_at timestamptz default now()
);

create index if not exists idx_prompt_tournament_results_run_id
  on public.prompt_tournament_results(run_id);

create index if not exists idx_prompt_tournament_results_created_at
  on public.prompt_tournament_results(created_at desc);

alter table public.prompt_tournament_results enable row level security;

drop policy if exists "Users can read prompt tournament results" on public.prompt_tournament_results;
drop policy if exists "Users can insert prompt tournament results" on public.prompt_tournament_results;