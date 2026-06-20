-- Run this in Supabase SQL Editor
-- Adds coordinator + modeller fields to tasks (milestones)

alter table tasks
  add column if not exists coordinator_id uuid,
  add column if not exists coordinator_type text check (coordinator_type in ('worker','contractor')),
  add column if not exists modeller_worker_ids uuid[] default '{}',
  add column if not exists modeller_contractor_ids uuid[] default '{}';
