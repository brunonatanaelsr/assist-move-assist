-- Criar tabela de notificações do sistema
CREATE TABLE notificacoes (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
    tipo VARCHAR(50) NOT NULL,
    titulo VARCHAR(255) NOT NULL,
    mensagem TEXT NOT NULL,
    lida BOOLEAN DEFAULT FALSE,
    dados JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Criar índice para melhorar performance de busca por usuário
CREATE INDEX idx_notificacoes_usuario ON notificacoes(usuario_id);

-- Criar índice para melhorar performance de busca por notificações não lidas
CREATE INDEX idx_notificacoes_nao_lidas ON notificacoes(usuario_id, lida) WHERE lida = FALSE;

COMMENT ON TABLE notificacoes IS 'Armazena as notificações do sistema para os usuários';
COMMENT ON COLUMN notificacoes.tipo IS 'Tipo da notificação (ex: sistema, oficina, mensagem)';
COMMENT ON COLUMN notificacoes.dados IS 'Dados adicionais da notificação em formato JSON';
