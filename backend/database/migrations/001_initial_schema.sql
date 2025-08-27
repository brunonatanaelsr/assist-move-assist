-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Criar enum para status da beneficiária
CREATE TYPE status_beneficiaria AS ENUM ('ativa', 'inativa', 'em_acompanhamento');

-- Criar tabela de beneficiárias
CREATE TABLE IF NOT EXISTS beneficiarias (
  id SERIAL PRIMARY KEY,
  nome_completo VARCHAR(255) NOT NULL,
  cpf VARCHAR(14) NOT NULL UNIQUE,
  data_nascimento DATE NOT NULL,
  telefone VARCHAR(20),
  email VARCHAR(255),
  endereco TEXT,
  estado_civil VARCHAR(50),
  escolaridade VARCHAR(100),
  renda_familiar DECIMAL(10,2),
  num_dependentes INTEGER,
  situacao_moradia VARCHAR(100),
  historico_violencia TEXT,
  tipo_violencia TEXT[], -- Array de tipos de violência
  medida_protetiva BOOLEAN DEFAULT false,
  acompanhamento_juridico BOOLEAN DEFAULT false,
  acompanhamento_psicologico BOOLEAN DEFAULT false,
  status status_beneficiaria NOT NULL DEFAULT 'ativa',
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Criar tabela de histórico de status
CREATE TABLE IF NOT EXISTS historico_status_beneficiaria (
  id SERIAL PRIMARY KEY,
  beneficiaria_id INTEGER NOT NULL REFERENCES beneficiarias(id),
  status_anterior status_beneficiaria,
  status_novo status_beneficiaria NOT NULL,
  observacao TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_beneficiaria 
    FOREIGN KEY(beneficiaria_id) 
    REFERENCES beneficiarias(id) 
    ON DELETE CASCADE
);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_beneficiarias_nome ON beneficiarias(nome_completo);
CREATE INDEX IF NOT EXISTS idx_beneficiarias_cpf ON beneficiarias(cpf);
CREATE INDEX IF NOT EXISTS idx_beneficiarias_status ON beneficiarias(status);
CREATE INDEX IF NOT EXISTS idx_beneficiarias_deleted_at ON beneficiarias(deleted_at);

-- Criar índice GIN para busca em array de tipos de violência
CREATE INDEX IF NOT EXISTS idx_beneficiarias_tipo_violencia ON beneficiarias USING gin(tipo_violencia);

-- Criar índice de texto para busca
CREATE INDEX IF NOT EXISTS idx_beneficiarias_busca_texto ON beneficiarias 
USING gin((
  nome_completo || ' ' || 
  COALESCE(cpf, '') || ' ' || 
  COALESCE(email, '') || ' ' || 
  COALESCE(endereco, '')
) gin_trgm_ops);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_beneficiaria_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_beneficiaria_timestamp
  BEFORE UPDATE ON beneficiarias
  FOR EACH ROW
  EXECUTE FUNCTION update_beneficiaria_updated_at();

-- Views úteis
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
