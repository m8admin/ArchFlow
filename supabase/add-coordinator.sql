-- Run this in Supabase SQL Editor to add coordinator fields to projects
alter table projects
  add column if not exists coordinator_id uuid,
  add column if not exists coordinator_type text check (coordinator_type in ('worker','contractor'));
