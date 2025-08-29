DROP TABLE IF EXISTS oficinas CASCADE;
CREATE TABLE oficinas (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  instrutor VARCHAR(255),
  data_inicio DATE NOT NULL,
  data_fim DATE,
  horario_inicio TIME,
  horario_fim TIME,
  local VARCHAR(255),
  vagas_total INTEGER DEFAULT 0,
  projeto_id INTEGER REFERENCES projetos(id) ON DELETE SET NULL,
  responsavel_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  status VARCHAR(50) DEFAULT 'ativa',
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  data_criacao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  data_atualizacao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_oficinas_status ON oficinas(status);
CREATE INDEX IF NOT EXISTS idx_oficinas_data ON oficinas(data_inicio, data_fim);
