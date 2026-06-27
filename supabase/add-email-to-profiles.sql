-- Add email column to user_profiles
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- Backfill emails from auth.users
UPDATE user_profiles SET email = au.email
FROM auth.users au WHERE au.id = user_profiles.auth_user_id;

-- Update trigger to also store email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (auth_user_id, role, email)
  VALUES (NEW.id, 'member', NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
