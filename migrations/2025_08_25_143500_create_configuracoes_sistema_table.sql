-- Criar tabela de configurações do sistema
CREATE TABLE IF NOT EXISTS configuracoes_sistema (
    id SERIAL PRIMARY KEY,
    chave VARCHAR(100) UNIQUE NOT NULL,
    valor TEXT NOT NULL,
    descricao TEXT,
    tipo VARCHAR(20) NOT NULL DEFAULT 'string',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Inserir configurações padrão
INSERT INTO configuracoes_sistema (chave, valor, descricao, tipo) VALUES 
('nome_organizacao', 'Move Marias', 'Nome da organização', 'string'),
('email_organizacao', 'contato@movemarias.org', 'Email oficial', 'string'),
('telefone_organizacao', '(11) 3333-4444', 'Telefone oficial', 'string'),
('endereco_organizacao', 'Rua das Flores, 123', 'Endereço da sede', 'string'),
('max_beneficiarias', '1000', 'Máximo de beneficiárias', 'number'),
('backup_automatico', 'true', 'Backup automático habilitado', 'boolean'),
('notificacoes_email', 'true', 'Notificações por email', 'boolean')
ON CONFLICT (chave) DO NOTHING;

-- Índices
CREATE INDEX IF NOT EXISTS idx_configuracoes_sistema_chave ON configuracoes_sistema(chave);

-- Comentários
COMMENT ON TABLE configuracoes_sistema IS 'Configurações globais do sistema';
