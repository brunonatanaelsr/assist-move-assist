-- Migration: 2025_08_20_14_add_missing_features.sql

-- Adicionando extensões necessárias que faltaram
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Adicionando campos adicionais na tabela usuarios
ALTER TABLE usuarios 
ADD COLUMN IF NOT EXISTS tentativas_login INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS status_login VARCHAR(20) DEFAULT 'ativo';

-- Criando tabela de tentativas de login que faltou
CREATE TABLE IF NOT EXISTS login_attempts (
    id SERIAL PRIMARY KEY,
    email VARCHAR(100) NOT NULL,
    attempt_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    ip_address VARCHAR(45),
    user_agent TEXT,
    success BOOLEAN DEFAULT false
);

-- Adicionando campos de auditoria que faltaram em algumas tabelas
ALTER TABLE beneficiarias
ADD COLUMN IF NOT EXISTS updated_by INTEGER REFERENCES usuarios(id),
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS deleted_by INTEGER REFERENCES usuarios(id);

ALTER TABLE projetos
ADD COLUMN IF NOT EXISTS updated_by INTEGER REFERENCES usuarios(id),
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS deleted_by INTEGER REFERENCES usuarios(id);

ALTER TABLE oficinas
ADD COLUMN IF NOT EXISTS updated_by INTEGER REFERENCES usuarios(id),
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS deleted_by INTEGER REFERENCES usuarios(id);

-- Adicionando funções de auditoria que faltaram
CREATE OR REPLACE FUNCTION soft_delete_record()
RETURNS TRIGGER AS $$
BEGIN
    NEW.deleted_at = CURRENT_TIMESTAMP;
    NEW.deleted_by = (current_setting('app.current_user_id', true))::integer;
    NEW.ativo = false;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicando triggers de soft delete
CREATE TRIGGER soft_delete_beneficiaria
    BEFORE UPDATE OF ativo ON beneficiarias
    FOR EACH ROW
    WHEN (OLD.ativo = true AND NEW.ativo = false)
    EXECUTE FUNCTION soft_delete_record();

CREATE TRIGGER soft_delete_projeto
    BEFORE UPDATE OF ativo ON projetos
    FOR EACH ROW
    WHEN (OLD.ativo = true AND NEW.ativo = false)
    EXECUTE FUNCTION soft_delete_record();

CREATE TRIGGER soft_delete_oficina
    BEFORE UPDATE OF ativo ON oficinas
    FOR EACH ROW
    WHEN (OLD.ativo = true AND NEW.ativo = false)
    EXECUTE FUNCTION soft_delete_record();
