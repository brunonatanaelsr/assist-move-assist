-- Criar tabela de presenças em oficinas
CREATE TABLE presencas_oficinas (
    id SERIAL PRIMARY KEY,
    oficina_id INTEGER NOT NULL REFERENCES oficinas(id),
    beneficiaria_id INTEGER NOT NULL REFERENCES beneficiarias(id),
    data_aula TIMESTAMP WITH TIME ZONE NOT NULL,
    presente BOOLEAN NOT NULL DEFAULT FALSE,
    justificativa TEXT,
    observacoes TEXT,
    registrado_por INTEGER NOT NULL REFERENCES usuarios(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(oficina_id, beneficiaria_id, data_aula)
);

-- Criar índices para otimização
CREATE INDEX idx_presencas_oficinas_oficina ON presencas_oficinas(oficina_id);
CREATE INDEX idx_presencas_oficinas_beneficiaria ON presencas_oficinas(beneficiaria_id);
CREATE INDEX idx_presencas_oficinas_data ON presencas_oficinas(data_aula);

COMMENT ON TABLE presencas_oficinas IS 'Registra as presenças das beneficiárias nas oficinas';
COMMENT ON COLUMN presencas_oficinas.data_aula IS 'Data e hora da aula';
COMMENT ON COLUMN presencas_oficinas.presente IS 'Indica se a beneficiária esteve presente';
COMMENT ON COLUMN presencas_oficinas.justificativa IS 'Justificativa em caso de ausência';
