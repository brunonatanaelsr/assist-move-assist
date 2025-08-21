-- Criar tabela de configurações do sistema
CREATE TABLE configuracoes_sistema (
    chave VARCHAR(100) PRIMARY KEY,
    valor TEXT NOT NULL,
    tipo VARCHAR(20) NOT NULL,
    descricao TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Inserir algumas configurações iniciais
INSERT INTO configuracoes_sistema (chave, valor, tipo, descricao) VALUES
('max_tamanho_arquivo', '10485760', 'number', 'Tamanho máximo de arquivo em bytes (10MB)'),
('tipos_arquivo_permitidos', 'jpg,jpeg,png,pdf,doc,docx', 'string', 'Extensões de arquivo permitidas para upload'),
('max_notificacoes_usuario', '100', 'number', 'Número máximo de notificações por usuário'),
('tempo_expiracao_token', '86400', 'number', 'Tempo de expiração do token em segundos (24h)');

COMMENT ON TABLE configuracoes_sistema IS 'Armazena as configurações globais do sistema';
COMMENT ON COLUMN configuracoes_sistema.chave IS 'Identificador único da configuração';
COMMENT ON COLUMN configuracoes_sistema.valor IS 'Valor da configuração';
COMMENT ON COLUMN configuracoes_sistema.tipo IS 'Tipo do valor (string, number, boolean, json)';
COMMENT ON COLUMN configuracoes_sistema.descricao IS 'Descrição da configuração';
