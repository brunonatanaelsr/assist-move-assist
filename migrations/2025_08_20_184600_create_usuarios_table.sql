-- Migração para criar a tabela de usuários
-- Data: 2025-08-20 18:46:00

-- Criar ENUM para papéis de usuário
CREATE TYPE user_role AS ENUM ('admin', 'user', 'moderator');

-- Criar tabela usuarios
CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    senha_hash VARCHAR(255) NOT NULL,
    papel user_role NOT NULL DEFAULT 'user',
    telefone VARCHAR(20),
    ativo BOOLEAN NOT NULL DEFAULT true,
    token_version INTEGER NOT NULL DEFAULT 0,
    ultimo_login TIMESTAMP WITH TIME ZONE,
    data_criacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    data_atualizacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT nome_length CHECK (LENGTH(nome) >= 2),
    CONSTRAINT senha_hash_length CHECK (LENGTH(senha_hash) >= 10)
);

-- Índices para performance
CREATE INDEX idx_usuarios_email ON usuarios(email);
CREATE INDEX idx_usuarios_papel ON usuarios(papel);
CREATE INDEX idx_usuarios_ativo ON usuarios(ativo);
CREATE INDEX idx_usuarios_ultimo_login ON usuarios(ultimo_login);
CREATE INDEX idx_usuarios_data_criacao ON usuarios(data_criacao);

-- Índice composto para consultas com filtro de ativo e email
CREATE INDEX idx_usuarios_ativo_email ON usuarios(ativo, email);

-- Comentários na tabela
COMMENT ON TABLE usuarios IS 'Tabela de usuários do sistema';
COMMENT ON COLUMN usuarios.id IS 'Identificador único do usuário';
COMMENT ON COLUMN usuarios.nome IS 'Nome completo do usuário';
COMMENT ON COLUMN usuarios.email IS 'E-mail único do usuário (usado para login)';
COMMENT ON COLUMN usuarios.senha_hash IS 'Hash bcrypt da senha do usuário';
COMMENT ON COLUMN usuarios.papel IS 'Papel/função do usuário no sistema';
COMMENT ON COLUMN usuarios.telefone IS 'Número de telefone do usuário';
COMMENT ON COLUMN usuarios.ativo IS 'Status ativo/inativo do usuário';
COMMENT ON COLUMN usuarios.token_version IS 'Versão do token para invalidação de refresh tokens';
COMMENT ON COLUMN usuarios.ultimo_login IS 'Data e hora do último login';
COMMENT ON COLUMN usuarios.data_criacao IS 'Data de criação do registro';
COMMENT ON COLUMN usuarios.data_atualizacao IS 'Data da última atualização';

-- Função para atualizar automaticamente data_atualizacao
CREATE OR REPLACE FUNCTION update_data_atualizacao()
RETURNS TRIGGER AS $$
BEGIN
    NEW.data_atualizacao = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar automaticamente data_atualizacao
CREATE TRIGGER trigger_usuarios_data_atualizacao
    BEFORE UPDATE ON usuarios
    FOR EACH ROW
    EXECUTE FUNCTION update_data_atualizacao();

-- Inserir usuário administrador padrão (senha: admin123)
INSERT INTO usuarios (nome, email, senha_hash, papel) VALUES 
('Administrador', 'admin@movemarias.org', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewwJjhXh8nCOtI6K', 'admin')
ON CONFLICT (email) DO NOTHING;
