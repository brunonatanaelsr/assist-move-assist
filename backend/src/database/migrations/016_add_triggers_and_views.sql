-- Trigger to keep updated_at in beneficiarias
CREATE OR REPLACE FUNCTION update_beneficiaria_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_beneficiaria_timestamp'
  ) THEN
    CREATE TRIGGER update_beneficiaria_timestamp
    BEFORE UPDATE ON beneficiarias
    FOR EACH ROW
    EXECUTE FUNCTION update_beneficiaria_updated_at();
  END IF;
END $$;

-- Views for quick stats (safe create or replace)
CREATE OR REPLACE VIEW vw_beneficiarias_ativas AS
SELECT 
  id,
  nome_completo,
  cpf,
  telefone,
  email,
  status,
  medida_protetiva,
  acompanhamento_juridico,
  acompanhamento_psicologico,
  created_at,
  updated_at
FROM beneficiarias
WHERE deleted_at IS NULL AND status = 'ativa';

CREATE OR REPLACE VIEW vw_beneficiarias_estatisticas AS
SELECT
  COUNT(*) as total_beneficiarias,
  COUNT(*) FILTER (WHERE status = 'ativa') as ativas,
  COUNT(*) FILTER (WHERE status = 'em_acompanhamento') as em_acompanhamento,
  COUNT(*) FILTER (WHERE status = 'inativa') as inativas,
  COUNT(*) FILTER (WHERE medida_protetiva = true) as com_medida_protetiva,
  COUNT(*) FILTER (WHERE acompanhamento_juridico = true) as acompanhamento_juridico,
  COUNT(*) FILTER (WHERE acompanhamento_psicologico = true) as acompanhamento_psicologico,
  ROUND(AVG(num_dependentes) FILTER (WHERE num_dependentes IS NOT NULL), 2) as media_dependentes,
  ROUND(AVG(renda_familiar) FILTER (WHERE renda_familiar IS NOT NULL), 2) as media_renda_familiar
FROM beneficiarias
WHERE deleted_at IS NULL;

