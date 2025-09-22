DROP TABLE IF EXISTS formularios CASCADE;
CREATE TABLE formularios (
    id SERIAL PRIMARY KEY,
    tipo VARCHAR(50) NOT NULL,
    beneficiaria_id INTEGER REFERENCES beneficiarias(id) ON DELETE CASCADE,
    data_preenchimento TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    dados JSONB NOT NULL,
    status VARCHAR(50) DEFAULT 'rascunho',
    observacoes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL
);

DROP TABLE IF EXISTS historico_atendimentos CASCADE;
CREATE TABLE historico_atendimentos (
    id SERIAL PRIMARY KEY,
    beneficiaria_id INTEGER REFERENCES beneficiarias(id) ON DELETE CASCADE,
    tipo_atendimento VARCHAR(50) NOT NULL,
    data_atendimento TIMESTAMP NOT NULL,
    descricao TEXT NOT NULL,
    encaminhamentos TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL
);

-- Índices para melhorar performance
CREATE INDEX idx_formularios_tipo ON formularios(tipo);
CREATE INDEX idx_formularios_beneficiaria ON formularios(beneficiaria_id);
CREATE INDEX idx_historico_beneficiaria ON historico_atendimentos(beneficiaria_id);
CREATE INDEX idx_historico_data ON historico_atendimentos(data_atendimento);
