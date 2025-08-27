-- Criar usuário Bruno usando a função padrão do Supabase
-- Primeiro vamos guardar o ID do usuário em uma variável
DO $$
DECLARE
    user_id uuid;
BEGIN
    -- Gerar um UUID para o usuário
    user_id := gen_random_uuid();
    
    -- Inserir na tabela auth.users (estrutura mínima)
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
        user_id,
        'authenticated',
        'authenticated',
        'Bruno@move.com',
        crypt('15002031', gen_salt('bf')),
        now(),
        '{"provider": "email", "providers": ["email"]}',
        '{"nome_completo": "Bruno Santos", "tipo_usuario": "admin"}',
        now(),
        now()
    );
    
    -- Inserir na tabela profiles usando a função existente handle_new_user
    -- que será acionada automaticamente pelo trigger
    RAISE NOTICE 'Usuário criado com ID: %', user_id;
END $$;
