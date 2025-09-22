-- Criar a tabela de usuários se não existir
CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    senha_hash VARCHAR(255) NOT NULL,
    papel VARCHAR(50) NOT NULL,
    ativo BOOLEAN DEFAULT true,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inserir ou atualizar o usuário admin
INSERT INTO usuarios (nome, email, senha_hash, papel, ativo)
VALUES (
    'Bruno Superadmin',
    'bruno@move.com',
    '$2a$12$tAyZvbRc0VrWS2xKt7ck5.QN2f3mQUkfNM/FmDbA.J1qgbgCOc0X2', -- Hash para '15002031'
    'superadmin',
    true
)
ON CONFLICT (email) DO UPDATE 
SET 
    senha_hash = EXCLUDED.senha_hash,
    papel = EXCLUDED.papel,
    ativo = true,
    data_atualizacao = CURRENT_TIMESTAMP;
