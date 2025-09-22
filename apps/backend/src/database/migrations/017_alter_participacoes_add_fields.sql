ALTER TABLE participacoes
  ADD COLUMN IF NOT EXISTS observacoes TEXT,
  ADD COLUMN IF NOT EXISTS presenca_percentual INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS certificado_emitido BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS data_conclusao TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS data_atualizacao TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Optional trigger to auto-update data_atualizacao
CREATE OR REPLACE FUNCTION trg_participacoes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.data_atualizacao = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_participacoes_updated_at'
  ) THEN
    CREATE TRIGGER trigger_participacoes_updated_at
    BEFORE UPDATE ON participacoes
    FOR EACH ROW EXECUTE FUNCTION trg_participacoes_updated_at();
  END IF;
END $$;

