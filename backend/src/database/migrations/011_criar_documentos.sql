CREATE TABLE IF NOT EXISTS documentos (
  id SERIAL PRIMARY KEY,
  beneficiaria_id INTEGER NOT NULL,
  nome_arquivo TEXT NOT NULL,
  caminho_arquivo TEXT NOT NULL,
  tamanho BIGINT,
  mime_type TEXT,
  tipo_documento TEXT,
  categoria TEXT,
  status TEXT DEFAULT 'ativo',
  uploaded_by INTEGER,
  data_upload TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_documentos_beneficiaria ON documentos(beneficiaria_id);

CREATE TABLE IF NOT EXISTS documento_versoes (
  id SERIAL PRIMARY KEY,
  documento_id INTEGER NOT NULL REFERENCES documentos(id) ON DELETE CASCADE,
  numero_versao INTEGER NOT NULL,
  caminho_arquivo TEXT NOT NULL,
  tamanho BIGINT,
  modificado_por INTEGER,
  motivo_modificacao TEXT,
  data_modificacao TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_documento_versoes_doc ON documento_versoes(documento_id);

