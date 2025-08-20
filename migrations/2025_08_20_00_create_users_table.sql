-- Migration: 2025_08_20_00_create_users_table.sql

-- Criando extensão pgcrypto para hash de senhas
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Tabela principal de usuários
CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    senha_hash VARCHAR(255) NOT NULL,
    papel VARCHAR(50) NOT NULL DEFAULT 'usuario',
    telefone VARCHAR(20),
    ultimo_login TIMESTAMP WITH TIME ZONE,
    ativo BOOLEAN DEFAULT true,
    token_version INTEGER NOT NULL DEFAULT 0,
    ultimo_token_refresh TIMESTAMP WITH TIME ZONE,
    sessoes_ativas INTEGER NOT NULL DEFAULT 0,
    max_sessoes INTEGER NOT NULL DEFAULT 5,
    data_criacao TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT check_max_sessoes CHECK (sessoes_ativas <= max_sessoes),
    CONSTRAINT check_valid_role CHECK (papel IN ('superadmin', 'admin', 'coordenador', 'profissional', 'assistente', 'usuario'))
);

-- Índices para otimização
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);
CREATE INDEX IF NOT EXISTS idx_usuarios_ativo ON usuarios(ativo);
CREATE INDEX IF NOT EXISTS idx_usuarios_papel ON usuarios(papel);
CREATE INDEX IF NOT EXISTS idx_usuarios_token_version ON usuarios(token_version);
