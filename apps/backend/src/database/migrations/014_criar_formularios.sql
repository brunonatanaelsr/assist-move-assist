CREATE TABLE IF NOT EXISTS anamnese_social (
  id SERIAL PRIMARY KEY,
  beneficiaria_id INTEGER NOT NULL,
  dados JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ficha_evolucao (
  id SERIAL PRIMARY KEY,
  beneficiaria_id INTEGER NOT NULL,
  dados JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS termos_consentimento (
  id SERIAL PRIMARY KEY,
  beneficiaria_id INTEGER NOT NULL,
  dados JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_anamnese_benef ON anamnese_social(beneficiaria_id);
CREATE INDEX IF NOT EXISTS idx_evolucao_benef ON ficha_evolucao(beneficiaria_id);
CREATE INDEX IF NOT EXISTS idx_termos_benef ON termos_consentimento(beneficiaria_id);

