-- Criação da tabela documentos

CREATE TABLE documentos (
  id SERIAL PRIMARY KEY,
  beneficiaria_id INTEGER NOT NULL REFERENCES beneficiarias(id) ON DELETE CASCADE,
  tipo VARCHAR(50) NOT NULL,
  nome VARCHAR(255) NOT NULL,
  url TEXT,
  ativo BOOLEAN DEFAULT TRUE,
  data_upload TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  data_atualizacao TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_documentos_beneficiaria_id ON documentos(beneficiaria_id);
CREATE INDEX idx_documentos_ativo ON documentos(ativo);
CREATE INDEX idx_documentos_tipo ON documentos(tipo);

-- Trigger para atualização automática da data_atualizacao
CREATE OR REPLACE FUNCTION update_documentos_data_atualizacao()
RETURNS TRIGGER AS $$
BEGIN
  NEW.data_atualizacao = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_documentos_update_data_atualizacao
BEFORE UPDATE ON documentos
FOR EACH ROW EXECUTE FUNCTION update_documentos_data_atualizacao();

COMMENT ON TABLE documentos IS 'Documentos vinculados às beneficiárias';
COMMENT ON COLUMN documentos.tipo IS 'Tipo do documento (por ex: RG, CPF, comprovante)';
COMMENT ON COLUMN documentos.url IS 'URL ou caminho do documento armazenado';
COMMENT ON COLUMN documentos.data_upload IS 'Data e hora do upload do documento';
