-- Budget & Costs Module
-- Run this in Supabase SQL Editor

-- Scope: buildings and their floor types
CREATE TABLE IF NOT EXISTS scope_buildings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS scope_floors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID NOT NULL REFERENCES scope_buildings(id) ON DELETE CASCADE,
  type_name TEXT NOT NULL DEFAULT '',
  floor_label TEXT NOT NULL DEFAULT '',
  typical_floors INTEGER DEFAULT 1,
  floor_count INTEGER DEFAULT 1,
  typical_sqm NUMERIC(10,2) DEFAULT 0,
  phase_a_hours NUMERIC(8,2) DEFAULT 0,
  phase_b_hours NUMERIC(8,2) DEFAULT 0,
  notes TEXT DEFAULT '',
  sort_order INTEGER DEFAULT 0
);

-- Cost line items
CREATE TABLE IF NOT EXISTS budget_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'subcontractor',
  rate NUMERIC(10,2) DEFAULT 0,
  planned_hours NUMERIC(8,2) DEFAULT 0,
  multiplier NUMERIC(4,2) DEFAULT 1.0,
  actual_cost NUMERIC(12,2),
  notes TEXT DEFAULT '',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Payment milestones
CREATE TABLE IF NOT EXISTS payment_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  percentage NUMERIC(5,2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  date_paid DATE,
  notes TEXT DEFAULT '',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add financial fields to projects
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS client_fee NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vat_rate NUMERIC(4,2) DEFAULT 17;

-- RLS for all new tables
ALTER TABLE scope_buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE scope_floors ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_all" ON scope_buildings FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth_all" ON scope_floors FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth_all" ON budget_items FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth_all" ON payment_milestones FOR ALL USING (auth.role() = 'authenticated');
