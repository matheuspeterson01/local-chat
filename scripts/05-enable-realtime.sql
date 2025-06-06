-- Verificar se o Realtime está habilitado para as tabelas
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('profiles', 'messages');

-- Habilitar Realtime para as tabelas (se não estiver habilitado)
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- Verificar se as tabelas foram adicionadas à publicação
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';

-- Verificar políticas RLS
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('profiles', 'messages');
