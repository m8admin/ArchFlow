-- Allow admins to read and update all user profiles
DROP POLICY IF EXISTS "Users can read own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON user_profiles;

CREATE POLICY "Users read own or admins read all" ON user_profiles
  FOR SELECT USING (
    auth.uid() = auth_user_id
    OR EXISTS (SELECT 1 FROM user_profiles WHERE auth_user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can update all profiles" ON user_profiles
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE auth_user_id = auth.uid() AND role = 'admin')
  );
