ALTER TABLE IF EXISTS formularios
  ADD COLUMN IF NOT EXISTS schema_version VARCHAR(50) NOT NULL DEFAULT 'v1',
  ADD COLUMN IF NOT EXISTS assinaturas JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE IF EXISTS anamnese_social
  ADD COLUMN IF NOT EXISTS schema_version VARCHAR(50) NOT NULL DEFAULT 'v1',
  ADD COLUMN IF NOT EXISTS assinaturas JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE IF EXISTS ficha_evolucao
  ADD COLUMN IF NOT EXISTS schema_version VARCHAR(50) NOT NULL DEFAULT 'v1',
  ADD COLUMN IF NOT EXISTS assinaturas JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE IF EXISTS termos_consentimento
  ADD COLUMN IF NOT EXISTS schema_version VARCHAR(50) NOT NULL DEFAULT 'v1',
  ADD COLUMN IF NOT EXISTS assinaturas JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_formularios_schema_version ON formularios(schema_version);
CREATE INDEX IF NOT EXISTS idx_anamnese_schema_version ON anamnese_social(schema_version);
CREATE INDEX IF NOT EXISTS idx_ficha_schema_version ON ficha_evolucao(schema_version);
CREATE INDEX IF NOT EXISTS idx_termos_schema_version ON termos_consentimento(schema_version);
