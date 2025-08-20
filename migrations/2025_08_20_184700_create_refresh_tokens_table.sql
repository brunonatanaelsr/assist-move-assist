-- Migração para criar a tabela de refresh tokens
-- Data: 2025-08-20 18:47:00

-- Criar tabela refresh_tokens
CREATE TABLE refresh_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    token_hash VARCHAR(64) NOT NULL,
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    revoked_at TIMESTAMP WITH TIME ZONE,
    is_revoked BOOLEAN NOT NULL DEFAULT false,
    
    -- Foreign Key
    CONSTRAINT fk_refresh_tokens_user_id 
        FOREIGN KEY (user_id) 
        REFERENCES usuarios(id) 
        ON DELETE CASCADE,
        
    -- Constraints
    CONSTRAINT token_hash_length CHECK (LENGTH(token_hash) = 64),
    CONSTRAINT expires_at_future CHECK (expires_at > created_at)
);

-- Índices para performance
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
CREATE INDEX idx_refresh_tokens_is_revoked ON refresh_tokens(is_revoked);
CREATE INDEX idx_refresh_tokens_created_at ON refresh_tokens(created_at);

-- Índice composto para consultas ativas
CREATE INDEX idx_refresh_tokens_active ON refresh_tokens(user_id, is_revoked, expires_at) 
WHERE is_revoked = false AND expires_at > NOW();

-- Índice para limpeza de tokens expirados
CREATE INDEX idx_refresh_tokens_expired ON refresh_tokens(expires_at) 
WHERE is_revoked = false;

-- Comentários na tabela
COMMENT ON TABLE refresh_tokens IS 'Tabela de tokens de refresh para autenticação';
COMMENT ON COLUMN refresh_tokens.id IS 'Identificador único do token';
COMMENT ON COLUMN refresh_tokens.user_id IS 'ID do usuário proprietário do token';
COMMENT ON COLUMN refresh_tokens.token_hash IS 'Hash SHA-256 do refresh token';
COMMENT ON COLUMN refresh_tokens.ip_address IS 'Endereço IP da requisição que gerou o token';
COMMENT ON COLUMN refresh_tokens.user_agent IS 'User-Agent do cliente que gerou o token';
COMMENT ON COLUMN refresh_tokens.expires_at IS 'Data de expiração do token';
COMMENT ON COLUMN refresh_tokens.created_at IS 'Data de criação do token';
COMMENT ON COLUMN refresh_tokens.revoked_at IS 'Data de revogação do token';
COMMENT ON COLUMN refresh_tokens.is_revoked IS 'Status de revogação do token';

-- Função para revogar token
CREATE OR REPLACE FUNCTION revoke_refresh_token(token_id INTEGER)
RETURNS VOID AS $$
BEGIN
    UPDATE refresh_tokens 
    SET is_revoked = true, revoked_at = NOW()
    WHERE id = token_id AND is_revoked = false;
END;
$$ LANGUAGE plpgsql;

-- Função para limpar tokens expirados (para job de limpeza)
CREATE OR REPLACE FUNCTION cleanup_expired_refresh_tokens()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM refresh_tokens 
    WHERE expires_at < NOW() - INTERVAL '1 day';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- View para tokens ativos
CREATE VIEW active_refresh_tokens AS
SELECT 
    rt.*,
    u.nome as user_name,
    u.email as user_email
FROM refresh_tokens rt
JOIN usuarios u ON rt.user_id = u.id
WHERE rt.is_revoked = false 
  AND rt.expires_at > NOW()
  AND u.ativo = true;

COMMENT ON VIEW active_refresh_tokens IS 'View dos tokens de refresh ativos';
