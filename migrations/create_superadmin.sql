-- Criação do usuário superadmin
INSERT INTO usuarios (
    nome,
    email,
    senha_hash,
    papel,
    ativo,
    data_criacao,
    data_atualizacao
) VALUES (
    'Bruno Administrador',
    'bruno@move.com.br',
    crypt('15002031', gen_salt('bf', 12)), -- Usando bcrypt com 12 rounds
    'superadmin',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);
