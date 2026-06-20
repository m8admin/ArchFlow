-- Run this in Supabase SQL Editor
-- Adds subtask support and modeller hours to tasks

alter table tasks
  add column if not exists parent_milestone_id uuid references tasks(id) on delete cascade,
  add column if not exists modeller_hours numeric;
