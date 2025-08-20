-- Migration: 2025_08_20_05_create_configuracoes_tables.sql

-- Configurações do Sistema
CREATE TABLE IF NOT EXISTS configuracoes_sistema (
    id SERIAL PRIMARY KEY,
    chave VARCHAR(100) UNIQUE NOT NULL,
    valor TEXT NOT NULL,
    descricao TEXT,
    tipo VARCHAR(20) NOT NULL, -- 'string', 'number', 'boolean', 'json'
    editavel BOOLEAN DEFAULT true,
    categoria VARCHAR(50) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Configurações de E-mail
CREATE TABLE IF NOT EXISTS configuracoes_email (
    id SERIAL PRIMARY KEY,
    tipo VARCHAR(50) NOT NULL, -- 'boas_vindas', 'recuperacao_senha', etc
    assunto VARCHAR(200) NOT NULL,
    corpo TEXT NOT NULL,
    ativo BOOLEAN DEFAULT true,
    variaveis JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Configurações de Notificação
CREATE TABLE IF NOT EXISTS configuracoes_notificacao (
    id SERIAL PRIMARY KEY,
    tipo VARCHAR(50) NOT NULL,
    titulo VARCHAR(200) NOT NULL,
    mensagem TEXT NOT NULL,
    ativo BOOLEAN DEFAULT true,
    canais JSONB NOT NULL DEFAULT '["email", "sistema"]'::jsonb,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Parâmetros do Sistema
CREATE TABLE IF NOT EXISTS parametros_sistema (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) UNIQUE NOT NULL,
    valor TEXT NOT NULL,
    padrao TEXT NOT NULL,
    descricao TEXT,
    tipo VARCHAR(20) NOT NULL,
    grupo VARCHAR(50) NOT NULL,
    requer_reinicio BOOLEAN DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Triggers para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Aplicar triggers em todas as tabelas
CREATE TRIGGER update_configuracoes_sistema_updated_at
    BEFORE UPDATE ON configuracoes_sistema
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_configuracoes_email_updated_at
    BEFORE UPDATE ON configuracoes_email
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_configuracoes_notificacao_updated_at
    BEFORE UPDATE ON configuracoes_notificacao
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_parametros_sistema_updated_at
    BEFORE UPDATE ON parametros_sistema
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Inserir configurações padrão
INSERT INTO configuracoes_sistema (chave, valor, descricao, tipo, categoria) VALUES
('SISTEMA_NOME', 'Move Marias', 'Nome do sistema', 'string', 'geral'),
('SISTEMA_VERSAO', '1.0.0', 'Versão do sistema', 'string', 'geral'),
('MAX_UPLOAD_SIZE', '5242880', 'Tamanho máximo de upload em bytes', 'number', 'arquivos'),
('ALLOWED_FILE_TYPES', '["pdf","jpg","jpeg","png","doc","docx"]', 'Tipos de arquivo permitidos', 'json', 'arquivos');

-- Índices
CREATE INDEX idx_config_sistema_chave ON configuracoes_sistema(chave);
CREATE INDEX idx_config_email_tipo ON configuracoes_email(tipo);
CREATE INDEX idx_config_notif_tipo ON configuracoes_notificacao(tipo);
CREATE INDEX idx_params_nome ON parametros_sistema(nome);
