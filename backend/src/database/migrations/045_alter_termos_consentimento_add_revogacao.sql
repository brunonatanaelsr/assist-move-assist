ALTER TABLE IF EXISTS termos_consentimento
  ADD COLUMN IF NOT EXISTS revogado_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS revogado_por INTEGER REFERENCES usuarios(id),
  ADD COLUMN IF NOT EXISTS revogacao_motivo TEXT;

CREATE INDEX IF NOT EXISTS idx_termos_revogado_em ON termos_consentimento(revogado_em);
