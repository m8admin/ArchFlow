-- Back Office: User Roles + Time Tracking
-- Run this in Supabase SQL Editor

-- 1. User profiles with roles
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = auth_user_id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (auth_user_id, role) VALUES (NEW.id, 'member');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create profile for existing users who don't have one
INSERT INTO user_profiles (auth_user_id, role)
SELECT id, 'member' FROM auth.users
WHERE id NOT IN (SELECT auth_user_id FROM user_profiles);

-- 2. Time entries
CREATE TABLE IF NOT EXISTS time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL,
  worker_type TEXT NOT NULL CHECK (worker_type IN ('worker', 'contractor')),
  hours NUMERIC(6,2) NOT NULL CHECK (hours > 0),
  date DATE NOT NULL,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_time_entries_task ON time_entries(task_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_worker ON time_entries(worker_id, worker_type);
CREATE INDEX IF NOT EXISTS idx_time_entries_date ON time_entries(date);

ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage time entries" ON time_entries
  FOR ALL USING (auth.role() = 'authenticated');
