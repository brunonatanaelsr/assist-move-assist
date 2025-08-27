-- Atualizar senha do usuário Bruno para que funcione corretamente
UPDATE auth.users 
SET encrypted_password = crypt('15002031', gen_salt('bf'))
WHERE email = 'Bruno@move.com';
