-- Dar acesso de administrador ao usuário bruno@move.com
UPDATE public.profiles 
SET tipo_usuario = 'admin'
WHERE email = 'bruno@move.com';

-- Verificar se a atualização foi feita
SELECT user_id, nome_completo, email, tipo_usuario 
FROM public.profiles 
WHERE email = 'bruno@move.com';
