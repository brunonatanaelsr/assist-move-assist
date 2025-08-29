DROP TABLE IF EXISTS projetos CASCADE;
CREATE TABLE projetos (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  data_inicio DATE,
  data_fim_prevista DATE,
  status VARCHAR(50) NOT NULL DEFAULT 'planejamento',
  responsavel_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  orcamento DECIMAL(12,2),
  local_execucao VARCHAR(255),
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  data_criacao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  data_atualizacao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_projetos_status ON projetos(status);
