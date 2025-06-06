-- Verificar se há perfis duplicados
SELECT id, COUNT(*) as count 
FROM profiles 
GROUP BY id 
HAVING COUNT(*) > 1;

-- Limpar perfis duplicados se existirem
DELETE FROM profiles 
WHERE ctid NOT IN (
  SELECT DISTINCT ON (id) ctid
  FROM profiles
  ORDER BY id, created_at DESC
);

-- Verificar usuários sem perfil
SELECT au.id, au.email
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE p.id IS NULL;

-- Criar perfis para usuários que não têm
INSERT INTO profiles (id, username, avatar_url, status)
SELECT 
  au.id,
  COALESCE(au.raw_user_meta_data->>'username', split_part(au.email, '@', 1)) as username,
  COALESCE(au.raw_user_meta_data->>'avatar_url', '') as avatar_url,
  'offline' as status
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE p.id IS NULL
ON CONFLICT (id) DO UPDATE SET
  username = EXCLUDED.username,
  avatar_url = EXCLUDED.avatar_url,
  updated_at = NOW();

-- Verificar resultado final
SELECT 
  (SELECT COUNT(*) FROM auth.users) as total_users,
  (SELECT COUNT(*) FROM profiles) as total_profiles,
  (SELECT COUNT(*) FROM profiles WHERE status = 'online') as online_users;
