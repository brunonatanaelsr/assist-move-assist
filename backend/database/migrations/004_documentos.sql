-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enums para tipos de documentos
CREATE TYPE documento_categoria AS ENUM (
  'PESSOAL', 'SAUDE', 'EDUCACAO', 'JURIDICO', 'OUTROS'
);

CREATE TYPE documento_tipo AS ENUM (
  'RG', 'CPF', 'COMP_RESIDENCIA', 'ATESTADO_MEDICO', 
  'HISTORICO_ESCOLAR', 'CERTIDAO', 'OUTROS'
);

-- Tabela principal de documentos
CREATE TABLE documentos (
    id SERIAL PRIMARY KEY,
    beneficiaria_id INTEGER NOT NULL REFERENCES beneficiarias(id),
    nome_arquivo TEXT NOT NULL,
    tipo_documento documento_tipo NOT NULL,
    categoria documento_categoria NOT NULL,
    caminho_arquivo TEXT NOT NULL,
    tamanho BIGINT NOT NULL,
    mime_type TEXT NOT NULL,
    hash_arquivo TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    status TEXT DEFAULT 'ativo' CHECK (status IN ('ativo', 'removido')),
    uploaded_by INTEGER NOT NULL REFERENCES usuarios(id),
    data_upload TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    data_remocao TIMESTAMP WITH TIME ZONE,
    UNIQUE(beneficiaria_id, nome_arquivo)
);

-- Tabela de versões de documentos
CREATE TABLE documento_versoes (
    id SERIAL PRIMARY KEY,
    documento_id INTEGER NOT NULL REFERENCES documentos(id),
    numero_versao INTEGER NOT NULL,
    caminho_arquivo TEXT NOT NULL,
    tamanho BIGINT NOT NULL,
    hash_arquivo TEXT NOT NULL,
    modificado_por INTEGER NOT NULL REFERENCES usuarios(id),
    data_modificacao TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    motivo_modificacao TEXT,
    metadata JSONB DEFAULT '{}',
    UNIQUE(documento_id, numero_versao)
);

-- Tabela de acessos aos documentos
CREATE TABLE documento_acessos (
    id SERIAL PRIMARY KEY,
    documento_id INTEGER NOT NULL REFERENCES documentos(id),
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
    tipo_acesso TEXT NOT NULL CHECK (tipo_acesso IN ('visualizacao', 'download', 'modificacao')),
    data_acesso TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ip_address TEXT,
    user_agent TEXT
);

-- Índices para otimização
CREATE INDEX idx_documentos_beneficiaria ON documentos(beneficiaria_id);
CREATE INDEX idx_documentos_tipo ON documentos(tipo_documento);
CREATE INDEX idx_documentos_status ON documentos(status);
CREATE INDEX idx_documentos_data ON documentos(data_upload);
CREATE INDEX idx_documento_versoes_doc ON documento_versoes(documento_id, numero_versao);
CREATE INDEX idx_documento_acessos_doc ON documento_acessos(documento_id);
CREATE INDEX idx_documento_acessos_data ON documento_acessos(data_acesso);

-- Função para registrar acesso
CREATE OR REPLACE FUNCTION registrar_acesso_documento(
    p_documento_id INTEGER,
    p_usuario_id INTEGER,
    p_tipo_acesso TEXT,
    p_ip_address TEXT,
    p_user_agent TEXT
) RETURNS void AS $$
BEGIN
    INSERT INTO documento_acessos (
        documento_id, usuario_id, tipo_acesso, ip_address, user_agent
    ) VALUES (
        p_documento_id, p_usuario_id, p_tipo_acesso, p_ip_address, p_user_agent
    );
END;
$$ LANGUAGE plpgsql;

-- Trigger para audit log
CREATE OR REPLACE FUNCTION documento_audit_trigger()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_logs (
        tabela,
        operacao,
        registro_id,
        dados_antigos,
        dados_novos,
        usuario_id,
        ip_address,
        data_operacao
    ) VALUES (
        'documentos',
        TG_OP,
        NEW.id,
        CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END,
        CASE WHEN TG_OP != 'DELETE' THEN row_to_json(NEW) ELSE NULL END,
        CASE 
            WHEN TG_OP = 'INSERT' THEN NEW.uploaded_by
            WHEN TG_OP = 'UPDATE' THEN NEW.uploaded_by
            ELSE OLD.uploaded_by
        END,
        current_setting('request.headers', true)::json->>'x-forwarded-for',
        CURRENT_TIMESTAMP
    );
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER documentos_audit
AFTER INSERT OR UPDATE OR DELETE ON documentos
FOR EACH ROW EXECUTE FUNCTION documento_audit_trigger();

-- Função para cleanup de arquivos órfãos
CREATE OR REPLACE FUNCTION cleanup_documentos_orfaos()
RETURNS void AS $$
BEGIN
    -- Marcar documentos como removidos quando beneficiária for removida
    UPDATE documentos d
    SET 
        status = 'removido',
        data_remocao = CURRENT_TIMESTAMP
    FROM beneficiarias b
    WHERE 
        d.beneficiaria_id = b.id 
        AND b.status = 'removido'
        AND d.status = 'ativo';

    -- Registrar no log
    INSERT INTO audit_logs (
        tabela,
        operacao,
        detalhes,
        data_operacao
    ) VALUES (
        'documentos',
        'CLEANUP',
        'Cleanup automático de documentos órfãos',
        CURRENT_TIMESTAMP
    );
END;
$$ LANGUAGE plpgsql;
