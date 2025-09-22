DROP TABLE IF EXISTS historico_status_beneficiaria;
CREATE TABLE historico_status_beneficiaria (
  id SERIAL PRIMARY KEY,
  beneficiaria_id INTEGER REFERENCES beneficiarias(id) ON DELETE CASCADE,
  status_anterior VARCHAR(50),
  status_novo VARCHAR(50) NOT NULL,
  observacao TEXT,
  data_registro TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_hist_status_beneficiaria ON historico_status_beneficiaria(beneficiaria_id);
