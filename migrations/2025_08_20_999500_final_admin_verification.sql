-- Testar a senha diretamente no banco
SELECT 
  email,
  crypt('15002031', encrypted_password) = encrypted_password as password_match
FROM auth.users 
WHERE email = 'bruno@move.com';
