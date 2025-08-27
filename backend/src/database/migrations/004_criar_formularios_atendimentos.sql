CREATE TABLE formularios (
    id SERIAL PRIMARY KEY,
    tipo VARCHAR(50) NOT NULL,
    beneficiaria_id INTEGER REFERENCES beneficiarias(id) ON DELETE CASCADE,
    data_preenchimento TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    dados JSONB NOT NULL,
    status VARCHAR(50) DEFAULT 'rascunho',
    observacoes TEXT,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL
);

CREATE TABLE historico_atendimentos (
    id SERIAL PRIMARY KEY,
    beneficiaria_id INTEGER REFERENCES beneficiarias(id) ON DELETE CASCADE,
    tipo_atendimento VARCHAR(50) NOT NULL,
    data_atendimento TIMESTAMP NOT NULL,
    descricao TEXT NOT NULL,
    encaminhamentos TEXT,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL
);

CREATE TRIGGER update_formularios_updated_at
    BEFORE UPDATE ON formularios
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_historico_atendimentos_updated_at
    BEFORE UPDATE ON historico_atendimentos
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- Índices para melhorar performance
CREATE INDEX idx_formularios_tipo ON formularios(tipo);
CREATE INDEX idx_formularios_beneficiaria ON formularios(beneficiaria_id);
CREATE INDEX idx_historico_beneficiaria ON historico_atendimentos(beneficiaria_id);
CREATE INDEX idx_historico_data ON historico_atendimentos(data_atendimento);
