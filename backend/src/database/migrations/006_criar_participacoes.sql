DROP TABLE IF EXISTS participacoes CASCADE;
CREATE TABLE participacoes (
  id SERIAL PRIMARY KEY,
  projeto_id INTEGER REFERENCES projetos(id) ON DELETE CASCADE,
  beneficiaria_id INTEGER REFERENCES beneficiarias(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL DEFAULT 'inscrita',
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  data_inscricao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_participacoes_projeto ON participacoes(projeto_id);
CREATE INDEX IF NOT EXISTS idx_participacoes_beneficiaria ON participacoes(beneficiaria_id);
CREATE INDEX IF NOT EXISTS idx_participacoes_status ON participacoes(status);
