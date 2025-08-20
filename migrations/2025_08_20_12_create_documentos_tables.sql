-- Migration: 2025_08_20_12_create_documentos_tables.sql

-- Enum para tipo de documento
CREATE TYPE tipo_documento AS ENUM (
    'contrato',
    'relatorio',
    'declaracao',
    'certificado',
    'prontuario',
    'avaliacao',
    'outro'
);

-- Enum para status de documento
CREATE TYPE status_documento AS ENUM (
    'rascunho',
    'pendente',
    'aprovado',
    'rejeitado',
    'arquivado',
    'cancelado'
);

-- Tabela principal de documentos
CREATE TABLE IF NOT EXISTS documentos (
    id SERIAL PRIMARY KEY,
    tipo tipo_documento NOT NULL,
    titulo VARCHAR(200) NOT NULL,
    descricao TEXT,
    conteudo TEXT,
    modelo_id INTEGER,
    criado_por INTEGER NOT NULL REFERENCES usuarios(id),
    beneficiaria_id INTEGER REFERENCES beneficiarias(id),
    projeto_id INTEGER REFERENCES projetos(id),
    oficina_id INTEGER REFERENCES oficinas(id),
    status status_documento NOT NULL DEFAULT 'rascunho',
    versao INTEGER NOT NULL DEFAULT 1,
    data_criacao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    data_aprovacao TIMESTAMP,
    aprovado_por INTEGER REFERENCES usuarios(id),
    tags TEXT[],
    metadados JSONB,
    
    CONSTRAINT check_versao CHECK (versao > 0)
);

-- Versões dos documentos
CREATE TABLE IF NOT EXISTS versoes_documento (
    id SERIAL PRIMARY KEY,
    documento_id INTEGER NOT NULL REFERENCES documentos(id) ON DELETE CASCADE,
    versao INTEGER NOT NULL,
    conteudo TEXT NOT NULL,
    alteracoes TEXT,
    criado_por INTEGER NOT NULL REFERENCES usuarios(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT unique_versao_documento UNIQUE (documento_id, versao)
);

-- Arquivos dos documentos
CREATE TABLE IF NOT EXISTS arquivos_documento (
    id SERIAL PRIMARY KEY,
    documento_id INTEGER NOT NULL REFERENCES documentos(id) ON DELETE CASCADE,
    nome_arquivo VARCHAR(200) NOT NULL,
    tipo_arquivo VARCHAR(100) NOT NULL,
    url VARCHAR(500) NOT NULL,
    tamanho INTEGER NOT NULL,
    hash_arquivo VARCHAR(64) NOT NULL,
    versao INTEGER NOT NULL,
    uploaded_por INTEGER NOT NULL REFERENCES usuarios(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT check_tamanho CHECK (tamanho > 0)
);

-- Modelos de documentos
CREATE TABLE IF NOT EXISTS modelos_documento (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(200) NOT NULL,
    descricao TEXT,
    tipo tipo_documento NOT NULL,
    conteudo TEXT NOT NULL,
    variaveis JSONB,
    criado_por INTEGER NOT NULL REFERENCES usuarios(id),
    ativo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Assinaturas de documentos
CREATE TABLE IF NOT EXISTS assinaturas_documento (
    id SERIAL PRIMARY KEY,
    documento_id INTEGER NOT NULL REFERENCES documentos(id) ON DELETE CASCADE,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
    tipo_assinatura VARCHAR(50) NOT NULL,
    data_assinatura TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ip_assinatura VARCHAR(45),
    certificado_digital TEXT,
    hash_documento VARCHAR(64) NOT NULL
);

-- Compartilhamentos de documentos
CREATE TABLE IF NOT EXISTS compartilhamentos_documento (
    id SERIAL PRIMARY KEY,
    documento_id INTEGER NOT NULL REFERENCES documentos(id) ON DELETE CASCADE,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
    tipo_acesso VARCHAR(50) NOT NULL DEFAULT 'leitura',
    data_inicio TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    data_fim TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT check_datas CHECK (
        data_fim IS NULL OR data_fim > data_inicio
    )
);

-- Histórico de ações em documentos
CREATE TABLE IF NOT EXISTS historico_documento (
    id SERIAL PRIMARY KEY,
    documento_id INTEGER NOT NULL REFERENCES documentos(id) ON DELETE CASCADE,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
    acao VARCHAR(50) NOT NULL,
    descricao TEXT NOT NULL,
    metadados JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Triggers para atualização automática
CREATE TRIGGER update_documentos_updated_at
    BEFORE UPDATE ON documentos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_modelos_documento_updated_at
    BEFORE UPDATE ON modelos_documento
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Função para registrar histórico
CREATE OR REPLACE FUNCTION registrar_historico_documento()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO historico_documento (
        documento_id,
        usuario_id,
        acao,
        descricao,
        metadados
    ) VALUES (
        NEW.id,
        CASE TG_OP
            WHEN 'INSERT' THEN NEW.criado_por
            ELSE NEW.aprovado_por
        END,
        CASE TG_OP
            WHEN 'INSERT' THEN 'criacao'
            WHEN 'UPDATE' THEN
                CASE
                    WHEN NEW.status != OLD.status THEN 'mudanca_status'
                    ELSE 'atualizacao'
                END
            ELSE 'exclusao'
        END,
        CASE TG_OP
            WHEN 'INSERT' THEN 'Documento criado'
            WHEN 'UPDATE' THEN
                CASE
                    WHEN NEW.status != OLD.status 
                    THEN 'Status alterado de ' || OLD.status || ' para ' || NEW.status
                    ELSE 'Documento atualizado'
                END
            ELSE 'Documento excluído'
        END,
        CASE TG_OP
            WHEN 'UPDATE' THEN jsonb_build_object(
                'status_anterior', OLD.status,
                'status_novo', NEW.status,
                'versao_anterior', OLD.versao,
                'versao_nova', NEW.versao
            )
            ELSE NULL
        END
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_registrar_historico_documento
    AFTER INSERT OR UPDATE ON documentos
    FOR EACH ROW
    EXECUTE FUNCTION registrar_historico_documento();

-- Função para verificar permissões de acesso
CREATE OR REPLACE FUNCTION verificar_acesso_documento(
    p_documento_id INTEGER,
    p_usuario_id INTEGER
) RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM compartilhamentos_documento
        WHERE documento_id = p_documento_id
        AND usuario_id = p_usuario_id
        AND (data_fim IS NULL OR data_fim > CURRENT_TIMESTAMP)
    ) OR EXISTS (
        SELECT 1
        FROM documentos d
        WHERE d.id = p_documento_id
        AND (d.criado_por = p_usuario_id OR d.aprovado_por = p_usuario_id)
    );
END;
$$ LANGUAGE plpgsql;

-- Índices
CREATE INDEX idx_documentos_tipo ON documentos(tipo);
CREATE INDEX idx_documentos_status ON documentos(status);
CREATE INDEX idx_documentos_criador ON documentos(criado_por);
CREATE INDEX idx_documentos_beneficiaria ON documentos(beneficiaria_id);
CREATE INDEX idx_documentos_projeto ON documentos(projeto_id);
CREATE INDEX idx_documentos_oficina ON documentos(oficina_id);
CREATE INDEX idx_versoes_documento ON versoes_documento(documento_id);
CREATE INDEX idx_arquivos_documento ON arquivos_documento(documento_id);
CREATE INDEX idx_modelos_documento_tipo ON modelos_documento(tipo);
CREATE INDEX idx_assinaturas_documento ON assinaturas_documento(documento_id);
CREATE INDEX idx_compartilhamentos_documento ON compartilhamentos_documento(documento_id);
CREATE INDEX idx_historico_documento ON historico_documento(documento_id);
