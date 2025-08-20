-- Migration: 2025_08_20_03_create_auth_audit.sql

-- Criação da tabela de auditoria de autenticação
CREATE TABLE IF NOT EXISTS auth_audit (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    event_type VARCHAR(50) NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    status VARCHAR(20) NOT NULL,
    details JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_auth_audit_user
        FOREIGN KEY (user_id)
        REFERENCES usuarios(id)
        ON DELETE SET NULL
);

-- Índices para otimização
CREATE INDEX IF NOT EXISTS idx_auth_audit_user_id ON auth_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_audit_event_type ON auth_audit(event_type);
CREATE INDEX IF NOT EXISTS idx_auth_audit_status ON auth_audit(status);
CREATE INDEX IF NOT EXISTS idx_auth_audit_created_at ON auth_audit(created_at);

-- Tipos de eventos válidos
CREATE TYPE auth_event_type AS ENUM (
    'login',
    'logout',
    'token_refresh',
    'password_reset_request',
    'password_reset_complete',
    'account_locked',
    'account_unlocked',
    'invalid_attempt'
);

-- Status válidos
CREATE TYPE auth_status AS ENUM (
    'success',
    'failure',
    'pending',
    'blocked'
);

-- Alterar a coluna event_type para usar o tipo enum
ALTER TABLE auth_audit 
    ALTER COLUMN event_type TYPE auth_event_type USING event_type::auth_event_type,
    ALTER COLUMN status TYPE auth_status USING status::auth_status;

-- Function para registrar eventos de auditoria
CREATE OR REPLACE FUNCTION log_auth_event(
    p_user_id INTEGER,
    p_event_type auth_event_type,
    p_ip_address TEXT,
    p_user_agent TEXT,
    p_status auth_status,
    p_details JSONB DEFAULT NULL
) RETURNS void AS $$
BEGIN
    INSERT INTO auth_audit (
        user_id,
        event_type,
        ip_address,
        user_agent,
        status,
        details
    ) VALUES (
        p_user_id,
        p_event_type,
        p_ip_address,
        p_user_agent,
        p_status,
        p_details
    );
END;
$$ LANGUAGE plpgsql;

-- Function para limpar registros antigos de auditoria
CREATE OR REPLACE FUNCTION cleanup_old_auth_audit()
RETURNS void AS $$
BEGIN
    -- Manter apenas os últimos 90 dias de registros
    DELETE FROM auth_audit
    WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- Agendar limpeza automática (requer extensão pg_cron)
SELECT cron.schedule(
    'cleanup-old-auth-audit',
    '0 0 * * 0', -- Todo domingo à meia-noite
    $$SELECT cleanup_old_auth_audit()$$
);
