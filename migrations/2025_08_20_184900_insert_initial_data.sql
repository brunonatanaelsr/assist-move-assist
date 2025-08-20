-- Migração para dados iniciais
-- Data: 2025-08-20 18:49:00

-- Configurações do sistema (se necessário)
CREATE TABLE IF NOT EXISTS configuracoes (
    chave VARCHAR(100) PRIMARY KEY,
    valor TEXT,
    descricao TEXT,
    data_criacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    data_atualizacao TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserir configurações padrão
INSERT INTO configuracoes (chave, valor, descricao) VALUES
('jwt_expiry', '24h', 'Tempo de expiração do token JWT'),
('refresh_token_expiry', '7d', 'Tempo de expiração do refresh token'),
('password_min_length', '6', 'Comprimento mínimo da senha'),
('max_login_attempts', '5', 'Número máximo de tentativas de login'),
('session_timeout', '15m', 'Timeout da sessão de usuário')
ON CONFLICT (chave) DO NOTHING;

-- Comentários
COMMENT ON TABLE configuracoes IS 'Configurações globais do sistema';
