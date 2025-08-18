-- Adicionar novas colunas à tabela documentos
ALTER TABLE documentos
ADD COLUMN IF NOT EXISTS mime_type VARCHAR(100),
ADD COLUMN IF NOT EXISTS tamanho_bytes BIGINT,
ADD COLUMN IF NOT EXISTS hash_arquivo VARCHAR(64),
ADD COLUMN IF NOT EXISTS caminho_arquivo VARCHAR(255),
ADD COLUMN IF NOT EXISTS versao INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS usuario_upload_id INTEGER REFERENCES usuarios(id),
ADD COLUMN IF NOT EXISTS meta_dados JSONB;

-- Criar índices para as novas colunas
CREATE INDEX IF NOT EXISTS idx_documentos_hash ON documentos(hash_arquivo);
CREATE INDEX IF NOT EXISTS idx_documentos_meta_dados ON documentos USING GIN (meta_dados);

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

-- Índice para a tabela de versões
CREATE INDEX IF NOT EXISTS idx_versoes_documento ON versoes_documentos(documento_id, versao);

-- Atualizar os triggers existentes
CREATE OR REPLACE FUNCTION update_documento_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.data_atualizacao = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Criar função para gerenciar versões de documentos
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

-- Adicionar os triggers
DROP TRIGGER IF EXISTS trigger_update_documento_timestamp ON documentos;
CREATE TRIGGER trigger_update_documento_timestamp
    BEFORE UPDATE ON documentos
    FOR EACH ROW
    EXECUTE FUNCTION update_documento_timestamp();

DROP TRIGGER IF EXISTS trigger_versao_documento ON documentos;
CREATE TRIGGER trigger_versao_documento
    BEFORE UPDATE ON documentos
    FOR EACH ROW
    EXECUTE FUNCTION criar_versao_documento();
