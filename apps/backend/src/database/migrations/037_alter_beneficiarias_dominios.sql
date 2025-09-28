-- Migração 041: amplia dados de beneficiárias e cria estruturas relacionais
-- Permite modelar composição familiar e vulnerabilidades conforme especificação funcional

-- Campos adicionais diretamente na tabela principal (metadados civis e contatos estendidos)
ALTER TABLE beneficiarias
  ADD COLUMN IF NOT EXISTS codigo TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS rg VARCHAR(20),
  ADD COLUMN IF NOT EXISTS rg_orgao_emissor VARCHAR(50),
  ADD COLUMN IF NOT EXISTS rg_data_emissao DATE,
  ADD COLUMN IF NOT EXISTS nis VARCHAR(20),
  ADD COLUMN IF NOT EXISTS telefone_secundario VARCHAR(20),
  ADD COLUMN IF NOT EXISTS bairro VARCHAR(120),
  ADD COLUMN IF NOT EXISTS cidade VARCHAR(120),
  ADD COLUMN IF NOT EXISTS estado VARCHAR(2),
  ADD COLUMN IF NOT EXISTS cep VARCHAR(12),
  ADD COLUMN IF NOT EXISTS referencia_endereco TEXT,
  ADD COLUMN IF NOT EXISTS observacoes_socioeconomicas TEXT;

-- Sequência opcional para geração de códigos alfanuméricos
CREATE SEQUENCE IF NOT EXISTS beneficiarias_codigo_seq;

UPDATE beneficiarias
SET codigo = CONCAT('IMM-', TO_CHAR(nextval('beneficiarias_codigo_seq'), 'FM00000'))
WHERE codigo IS NULL;

ALTER TABLE beneficiarias
  ALTER COLUMN codigo SET NOT NULL,
  ALTER COLUMN codigo SET DEFAULT CONCAT('IMM-', TO_CHAR(nextval('beneficiarias_codigo_seq'), 'FM00000'));

-- Catálogo de vulnerabilidades (com slugs estáveis)
CREATE TABLE IF NOT EXISTS vulnerabilidades (
  id SERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  descricao TEXT NOT NULL
);

INSERT INTO vulnerabilidades (slug, descricao) VALUES
  ('nis', 'Beneficiária com NIS ativo'),
  ('desemprego', 'Situação de desemprego ou subemprego'),
  ('instabilidade_empregaticia', 'Instabilidade na renda ou ocupação'),
  ('dependencias', 'Dependência química na família'),
  ('crianca_adolescente', 'Responsável por criança ou adolescente'),
  ('idosos', 'Responsável por pessoa idosa'),
  ('pessoa_com_deficiencia', 'Pessoa com deficiência na composição familiar'),
  ('violencia', 'Histórico de violência ou medida protetiva')
ON CONFLICT (slug) DO NOTHING;

-- Relação N:N beneficiária <-> vulnerabilidades
CREATE TABLE IF NOT EXISTS beneficiaria_vulnerabilidades (
  beneficiaria_id INTEGER NOT NULL REFERENCES beneficiarias(id) ON DELETE CASCADE,
  vulnerabilidade_id INTEGER NOT NULL REFERENCES vulnerabilidades(id) ON DELETE CASCADE,
  apontada_em DATE DEFAULT CURRENT_DATE,
  PRIMARY KEY (beneficiaria_id, vulnerabilidade_id)
);

CREATE INDEX IF NOT EXISTS idx_beneficiaria_vulnerabilidades_benef ON beneficiaria_vulnerabilidades(beneficiaria_id);
CREATE INDEX IF NOT EXISTS idx_beneficiaria_vulnerabilidades_vuln ON beneficiaria_vulnerabilidades(vulnerabilidade_id);

-- Composição familiar (1:N)
CREATE TABLE IF NOT EXISTS beneficiaria_familiares (
  id SERIAL PRIMARY KEY,
  beneficiaria_id INTEGER NOT NULL REFERENCES beneficiarias(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  parentesco VARCHAR(80),
  data_nascimento DATE,
  trabalha BOOLEAN,
  renda_mensal DECIMAL(10,2),
  observacoes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_familiares_beneficiaria ON beneficiaria_familiares(beneficiaria_id);
