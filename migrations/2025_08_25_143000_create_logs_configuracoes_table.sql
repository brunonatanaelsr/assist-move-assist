-- Criar tabela de logs de configurações
CREATE TABLE logs_configuracoes (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
    entidade VARCHAR(50) NOT NULL,
    entidade_id VARCHAR(50) NOT NULL,
    acao VARCHAR(20) NOT NULL,
    dados_anteriores JSONB,
    dados_novos JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_logs_configuracoes_usuario ON logs_configuracoes(usuario_id);
CREATE INDEX idx_logs_configuracoes_entidade ON logs_configuracoes(entidade);
CREATE INDEX idx_logs_configuracoes_created_at ON logs_configuracoes(created_at);

COMMENT ON TABLE logs_configuracoes IS 'Registra alterações feitas nas configurações do sistema';
COMMENT ON COLUMN logs_configuracoes.usuario_id IS 'ID do usuário que fez a alteração';
COMMENT ON COLUMN logs_configuracoes.entidade IS 'Nome da entidade alterada (configuracoes_sistema, usuarios, perfis, permissoes)';
COMMENT ON COLUMN logs_configuracoes.entidade_id IS 'ID do registro alterado';
COMMENT ON COLUMN logs_configuracoes.acao IS 'Tipo de alteração (CREATE, UPDATE, DELETE)';
COMMENT ON COLUMN logs_configuracoes.dados_anteriores IS 'Estado anterior do registro em formato JSON';
COMMENT ON COLUMN logs_configuracoes.dados_novos IS 'Novo estado do registro em formato JSON';
COMMENT ON COLUMN logs_configuracoes.ip_address IS 'Endereço IP de onde partiu a alteração';
COMMENT ON COLUMN logs_configuracoes.user_agent IS 'User agent do navegador usado';
