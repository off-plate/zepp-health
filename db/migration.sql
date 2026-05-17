-- Zepp Health — schema migration
-- Run in Supabase SQL Editor (project fhfempisopwsdkmvywbt — shared)
-- All tables prefixed `zepp_`. RLS scoped to user_id.

create extension if not exists "pgcrypto";

-- ============================================================
-- zepp_wellness — one row per day per user
-- ============================================================
create table if not exists public.zepp_wellness (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  resting_hr int,
  sleep_secs int,
  sleep_score numeric,
  sleep_quality int,
  steps int,
  weight numeric,
  ctl numeric,           -- chronic training load (fitness)
  atl numeric,           -- acute training load (fatigue)
  atl_load numeric,
  ctl_load numeric,
  ramp_rate numeric,
  raw jsonb,             -- full row from API for future expansion
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);
create index if not exists zepp_wellness_user_day_idx on public.zepp_wellness(user_id, day desc);

alter table public.zepp_wellness enable row level security;
drop policy if exists "zepp_wellness_owner_select" on public.zepp_wellness;
create policy "zepp_wellness_owner_select" on public.zepp_wellness
  for select using (auth.uid() = user_id);

-- ============================================================
-- zepp_activities — one row per workout
-- ============================================================
create table if not exists public.zepp_activities (
  id text primary key,                -- intervals.icu activity id (e.g. i149171541)
  user_id uuid not null references auth.users(id) on delete cascade,
  start_date timestamptz not null,
  start_date_local timestamptz,
  type text,
  sub_type text,
  name text,
  description text,
  device_name text,
  moving_time int,
  elapsed_time int,
  distance numeric,
  total_elevation_gain numeric,
  average_speed numeric,
  max_speed numeric,
  average_heartrate numeric,
  max_heartrate int,
  average_cadence numeric,
  calories numeric,
  trimp numeric,
  icu_training_load numeric,
  has_heartrate boolean,
  raw jsonb,
  updated_at timestamptz not null default now()
);
create index if not exists zepp_activities_user_date_idx on public.zepp_activities(user_id, start_date desc);

alter table public.zepp_activities enable row level security;
drop policy if exists "zepp_activities_owner_select" on public.zepp_activities;
create policy "zepp_activities_owner_select" on public.zepp_activities
  for select using (auth.uid() = user_id);

-- ============================================================
-- zepp_sync_log — track when the cron ran
-- ============================================================
create table if not exists public.zepp_sync_log (
  id uuid primary key default gen_random_uuid(),
  ran_at timestamptz not null default now(),
  ok boolean not null,
  wellness_rows int,
  activity_rows int,
  error text
);
-- no RLS — readable by all authenticated users (single-tenant for now)
alter table public.zepp_sync_log enable row level security;
drop policy if exists "zepp_sync_log_auth_select" on public.zepp_sync_log;
create policy "zepp_sync_log_auth_select" on public.zepp_sync_log
  for select using (auth.role() = 'authenticated');

-- Done.
-- select table_name from information_schema.tables where table_schema='public' and table_name like 'zepp_%';
