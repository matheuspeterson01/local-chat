-- Clean up any duplicate profiles
DELETE FROM profiles 
WHERE id IN (
  SELECT id FROM (
    SELECT id, 
           ROW_NUMBER() OVER (PARTITION BY id ORDER BY created_at DESC) as rn
    FROM profiles
  ) t 
  WHERE t.rn > 1
);

-- Create profiles for any existing users that don't have one
INSERT INTO profiles (id, username, avatar_url, status)
SELECT 
  au.id,
  COALESCE(au.raw_user_meta_data->>'username', split_part(au.email, '@', 1)) as username,
  COALESCE(au.raw_user_meta_data->>'avatar_url', '') as avatar_url,
  'offline' as status
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Update any profiles with missing usernames
UPDATE profiles 
SET username = CONCAT('user_', SUBSTRING(id::text, 1, 8))
WHERE username IS NULL OR username = '';
