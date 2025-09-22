-- Tabela para armazenar Visão Holística das beneficiárias
CREATE TABLE IF NOT EXISTS visao_holistica (
  id SERIAL PRIMARY KEY,
  beneficiaria_id INTEGER NOT NULL,
  dados JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_visao_holistica_benef ON visao_holistica(beneficiaria_id);

