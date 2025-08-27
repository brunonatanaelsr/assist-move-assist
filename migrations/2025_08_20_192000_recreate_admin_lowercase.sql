-- Criar novo usuário com email em minúsculas (mais compatível)
-- Primeiro deletar o usuário anterior se necessário
DELETE FROM auth.users WHERE email = 'Bruno@move.com';

-- Criar novo usuário
INSERT INTO auth.users (
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'bruno@move.com',
  crypt('15002031', gen_salt('bf')),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"nome_completo": "Bruno Santos", "tipo_usuario": "admin"}',
  now(),
  now()
) RETURNING id, email;
