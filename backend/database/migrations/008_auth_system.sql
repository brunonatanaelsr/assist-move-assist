-- Criar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Schema para autenticação
CREATE SCHEMA IF NOT EXISTS auth;

-- Enum para papéis de usuário
CREATE TYPE auth.user_role AS ENUM ('admin', 'coordenador', 'assistente_social', 'psicologo', 'voluntario', 'monitor');

-- Tabela principal de usuários
CREATE TABLE auth.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    nome VARCHAR(255) NOT NULL,
    role auth.user_role NOT NULL DEFAULT 'voluntario',
    active BOOLEAN DEFAULT true,
    last_login TIMESTAMP WITH TIME ZONE,
    login_count INTEGER DEFAULT 0,
    failed_attempts INTEGER DEFAULT 0,
    last_failed_attempt TIMESTAMP WITH TIME ZONE,
    password_reset_token TEXT,
    password_reset_expires TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de refresh tokens
CREATE TABLE auth.refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token TEXT UNIQUE NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    device_info JSONB,
    ip_address INET,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    revoked BOOLEAN DEFAULT false,
    revoked_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de logs de autenticação
CREATE TABLE auth.auth_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    event_type VARCHAR(50) NOT NULL,
    ip_address INET,
    user_agent TEXT,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX idx_users_email ON auth.users(email);
CREATE INDEX idx_users_role ON auth.users(role);
CREATE INDEX idx_refresh_tokens_user ON auth.refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_expires ON auth.refresh_tokens(expires_at);
CREATE INDEX idx_auth_logs_user ON auth.auth_logs(user_id);
CREATE INDEX idx_auth_logs_created ON auth.auth_logs(created_at);

-- Funções e triggers

-- Função para atualizar timestamp
CREATE OR REPLACE FUNCTION auth.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at em users
CREATE TRIGGER update_users_timestamp
    BEFORE UPDATE ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION auth.update_updated_at();

-- Função para registrar tentativa de login
CREATE OR REPLACE FUNCTION auth.register_login_attempt(
    p_user_id UUID,
    p_success BOOLEAN,
    p_ip_address INET,
    p_user_agent TEXT
)
RETURNS VOID AS $$
BEGIN
    IF p_success THEN
        UPDATE auth.users 
        SET 
            last_login = CURRENT_TIMESTAMP,
            login_count = login_count + 1,
            failed_attempts = 0,
            last_failed_attempt = NULL
        WHERE id = p_user_id;
    ELSE
        UPDATE auth.users 
        SET 
            failed_attempts = failed_attempts + 1,
            last_failed_attempt = CURRENT_TIMESTAMP
        WHERE id = p_user_id;
    END IF;

    INSERT INTO auth.auth_logs (
        user_id,
        event_type,
        ip_address,
        user_agent,
        details
    ) VALUES (
        p_user_id,
        CASE WHEN p_success THEN 'login_success' ELSE 'login_failed' END,
        p_ip_address,
        p_user_agent,
        jsonb_build_object(
            'success', p_success,
            'timestamp', CURRENT_TIMESTAMP
        )
    );
END;
$$ LANGUAGE plpgsql;

-- Função para limpar tokens expirados
CREATE OR REPLACE FUNCTION auth.cleanup_expired_tokens()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM auth.refresh_tokens
    WHERE expires_at < CURRENT_TIMESTAMP
    OR revoked = true;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Views

-- View para status de usuários ativos
CREATE OR REPLACE VIEW auth.active_users_status AS
SELECT 
    u.id,
    u.email,
    u.nome,
    u.role,
    u.last_login,
    u.login_count,
    COUNT(rt.id) as active_sessions,
    MAX(rt.created_at) as last_session_start
FROM auth.users u
LEFT JOIN auth.refresh_tokens rt ON u.id = rt.user_id
WHERE 
    u.active = true 
    AND (rt.expires_at > CURRENT_TIMESTAMP OR rt.id IS NULL)
GROUP BY u.id;

-- View para métricas de autenticação
CREATE OR REPLACE VIEW auth.auth_metrics AS
SELECT 
    DATE_TRUNC('hour', created_at) as time_bucket,
    event_type,
    COUNT(*) as event_count,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(DISTINCT ip_address) as unique_ips
FROM auth.auth_logs
WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '24 hours'
GROUP BY 1, 2
ORDER BY 1 DESC;
