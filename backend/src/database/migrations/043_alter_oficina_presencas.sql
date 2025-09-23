-- Migração 043: normaliza presenças por encontro (data)

-- Garante coluna de data específica para cada encontro
ALTER TABLE oficina_presencas
  ADD COLUMN IF NOT EXISTS data_encontro DATE;

UPDATE oficina_presencas
SET data_encontro = COALESCE(data_encontro, DATE(data_registro));

ALTER TABLE oficina_presencas
  ALTER COLUMN data_encontro SET NOT NULL;

-- Ajusta unicidade para considerar a data do encontro
ALTER TABLE oficina_presencas
  DROP CONSTRAINT IF EXISTS oficina_presencas_oficina_id_beneficiaria_id_key;

ALTER TABLE oficina_presencas
  ADD CONSTRAINT oficina_presencas_unq_encontro UNIQUE (oficina_id, beneficiaria_id, data_encontro);

-- Índices auxiliares
CREATE INDEX IF NOT EXISTS idx_oficina_presencas_data_encontro ON oficina_presencas(data_encontro DESC);
