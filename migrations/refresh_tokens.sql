-- Criação da tabela de refresh tokens
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    token_version INTEGER NOT NULL DEFAULT 0,
    token_hash TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT refresh_tokens_user_id_fk FOREIGN KEY (user_id) 
        REFERENCES usuarios(id) ON DELETE CASCADE
);

-- Índices para otimização
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);

-- Adiciona coluna para versão do token na tabela de usuários
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 0;

-- Função para limpar tokens expirados
CREATE OR REPLACE FUNCTION cleanup_expired_refresh_tokens()
RETURNS void AS $$
BEGIN
    DELETE FROM refresh_tokens WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Criar um job para limpar tokens expirados diariamente
CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule('cleanup_expired_tokens', '0 0 * * *', $$
    SELECT cleanup_expired_refresh_tokens();
$$);
