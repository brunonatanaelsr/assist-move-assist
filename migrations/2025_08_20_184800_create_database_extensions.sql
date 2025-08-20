-- Migração para extensões e configurações do banco
-- Data: 2025-08-20 18:48:00

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Função para gerar hash seguro (caso precise usar no banco)
CREATE OR REPLACE FUNCTION generate_secure_hash(input_text TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN encode(digest(input_text, 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql;

-- Função para validar formato de e-mail
CREATE OR REPLACE FUNCTION is_valid_email(email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$';
END;
$$ LANGUAGE plpgsql;

-- Função para log de auditoria (opcional)
CREATE OR REPLACE FUNCTION log_user_activity()
RETURNS TRIGGER AS $$
BEGIN
    -- Inserir em tabela de auditoria se existir
    -- Por enquanto apenas log no sistema
    RAISE NOTICE 'User activity: % on table %', TG_OP, TG_TABLE_NAME;
    
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
