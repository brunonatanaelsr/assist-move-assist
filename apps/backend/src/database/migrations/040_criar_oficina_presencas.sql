-- Migração: criar tabela oficina_presencas
CREATE TABLE IF NOT EXISTS oficina_presencas (
  id SERIAL PRIMARY KEY,
  oficina_id INTEGER NOT NULL REFERENCES oficinas(id) ON DELETE CASCADE,
  beneficiaria_id INTEGER NOT NULL REFERENCES beneficiarias(id) ON DELETE CASCADE,
  presente BOOLEAN NOT NULL DEFAULT FALSE,
  observacoes TEXT,
  data_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (oficina_id, beneficiaria_id)
);

CREATE INDEX IF NOT EXISTS idx_oficina_presencas_oficina_id ON oficina_presencas(oficina_id);
CREATE INDEX IF NOT EXISTS idx_oficina_presencas_beneficiaria_id ON oficina_presencas(beneficiaria_id);
