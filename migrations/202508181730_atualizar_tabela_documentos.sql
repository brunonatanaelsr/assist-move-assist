-- Criar tipos ENUM para documentos
CREATE TYPE tipo_documento AS ENUM (
    'RG',
    'CPF',
    'COMPROVANTE_RESIDENCIA',
    'ATESTADO_MEDICO',
    'DECLARACAO',
    'TERMO_COMPROMISSO',
    'FOTO',
    'OUTROS'
);

-- Criar tabela de documentos
CREATE TABLE IF NOT EXISTS documentos (
    id SERIAL PRIMARY KEY,
    beneficiaria_id INTEGER NOT NULL REFERENCES beneficiarias(id),
    tipo tipo_documento NOT NULL,
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    mime_type VARCHAR(100) NOT NULL,
    tamanho_bytes BIGINT NOT NULL,
    hash_arquivo VARCHAR(64) NOT NULL,
    caminho_arquivo VARCHAR(255) NOT NULL,
    versao INTEGER DEFAULT 1,
    data_upload TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    usuario_upload_id INTEGER REFERENCES usuarios(id),
    meta_dados JSONB,
    ativo BOOLEAN DEFAULT true,
    CONSTRAINT uk_documento_hash UNIQUE (hash_arquivo)
);

-- Criar tabela para versionamento de documentos
CREATE TABLE IF NOT EXISTS versoes_documentos (
    id SERIAL PRIMARY KEY,
    documento_id INTEGER NOT NULL REFERENCES documentos(id),
    versao INTEGER NOT NULL,
    hash_arquivo VARCHAR(64) NOT NULL,
    caminho_arquivo VARCHAR(255) NOT NULL,
    tamanho_bytes BIGINT NOT NULL,
    data_upload TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    usuario_upload_id INTEGER REFERENCES usuarios(id),
    motivo_alteracao TEXT,
    ativo BOOLEAN DEFAULT true,
    CONSTRAINT uk_versao_documento UNIQUE (documento_id, versao)
);

-- Índices para otimização
CREATE INDEX IF NOT EXISTS idx_documentos_beneficiaria ON documentos(beneficiaria_id);
CREATE INDEX IF NOT EXISTS idx_documentos_tipo ON documentos(tipo);
CREATE INDEX IF NOT EXISTS idx_documentos_data_upload ON documentos(data_upload);
CREATE INDEX IF NOT EXISTS idx_documentos_hash ON documentos(hash_arquivo);
CREATE INDEX IF NOT EXISTS idx_versoes_documento ON versoes_documentos(documento_id, versao);
CREATE INDEX IF NOT EXISTS idx_documentos_meta_dados ON documentos USING GIN (meta_dados);

-- Função para atualizar data_atualizacao
CREATE OR REPLACE FUNCTION update_documento_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.data_atualizacao = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para atualizar timestamp
CREATE TRIGGER trigger_update_documento_timestamp
    BEFORE UPDATE ON documentos
    FOR EACH ROW
    EXECUTE FUNCTION update_documento_timestamp();

-- Função para gerenciar versões de documentos
CREATE OR REPLACE FUNCTION criar_versao_documento()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'UPDATE' AND 
        (OLD.hash_arquivo != NEW.hash_arquivo OR OLD.caminho_arquivo != NEW.caminho_arquivo)) THEN
        
        INSERT INTO versoes_documentos (
            documento_id,
            versao,
            hash_arquivo,
            caminho_arquivo,
            tamanho_bytes,
            usuario_upload_id,
            motivo_alteracao
        ) VALUES (
            NEW.id,
            NEW.versao,
            NEW.hash_arquivo,
            NEW.caminho_arquivo,
            NEW.tamanho_bytes,
            NEW.usuario_upload_id,
            'Atualização de arquivo'
        );
        
        NEW.versao = NEW.versao + 1;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para gerenciar versões
CREATE TRIGGER trigger_versao_documento
    BEFORE UPDATE ON documentos
    FOR EACH ROW
    EXECUTE FUNCTION criar_versao_documento();

-- Comentários nas tabelas e colunas
COMMENT ON TABLE documentos IS 'Documentos digitais das beneficiárias';
COMMENT ON COLUMN documentos.tipo IS 'Tipo do documento (RG, CPF, etc)';
COMMENT ON COLUMN documentos.mime_type IS 'Tipo MIME do arquivo';
COMMENT ON COLUMN documentos.hash_arquivo IS 'Hash SHA-256 do arquivo para verificação de integridade';
COMMENT ON COLUMN documentos.meta_dados IS 'Metadados adicionais do documento em formato JSON';

COMMENT ON TABLE versoes_documentos IS 'Histórico de versões dos documentos';
COMMENT ON COLUMN versoes_documentos.versao IS 'Número da versão do documento';
COMMENT ON COLUMN versoes_documentos.motivo_alteracao IS 'Motivo da alteração da versão';
