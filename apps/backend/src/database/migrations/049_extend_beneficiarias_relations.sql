-- Amplia dados relacionados às beneficiárias: dependentes, informações socioeconômicas e foto

ALTER TABLE beneficiarias
  ADD COLUMN IF NOT EXISTS foto_filename TEXT,
  ADD COLUMN IF NOT EXISTS arquivada_em TIMESTAMP NULL;

CREATE TABLE IF NOT EXISTS beneficiaria_info_socioeconomica (
  beneficiaria_id INTEGER PRIMARY KEY REFERENCES beneficiarias(id) ON DELETE CASCADE,
  renda_familiar DECIMAL(10,2),
  quantidade_moradores INTEGER,
  tipo_moradia VARCHAR(120),
  escolaridade VARCHAR(120),
  profissao VARCHAR(120),
  situacao_trabalho VARCHAR(120),
  beneficios_sociais TEXT[] DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DROP TRIGGER IF EXISTS trg_beneficiaria_info_socioeconomica_updated_at ON beneficiaria_info_socioeconomica;
CREATE TRIGGER trg_beneficiaria_info_socioeconomica_updated_at
BEFORE UPDATE ON beneficiaria_info_socioeconomica
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS beneficiaria_dependentes (
  id SERIAL PRIMARY KEY,
  beneficiaria_id INTEGER NOT NULL REFERENCES beneficiarias(id) ON DELETE CASCADE,
  nome_completo VARCHAR(255) NOT NULL,
  data_nascimento DATE NOT NULL,
  parentesco VARCHAR(120) NOT NULL,
  cpf VARCHAR(11),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_beneficiaria_dependentes_beneficiaria
  ON beneficiaria_dependentes(beneficiaria_id);

DROP TRIGGER IF EXISTS trg_beneficiaria_dependentes_updated_at ON beneficiaria_dependentes;
CREATE TRIGGER trg_beneficiaria_dependentes_updated_at
BEFORE UPDATE ON beneficiaria_dependentes
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Registro mínimo para garantir consistência
UPDATE beneficiarias
SET updated_at = CURRENT_TIMESTAMP
WHERE foto_filename IS NULL;
