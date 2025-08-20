-- Migration: 2025_08_20_02_create_refresh_tokens.sql

-- Criação da tabela de refresh tokens
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    token_hash TEXT NOT NULL,
    token_version INTEGER NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    last_used TIMESTAMP,
    revoked BOOLEAN NOT NULL DEFAULT FALSE,
    revoked_reason TEXT,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_refresh_tokens_user
        FOREIGN KEY (user_id)
        REFERENCES usuarios(id)
        ON DELETE CASCADE
);

-- Índices para otimização de performance
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_revoked ON refresh_tokens(revoked) WHERE revoked = FALSE;

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_refresh_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_refresh_tokens_updated_at
    BEFORE UPDATE ON refresh_tokens
    FOR EACH ROW
    EXECUTE FUNCTION update_refresh_tokens_updated_at();

-- Trigger para atualizar sessões ativas
CREATE TRIGGER trg_refresh_tokens_sessoes_ativas
    AFTER INSERT OR DELETE ON refresh_tokens
    FOR EACH ROW
    EXECUTE FUNCTION update_sessoes_ativas();

-- Function para limpar tokens expirados
CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
RETURNS void AS $$
BEGIN
    DELETE FROM refresh_tokens 
    WHERE expires_at < CURRENT_TIMESTAMP 
       OR revoked = TRUE;
END;
$$ LANGUAGE plpgsql;

-- Criar job para limpeza automática (requer extensão pg_cron)
CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
    'cleanup-expired-tokens',
    '0 */4 * * *', -- A cada 4 horas
    $$SELECT cleanup_expired_tokens()$$
);
