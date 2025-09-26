DROP TABLE IF EXISTS beneficiarias CASCADE;
CREATE TABLE beneficiarias (
  id SERIAL PRIMARY KEY,
  nome_completo VARCHAR(255) NOT NULL,
  cpf VARCHAR(14) UNIQUE NOT NULL,
  data_nascimento DATE NOT NULL,
  telefone VARCHAR(20),
  email VARCHAR(255),
  endereco TEXT,
  estado_civil VARCHAR(50),
  escolaridade VARCHAR(50),
  renda_familiar DECIMAL(10,2),
  num_dependentes INTEGER DEFAULT 0,
  situacao_moradia VARCHAR(100),
  historico_violencia TEXT,
  tipo_violencia TEXT[] DEFAULT '{}',
  medida_protetiva BOOLEAN DEFAULT FALSE,
  acompanhamento_juridico BOOLEAN DEFAULT FALSE,
  acompanhamento_psicologico BOOLEAN DEFAULT FALSE,
  status VARCHAR(50) DEFAULT 'ativa',
  observacoes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL
);

CREATE INDEX IF NOT EXISTS idx_beneficiarias_cpf ON beneficiarias(cpf);
CREATE INDEX IF NOT EXISTS idx_beneficiarias_nome ON beneficiarias(nome_completo);
CREATE INDEX IF NOT EXISTS idx_beneficiarias_status ON beneficiarias(status);
